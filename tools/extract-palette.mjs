// リファレンス画像からパレット既定値を実測する (規約: 既定色は感覚で決めず参照画像から抽出)。
// UI の「画像から抽出」と同じ k-means (src/core/kmeans.js) を Node から呼ぶので結果が一致する。
// usage: node tools/extract-palette.mjs <image> [k=4] [--core[=R]] [--max-edge=N] [--flatten=SIGMA] [--blur=SIGMA]
//   例: node tools/extract-palette.mjs refs/private/woodland.png 4
//       node tools/extract-palette.mjs refs/private/jgsdf2.jpg 4 --core
// 出力: 暗→明の hex 一覧と、PRESETS.colors にそのまま貼れるスニペット
//
// --core[=R] (既定 R=3): 各クラスタの「領域内部」だけで代表色 (中央値) を測り直す。
//   輪郭のアンチエイリアス画素はクラスタ重心を隣接色へ引っ張るため、小さい図形が多い迷彩
//   (斑点の多い陸自 2 型など) では黒が周囲の緑側へ寄って measured なのに実物と合わなくなる。
//   半径 R の近傍が全て同ラベルの画素だけを集計するとこの混色が落ちる。
// --flatten=SIGMA: フラットフィールド補正 (周辺減光・照明ムラの平坦化) を先にかける。
//   布地の写真をリファレンスにする場合、ソースマップ生成 (tools/gen-src.mjs) と同じ値を渡して
//   量子化とパレットの前提を揃える。
// --blur=SIGMA: 縮小後にガウシアンぼかしをかける (tools/gen-src.mjs と同じ)。織り目 (ツイルの筋) が
//   強い布地写真では、k-means が 1 つの版の色を「筋の明部 / 暗部」に割ってしまい設計色が出ない。
//   ぼかして織り目を落とすと版の色に収束する (フロッグスキンのブラウンはこれが無いと 3 分裂する)。

import { kmeans, rgbToHex } from "../src/core/kmeans.js";
import { loadRgba } from "./image.mjs";

const DEFAULT_MAX_EDGE = 256; // src/lib/extract.ts と同じ縮小上限 (UI の抽出結果と揃える)

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const [file, kArg] = argv.filter((a) => !a.startsWith("--"));
const k = Number(kArg || 4);
if (!file) {
  console.error(
    "usage: node tools/extract-palette.mjs <image> [k=4] [--core[=R]] [--max-edge=N] [--flatten=SIGMA] [--blur=SIGMA]",
  );
  process.exit(1);
}
const coreArg = flags.find((a) => a === "--core" || a.startsWith("--core="));
const coreR = coreArg ? Number(coreArg.split("=")[1] ?? 3) : 0;
const edgeArg = flags.find((a) => a.startsWith("--max-edge="));
const maxEdge = edgeArg ? Number(edgeArg.slice(11)) : DEFAULT_MAX_EDGE;
const flattenArg = flags.find((a) => a.startsWith("--flatten="));
const flattenSigma = flattenArg ? Number(flattenArg.slice(10)) : undefined;
const blurArg = flags.find((a) => a.startsWith("--blur="));
const blurSigma = blurArg ? Number(blurArg.slice(7)) : undefined;

const { data, w, h } = await loadRgba(file, {
  maxEdge,
  ...(flattenSigma ? { flatten: flattenSigma } : {}),
  ...(blurSigma ? { blur: blurSigma } : {}),
});
const centers = kmeans(data, k);

/** 各画素を最近傍クラスタへ割り当てる */
function labelPixels() {
  const lab = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    let bi = 0;
    let bd = Number.POSITIVE_INFINITY;
    for (let j = 0; j < k; j++) {
      const c = centers[j];
      const d =
        (data[i * 4] - c[0]) ** 2 + (data[i * 4 + 1] - c[1]) ** 2 + (data[i * 4 + 2] - c[2]) ** 2;
      if (d < bd) {
        bd = d;
        bi = j;
      }
    }
    lab[i] = bi;
  }
  return lab;
}

/**
 * 領域内部 (半径 R の近傍が全て同ラベル) の画素だけを集めてクラスタごとの中央値を返す。
 * 各画素で (2R+1)^2 の窓を総当たりするため計算量は O((w-2R)*(h-2R)*(2R+1)^2)。
 * --core の R や --max-edge (w, h) を大きくすると R^2 で急増するので、
 * 実測用途では既定値程度 (R は数px、max-edge は数百px) に留めること。
 */
function coreMedians(R) {
  const lab = labelPixels();
  const buckets = Array.from({ length: k }, () => []);
  for (let y = R; y < h - R; y++) {
    for (let x = R; x < w - R; x++) {
      const c = lab[y * w + x];
      let inner = true;
      for (let dy = -R; dy <= R && inner; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          if (lab[(y + dy) * w + x + dx] !== c) {
            inner = false;
            break;
          }
        }
      }
      if (inner) buckets[c].push((y * w + x) * 4);
    }
  }
  return centers.map((c, i) => {
    const b = buckets[i];
    if (b.length === 0) return { rgb: c, n: 0 };
    const med = [0, 1, 2].map((ch) => {
      const v = b.map((p) => data[p + ch]).sort((a, z) => a - z);
      return v[v.length >> 1];
    });
    return { rgb: med, n: b.length };
  });
}

const measured = coreR
  ? coreMedians(coreR).map((m) => ({ hex: rgbToHex(m.rgb), n: m.n }))
  : centers.map((c) => ({ hex: rgbToHex(c), n: null }));

console.log(
  `${file} (${w}×${h} に縮小、k=${k}${flattenSigma ? `、--flatten=${flattenSigma}` : ""}${blurSigma ? `、--blur=${blurSigma}` : ""}${coreR ? `、--core=${coreR}: 領域内部の中央値` : ""})`,
);
for (const m of measured) console.log(`  ${m.hex}${m.n === null ? "" : `  (内部画素 ${m.n})`}`);
console.log("\n// PRESETS.colors 用スニペット (name は実物の呼称に置き換える)");
console.log("colors: [");
for (const m of measured) console.log(`  { name: '', hex: '${m.hex}' },`);
console.log("],");
