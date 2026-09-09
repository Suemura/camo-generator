// 版 (色) どうしの隣接関係を参照画像と生成結果で突き合わせる。
// usage: node tools/analyze-adjacency.mjs ref <image> <k> [--minrun=N] [--crop=L,T,W,H] [--max-edge=N] [--blur=SIGMA] [--flatten=SIGMA]
//        node tools/analyze-adjacency.mjs gen <presetKey> [scale=1] [--seed=N] [--size=N]
//   例: node tools/analyze-adjacency.mjs ref refs/private/mm14.jpg 5 --crop=70,0,630,992 --max-edge=992 --blur=1 --minrun=8
//       node tools/analyze-adjacency.mjs gen mm14 1.0
//
// なぜ要るか: 面積比と色が合っていても、「どの版がどの版に接するか」が違うと別の図案に見える。
// MM-14 では最明色が 2 番目の明色にしか接せず、最暗色が地にしか接しない「明度順の鎖」になっていて、
// これは genGrowth の各層の eat を親の版だけにした入れ子で作る必要があった (docs/01-tech-verification.md「手法の選び方」)。
// 目視では「縁取りがある」程度にしか分からず、鎖か独立かは数えないと決まらない。
//
// 出力:
//   frac       — 版ごとの面積比 (%)。ref は k-means の明度降順 (0 = 最明)、gen は PRESETS.colors の index 順
//   adjacency  — 行 = 版、列 = その版の境界画素のうち、列の版に接している割合 (%)。
//                行ごとに 100 になる。ある版の行で 1 列だけが 90% 以上なら、その版はその相手の内側にだけ現れる (入れ子)。
//                すべての行で明度順の隣だけが大きければ「鎖」(等高線状の入れ子)。散っていれば独立した層
//   --minrun=N — 境界の両側で水平・垂直のラン長が N 以上の画素だけを数える (既定 1 = 全境界)。
//                JPEG の輪郭アンチエイリアスは中間色の細い縁になり、鎖を偽装する。
//                セル幅の半分程度 (MM-14 は 15px セルで 8) を渡して太い領域どうしの隣接だけを見ると、
//                縁のノイズが落ちる。ref の結果は minrun 1 と minrun セル幅/2 の両方で見て、両方で同じ構造なら本物

import { generate, PRESETS } from "../src/core/camo.js";
import { kmeans, lum } from "../src/core/kmeans.js";
import { loadRgba, parseCrop } from "./image.mjs";

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const pos = argv.filter((a) => !a.startsWith("--"));
const mode = pos[0];
const flag = (name, def) => {
  const f = flags.find((a) => a.startsWith(`--${name}=`));
  return f ? f.slice(name.length + 3) : def;
};

if (mode !== "ref" && mode !== "gen") {
  console.error(
    "usage: node tools/analyze-adjacency.mjs ref <image> <k> [--minrun=N] [--crop=L,T,W,H] [--max-edge=N] [--blur=SIGMA] [--flatten=SIGMA]\n" +
      "       node tools/analyze-adjacency.mjs gen <presetKey> [scale=1] [--seed=N] [--size=N]",
  );
  process.exit(1);
}

/** ラベルマップの面積比と隣接行列 (行ごとの %) を返す */
function adjacency(lab, w, h, k, minRun, wrap) {
  const runH = new Uint16Array(w * h);
  const runV = new Uint16Array(w * h);
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const v = lab[y * w + x];
      let x2 = x;
      while (x2 < w && lab[y * w + x2] === v) x2++;
      for (let t = x; t < x2; t++) runH[y * w + t] = x2 - x;
      x = x2;
    }
  }
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      const v = lab[y * w + x];
      let y2 = y;
      while (y2 < h && lab[y2 * w + x] === v) y2++;
      for (let t = y; t < y2; t++) runV[t * w + x] = y2 - y;
      y = y2;
    }
  }
  const adj = Array.from({ length: k }, () => new Array(k).fill(0));
  const thick = (i) => runH[i] >= minRun && runV[i] >= minRun;
  const count = (i, j) => {
    const a = lab[i];
    const b = lab[j];
    if (a !== b && thick(i) && thick(j)) {
      adj[a][b]++;
      adj[b][a]++;
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x + 1 < w) count(i, i + 1);
      else if (wrap) count(i, y * w);
      if (y + 1 < h) count(i, i + w);
      else if (wrap) count(i, x);
    }
  }
  const cnt = new Array(k).fill(0);
  for (const v of lab) cnt[v]++;
  return {
    frac: cnt.map((c) => (100 * c) / (w * h)),
    adj: adj.map((row) => {
      const tot = row.reduce((a, b) => a + b, 0);
      return row.map((v) => (tot ? (100 * v) / tot : 0));
    }),
  };
}

function print(names, { frac, adj }) {
  const k = names.length;
  const pad = Math.max(...names.map((n) => n.length), 4);
  console.log(`frac: ${names.map((n, i) => `${n} ${frac[i].toFixed(1)}%`).join(" / ")}`);
  console.log(`adjacency (行 = 版、列 = 境界画素のうち列の版に接する割合 %)`);
  console.log(`${"".padEnd(pad)}  ${names.map((_, j) => String(j).padStart(4)).join(" ")}`);
  for (let i = 0; i < k; i++) {
    console.log(
      `${names[i].padEnd(pad)}  ${adj[i].map((v, j) => (j === i ? "   -" : v.toFixed(0).padStart(4))).join(" ")}`,
    );
  }
  // 行ごとの最大値が 90% 以上なら「その版の内側にだけ現れる」
  const nested = [];
  for (let i = 0; i < k; i++) {
    const m = Math.max(...adj[i].filter((_, j) => j !== i));
    if (m >= 90) nested.push(`${names[i]} → ${names[adj[i].indexOf(m)]} (${m.toFixed(0)}%)`);
  }
  if (nested.length) console.log(`入れ子 (1 つの版にしか接しない): ${nested.join(", ")}`);
}

if (mode === "ref") {
  const [, file, kArg] = pos;
  const k = Number(kArg || 4);
  if (!file) {
    console.error("ref モードは <image> <k> が必要");
    process.exit(1);
  }
  const minRun = Number(flag("minrun", 1));
  const cropArg = flag("crop");
  const opt = { maxEdge: Number(flag("max-edge", 992)) };
  if (cropArg) opt.crop = parseCrop(cropArg);
  if (flag("blur")) opt.blur = Number(flag("blur"));
  if (flag("flatten")) opt.flatten = Number(flag("flatten"));
  const { data, w, h } = await loadRgba(file, opt);
  const centers = kmeans(data, k)
    .slice()
    .sort((a, b) => lum(b) - lum(a)); // 明 → 暗
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
  console.log(`${file} ${w}×${h} k=${k} minrun=${minRun} (版は明 → 暗の順)`);
  print(
    centers.map((_, i) => `#${i}`),
    adjacency(lab, w, h, k, minRun, false),
  );
} else {
  const [, key, scaleArg] = pos;
  const P = PRESETS[key];
  if (!P) {
    console.error(`未知のプリセット: ${key}`);
    process.exit(1);
  }
  const scale = Number(scaleArg || 1);
  const seed = Number(flag("seed", 1234));
  const size = Number(flag("size", 512));
  const res = generate(key, size, size, seed, scale);
  const k = P.colors.length;
  // 成長系はセル格子で数える (画素で数えるとセル内部の隣接が薄まるだけで結果は同じ比になるが遅い)
  const g = res.grid;
  const lab = g ? g.cellColor : res.index;
  const w = g ? g.gw : res.w;
  const h = g ? g.gh : res.h;
  console.log(
    `${key} seed=${seed} scale=${scale} ${g ? `grid ${w}×${h}` : `${w}×${h}px`} (版は PRESETS.colors の index 順)`,
  );
  print(
    P.colors.map((c, i) => `${i}:${c.name}`),
    adjacency(lab, w, h, k, 1, true),
  );
}
