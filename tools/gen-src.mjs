// 参照画像 → クイルト用インデックスマップ (RLE + base64) の生成ツール。
// genQuilt は「局所形状 = 実物図案そのもの」なので、図案の設計言語（ブロブの丸み・輪郭の
// 入り組み方）はソースマップ側で決まる。プリセットのパラメータでは変えられないため、
// 新しい系統の迷彩を追加するときは専用のソースマップをここから生成する。
//
// usage: node tools/gen-src.mjs <image> <out.js> <k> <PREFIX> [--resize=N] [--blur=SIGMA] [--flatten=SIGMA]
//   例: node tools/gen-src.mjs refs/private/dcu.png src/core/dcusrc.js 3 DCU
//   --resize=N: 読み込み時に長辺 N px へ縮小してから量子化する（既定: 原寸）。
//     参照が高解像度の写真だと RLE のラン数が増えてソースマップが肥大するため、
//     図案の形状が保たれる範囲で縮小してサイズを抑える。生成コマンドごと docs に残せば再現できる。
//   --blur=SIGMA: 量子化の前にガウシアンぼかしをかける（既定: なし）。
//     スウォッチではなく布地の写真を参照にすると、織り目（ツイルの斜め筋）が色の分散として
//     効いて k-means が「設計色」ではなく明度で切ってしまう（陸自 2 型では茶が緑に吸収された）。
//     織り目の周期より少し大きい sigma でぼかすと設計色に収束し、RLE のラン数も減る。
//   --thin=N: 量子化の後、N 回の形態学的収縮で消える連結成分（幅 2N px 未満の細帯）を
//     近傍の多数色へ吸収する（既定: なし）。布地写真の皺の稜線・影が図案の色として
//     残るのを消すためで、面積ではなく幅で判定するのでブロブは残る。
//   --flatten=SIGMA: 量子化の前にフラットフィールド補正をかける（既定: なし）。
//     写真の周辺減光・照明ムラは色そのものより大きな分散になり、そのまま量子化すると
//     画面の隅が丸ごと最も暗い値に落ちて面積比が狂う。sigma は図案の特徴長より十分大きく取る。
// 出力: <out.js> に `<PREFIX>_SRC_W` / `_SRC_H` / `_SRC_RLE` を書き出す。
//   標準エラーに各値の面積比（PRESETS.frac にそのまま使う）と量子化パレット（colors の
//   並びの確認用）を出す。パレット既定値そのものは tools/extract-palette.mjs で実測する。
//
// 量子化はパレット抽出と同じ固定シード k-means（src/core/kmeans.js）なので、同じ画像なら
// 常に同じソースマップになる。インデックス値は **明度降順**（0 = 最も明るい色）で、
// PRESETS.colors の並びと一致させる前提。

import { kmeans, lum, rgbToHex } from "../src/core/kmeans.js";
import { loadRgba } from "./image.mjs";

// RLE 1 バイトの内訳は値ビット数 bits で決まる (byte = (値 << (8 - bits)) | ラン長)。
// 4 値までは 2bit 値 + 6bit ラン (ラン長 63) で、これが既存ソース (m81 / dcu / jgsdf2 / digsrc) の形式。
// 5 値以上を要求する図案 (Auscam の 5 色) では 3bit 値 + 5bit ラン (ラン長 31) に切り替える。
// ラン長上限が下がるぶんバイト数は増えるが、値ビットを 1 つ増やすだけで済むので
// 既存ソースを再生成せずに済む (camo.js の decodeSrc は bits 既定 2 で後方互換)。
const VALUE_MAX = 7; // 値ビットは最大 3 bit
function bitsFor(nValues) {
  return nValues <= 4 ? 2 : 3;
}
const MIN_FRAG = 16; // 量子化ノイズとみなす連結成分の面積 (JPEG 由来のソースで効く)

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const [file, out, kArg, prefix] = argv.filter((a) => !a.startsWith("--"));
const k = Number(kArg || 4);
const resizeArg = flags.find((a) => a.startsWith("--resize="));
const maxEdge = resizeArg ? Number(resizeArg.slice(9)) : undefined;
if (resizeArg && !(maxEdge > 0)) {
  console.error("--resize=N の N は正の数");
  process.exit(1);
}
const thinArg = flags.find((a) => a.startsWith("--thin="));
const thin = thinArg ? Number(thinArg.slice(7)) : 0;
if (thinArg && !(Number.isInteger(thin) && thin > 0)) {
  console.error("--thin=N の N は正の整数");
  process.exit(1);
}
const flattenArg = flags.find((a) => a.startsWith("--flatten="));
const flattenSigma = flattenArg ? Number(flattenArg.slice(10)) : undefined;
if (flattenArg && !(flattenSigma > 0)) {
  console.error("--flatten=SIGMA の SIGMA は正の数");
  process.exit(1);
}
const blurArg = flags.find((a) => a.startsWith("--blur="));
const blur = blurArg ? Number(blurArg.slice(7)) : undefined;
if (blurArg && !(blur > 0)) {
  console.error("--blur=SIGMA の SIGMA は正の数");
  process.exit(1);
}
if (!file || !out || !prefix) {
  console.error("usage: node tools/gen-src.mjs <image> <out.js> <k> <PREFIX>");
  process.exit(1);
}
if (!(k >= 2 && k <= VALUE_MAX + 1)) {
  console.error(`k must be 2..${VALUE_MAX + 1} (値は最大 3 bit で保持する)`);
  process.exit(1);
}

const { data, w, h } = await loadRgba(file, {
  ...(maxEdge ? { maxEdge } : {}),
  ...(flattenSigma ? { flatten: flattenSigma } : {}),
  ...(blur ? { blur } : {}),
});
// kmeans は暗→明で返すので反転して明度降順にする（0 = 地の明るい色）
const palette = kmeans(data, k)
  .slice()
  .sort((a, b) => lum(b) - lum(a));

const map = new Uint8Array(w * h);
const counts = new Array(k).fill(0);
for (let i = 0; i < w * h; i++) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  let bi = 0;
  let bd = Number.POSITIVE_INFINITY;
  for (let c = 0; c < k; c++) {
    const p = palette[c];
    const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
    if (d < bd) {
      bd = d;
      bi = c;
    }
  }
  map[i] = bi;
}

// 微小欠片の吸収: 面積 < MIN_FRAG の連結成分を近傍の多数色へ寄せる。
// ソース側にノイズが残ると、パッチ探索の境界リング誤差が全候補で底上げされて
// 「継ぎ目の出ない中心」を選べなくなる（境界線の露出につながる）。
{
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const col = map[start];
    const stack = [start];
    seen[start] = 1;
    const cells = [];
    while (stack.length) {
      const i = stack.pop();
      cells.push(i);
      const x = i % w;
      const y = (i / w) | 0;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      for (const j of nb) {
        if (!seen[j] && map[j] === col) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    if (cells.length >= MIN_FRAG) continue;
    const cnt = new Array(k).fill(0);
    for (const i of cells) {
      const x = i % w;
      const y = (i / w) | 0;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      for (const j of nb) if (map[j] !== col) cnt[map[j]]++;
    }
    let best = 0;
    for (let c = 1; c < k; c++) if (cnt[c] > cnt[best]) best = c;
    if (cnt[best] === 0) continue;
    for (const i of cells) map[i] = best;
  }
}

// 細帯・縁取りの除去 (--thin=N): 各値に形態学的オープニング（N 回収縮 → N 回膨張）をかけ、
// 復元されなかった画素を最も近い残存画素の値で埋める。
// 布地写真のリファレンスでは、たたみ皺の稜線と影が「図案の色ではない細長い帯」や
// 「ブロブの縁取り」として量子化に残る。面積は MIN_FRAG より大きく、しかもブロブと地続きなので
// 連結成分単位の除去では落ちない。クイルトのパッチがその帯を拾うと出力に直線状の筋が並ぶ
// （Auscam の 5 値化で確認。docs/01-tech-verification.md v28）。
// オープニングは「幅 2N px 未満の部分だけ」を削るので、ブロブ本体の形と面積は保たれる。
if (thin) {
  const idx = (x, y) => y * w + x;
  const removed = new Uint8Array(w * h);
  const cur = new Uint8Array(w * h);
  const next = new Uint8Array(w * h);
  for (let c = 0; c < k; c++) {
    for (let i = 0; i < w * h; i++) cur[i] = map[i] === c ? 1 : 0;
    // 収縮 N 回（画像の外周は領域外として扱う = 端に張り付いた帯も削れる）
    for (let t = 0; t < thin; t++) {
      next.fill(0);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = idx(x, y);
          if (cur[i] && cur[i - 1] && cur[i + 1] && cur[i - w] && cur[i + w]) next[i] = 1;
        }
      }
      cur.set(next);
    }
    // 膨張 N 回（元の値の領域内に限る = 他色を侵食しない）
    for (let t = 0; t < thin; t++) {
      next.set(cur);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = idx(x, y);
          if (cur[i] || map[i] !== c) continue;
          if (
            (x > 0 && cur[i - 1]) ||
            (x < w - 1 && cur[i + 1]) ||
            (y > 0 && cur[i - w]) ||
            (y < h - 1 && cur[i + w])
          )
            next[i] = 1;
        }
      }
      cur.set(next);
    }
    for (let i = 0; i < w * h; i++) if (map[i] === c && !cur[i]) removed[i] = 1;
  }
  // 削った画素を「最も近い残存画素の値」で埋める（残存側からの多源 BFS）
  const queue = new Int32Array(w * h);
  let qh = 0;
  let qt = 0;
  for (let i = 0; i < w * h; i++) if (!removed[i]) queue[qt++] = i;
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w;
    const y = (i / w) | 0;
    const nb = [];
    if (x > 0) nb.push(i - 1);
    if (x < w - 1) nb.push(i + 1);
    if (y > 0) nb.push(i - w);
    if (y < h - 1) nb.push(i + w);
    for (const j of nb) {
      if (!removed[j]) continue;
      removed[j] = 0;
      map[j] = map[i];
      queue[qt++] = j;
    }
  }
}

for (let i = 0; i < w * h; i++) counts[map[i]]++;
const maxValue = map.reduce((m, v) => (v > m ? v : m), 0);
if (maxValue >= 1 << bitsFor(k))
  throw new Error(`index value ${maxValue} exceeds ${bitsFor(k)} bit`);
if (counts.some((c) => c === 0)) throw new Error(`未使用の値がある: ${counts.join(", ")}`);

// RLE: 1 バイト = (値 << (8 - bits)) | ラン長。ラン長 0 は出さない（decodeSrc が進まなくなる）
const bits = bitsFor(k);
const runMax = (1 << (8 - bits)) - 1;
const bytes = [];
for (let i = 0; i < map.length; ) {
  const v = map[i];
  let n = 1;
  while (i + n < map.length && map[i + n] === v && n < runMax) n++;
  bytes.push((v << (8 - bits)) | n);
  i += n;
}
const rle = Buffer.from(bytes).toString("base64");

const { writeFile } = await import("node:fs/promises");
await writeFile(
  out,
  `// ${prefix} 実物図案の ${k} 値インデックスマップ (RLE + base64)。\n` +
    `// 生成: node tools/gen-src.mjs ${file} ${out} ${k} ${prefix}${flags.length ? ` ${flags.join(" ")}` : ""}\n` +
    `// 値は明度降順 (0 = 最も明るい色) で PRESETS.${prefix.toLowerCase()}.colors の並びと一致する。\n` +
    `// RLE 1 バイト = (値 << ${8 - bits}) | ラン長 (値 ${bits} bit / ラン最大 ${runMax})。\n` +
    `export const ${prefix}_SRC_W = ${w};\n` +
    `export const ${prefix}_SRC_H = ${h};\n` +
    `export const ${prefix}_SRC_BITS = ${bits};\n` +
    `export const ${prefix}_SRC_RLE = '${rle}';\n`,
);

console.error(
  `${file} → ${out}  ${w}×${h}  bits=${bits}  runs=${bytes.length}  base64=${rle.length}B`,
);
console.error(`量子化パレット (明度降順): ${palette.map(rgbToHex).join(" ")}`);
console.error(`frac: [${counts.map((c) => (c / (w * h)).toFixed(3)).join(", ")}]`);
