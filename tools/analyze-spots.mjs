// 斑点配置 (kind: 'spots') の「色の空間分布」を参照画像と突き合わせる。
// usage: node tools/analyze-spots.mjs ref <image> <k> [--max-edge=N] [--blur=SIGMA]
//        node tools/analyze-spots.mjs gen <presetKey> [scale...]
//   例: node tools/analyze-spots.mjs ref refs/private/flecktarn.jpg 5
//       node tools/analyze-spots.mjs gen flecktarn 0.7 1.0 2.0
//
// なぜ要るか: render.mjs の目視だけでは「色の配置」の誤りを捕まえられない。Issue #35 では
// ヴュステンターンの緑が実物の 4 倍固まっていたのと、L.clump がスケールに追従していなかったのを
// どちらも目視で見落とした (docs/01-tech-verification.md v36)。数値で出せば両方すぐ分かる。
//
// 出力する指標:
//   frac   — 版ごとの可視面積比。PRESETS の frac (塗る面積) ではなく最終的に見える比率
//   r50    — 版ごとの 4 連結成分の等価半径 √(面積/π) の中央値 px。斑の実効サイズ。
//            **参照が JPEG だと輪郭のアンチエイリアスが微小成分を生んで中央値を押し下げる**ので、
//            絶対値ではなく版どうしの比で見ること (地色を 1 とした比が実物と合うか)
//   塊り比 — 窓サイズ W の局所密度の標準偏差 ÷ 一様分布での期待値 √(p(1-p)/W²)。
//            1 なら完全にランダム、大きいほどその版が低周波で偏在している。
//            L.clump の効き具合はこれで見る。W を横に並べると「どのスケールの塊か」が分かる
//
// 使い方の作法:
//   1. 参照と生成の r50 が近くなるスケールを選んでから比べる (スケールが違うと塊り比も動く)
//   2. clump のスケール追従は「clump 層の塊り比が、clump なし層と同じ割合で scale とともに動くか」で見る。
//      clump 層だけ塊り比が動かなければ密度場がキャンバス固定になっている

import { generate, PRESETS } from "../src/core/camo.js";
import { kmeans } from "../src/core/kmeans.js";
import { loadRgba } from "./image.mjs";

const WINDOWS = [8, 16, 32, 64, 128];

/** 最近傍で量子化し、明度降順 (0 = 最も明るい) の index マップにする */
function quantize(data, w, h, k) {
  const centroids = kmeans(data, k); // 明度順 (暗→明)
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    let best = 0;
    let bd = Number.POSITIVE_INFINITY;
    for (let c = 0; c < k; c++) {
      const dr = data[i * 4] - centroids[c][0];
      const dg = data[i * 4 + 1] - centroids[c][1];
      const db = data[i * 4 + 2] - centroids[c][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    out[i] = k - 1 - best;
  }
  return out;
}

/** 版 c の塊り比: 窓サイズごとの (観測 sd / 一様分布での期待 sd) */
function clumpSpectrum(idx, w, h, c) {
  const n = w * h;
  let tot = 0;
  for (let i = 0; i < n; i++) if (idx[i] === c) tot++;
  const p = tot / n;
  if (p === 0 || p === 1) return WINDOWS.map(() => Number.NaN);
  // 積分画像で任意窓の合計を O(1) にする
  const ii = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += idx[y * w + x] === c ? 1 : 0;
      ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + row;
    }
  }
  const sum = (x0, y0, W) =>
    ii[(y0 + W) * (w + 1) + x0 + W] -
    ii[y0 * (w + 1) + x0 + W] -
    ii[(y0 + W) * (w + 1) + x0] +
    ii[y0 * (w + 1) + x0];
  return WINDOWS.map((W) => {
    if (W > Math.min(w, h)) return Number.NaN;
    const step = Math.max(1, W >> 1);
    let s = 0;
    let s2 = 0;
    let m = 0;
    for (let y = 0; y + W <= h; y += step) {
      for (let x = 0; x + W <= w; x += step) {
        const v = sum(x, y, W) / (W * W);
        s += v;
        s2 += v * v;
        m++;
      }
    }
    const sd = Math.sqrt(Math.max(0, s2 / m - (s / m) ** 2));
    return sd / Math.sqrt((p * (1 - p)) / (W * W));
  });
}

/** 版 c の 4 連結成分の等価半径の中央値 (面積 8px 未満は量子化ノイズとして除く) */
function medianRadius(idx, w, h, c) {
  const seen = new Uint8Array(w * h);
  const rs = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || idx[start] !== c) continue;
    const st = [start];
    seen[start] = 1;
    let n = 0;
    while (st.length) {
      const i = st.pop();
      n++;
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && idx[j] === c) {
          seen[j] = 1;
          st.push(j);
        }
      }
    }
    if (n >= 8) rs.push(Math.sqrt(n / Math.PI));
  }
  rs.sort((a, b) => a - b);
  return rs.length ? rs[rs.length >> 1] : 0;
}

function report(label, idx, w, h, k) {
  console.log(`\n== ${label}  (${w}x${h})`);
  console.log(`   窓サイズ:            ${WINDOWS.map((W) => String(W).padStart(6)).join("")}`);
  const base = medianRadius(idx, w, h, 0) || 1;
  for (let c = 0; c < k; c++) {
    let n = 0;
    for (let i = 0; i < idx.length; i++) if (idx[i] === c) n++;
    const r = medianRadius(idx, w, h, c);
    const spec = clumpSpectrum(idx, w, h, c)
      .map((v) => (Number.isNaN(v) ? "     -" : v.toFixed(2).padStart(6)))
      .join("");
    console.log(
      `   色${c} frac=${(n / idx.length).toFixed(3)} r50=${r.toFixed(1).padStart(5)}` +
        ` (地色比 ${(r / base).toFixed(2)})  塊り比${spec}`,
    );
  }
}

const [mode, ...rest] = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = rest.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : dflt;
};
const positional = rest.filter((a) => !a.startsWith("--"));

if (mode === "ref") {
  const [file, kArg] = positional;
  if (!file || !kArg) {
    console.error(
      "usage: node tools/analyze-spots.mjs ref <image> <k> [--max-edge=N] [--blur=SIGMA]",
    );
    process.exit(1);
  }
  const k = Number(kArg);
  const { data, w, h } = await loadRgba(file, {
    maxEdge: flag("max-edge", 512),
    blur: flag("blur", 1.2),
  });
  report(`参照 ${file}`, quantize(data, w, h, k), w, h, k);
} else if (mode === "gen") {
  const [key, ...scales] = positional;
  if (!key || !PRESETS[key]) {
    console.error("usage: node tools/analyze-spots.mjs gen <presetKey> [scale...]");
    process.exit(1);
  }
  const k = PRESETS[key].colors.length;
  for (const sc of scales.length ? scales : ["1.0"]) {
    const r = generate(key, 512, 512, 1234, Number(sc));
    report(`生成 ${key} scale=${sc}`, r.index, 512, 512, k);
  }
} else {
  console.error("usage: node tools/analyze-spots.mjs <ref|gen> ...");
  process.exit(1);
}
