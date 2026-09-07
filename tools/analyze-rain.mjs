// 雨線図案 (kind: 'rain') のダッシュ幾何を、参照画像と生成結果で同じ指標で測る。
// usage: node tools/analyze-rain.mjs ref <image> [--max-edge=N] [--blur=SIGMA] [--flatten=SIGMA] [--dump=out.png]
//        node tools/analyze-rain.mjs gen <presetKey> [scale...] [--seed=N] [--size=N]
//   例: node tools/analyze-rain.mjs ref refs/private/strichtarn_crop2.jpg --max-edge=1024 --flatten=150 --blur=1.5
//       node tools/analyze-rain.mjs gen strichtarn 0.7 1.0 2.0
//
// なぜ要るか: 2 色の短線図案は目視で「らしく」見えやすく、幅・長さ・傾き・列間隔のどれが実物と
// ずれているかを単独レンダでは判別できない (docs/01-tech-verification.md v39)。参照写真を 2 値化して
// 暗色の連結成分をダッシュとみなし、生成結果にも同じ計測を当てて分布 (q10 / q25 / 中央 / q75 / q90) を比べる。
//
// 指標 (px。参照は読み込み時の縮小後、生成は指定 size の画素):
//   dash area frac — ダッシュと判定した成分 (縦長 bh ≥ 2·bw かつ面積 ≥ 20) の面積比。参照の「dark frac」は
//                    皺・影を含むので面積比のターゲットにはこちらを使う
//   pca len / wid  — 成分の主成分軸に沿った長さ・幅 (一様な矩形とみなした 2√3σ)。bbox より傾きに強い
//   tilt           — 主軸の縦からのずれ (度)。+ は上端が右
//   列間隔          — y 範囲が重なる最近傍ダッシュとの中心 x 距離。平均間隔ではなく最近傍なので小さめに出る
//   縦の隙間        — x 範囲が重なる直下のダッシュまでの距離。同一列の非重複はここで見る
//
// 参照が布地写真のときの作法: 皺で切れた短い成分が q10〜q25 を押し下げるので、寸法は q50 以上で読む。
// 照明ムラは --flatten (図案の長さより十分大きい sigma)、織り目は --blur で落とす (docs/04-add-preset.md §4)。
// 縮尺は render.mjs --compare と同じ「参照を出力サイズに cover」で換算する (4:3 の写真を 512×512 に
// 並べると 0.667 倍。0.5 倍ではない)。

import { generate, PRESETS } from "../src/core/camo.js";
import { kmeans, lum } from "../src/core/kmeans.js";
import { loadRgba } from "./image.mjs";

const argv = process.argv.slice(2);
const flags = argv.filter((a) => a.startsWith("--"));
const args = argv.filter((a) => !a.startsWith("--"));
const [mode] = args;
const num = (k, d) => {
  const a = flags.find((f) => f.startsWith(`--${k}=`));
  return a ? Number(a.split("=")[1]) : d;
};

if (mode !== "ref" && mode !== "gen") {
  console.error(
    "usage: node tools/analyze-rain.mjs ref <image> [--max-edge=N] [--blur=S] [--flatten=S] [--dump=out.png]\n" +
      "       node tools/analyze-rain.mjs gen <presetKey> [scale...] [--seed=N] [--size=N]",
  );
  process.exit(1);
}

function quant(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}
function desc(name, arr) {
  if (!arr.length) return console.log(`${name}: n=0`);
  const f = (p) => quant(arr, p).toFixed(1);
  console.log(
    `  ${name}: n=${arr.length} q10=${f(0.1)} q25=${f(0.25)} med=${f(0.5)} q75=${f(0.75)} q90=${f(0.9)}`,
  );
}

/** dark: 0/1 の Uint8Array。ダッシュ統計を標準出力へ */
function analyze(dark, w, h) {
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!dark[s] || lab[s] >= 0) continue;
    const id = comps.length;
    const pts = [];
    stack.push(s);
    lab[s] = id;
    while (stack.length) {
      const i = stack.pop();
      pts.push(i);
      const x = i % w;
      const y = (i - x) / w;
      const nb = [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ];
      for (const j of nb) {
        if (j >= 0 && dark[j] && lab[j] < 0) {
          lab[j] = id;
          stack.push(j);
        }
      }
    }
    comps.push(pts);
  }
  const stats = [];
  for (const pts of comps) {
    const n = pts.length;
    if (n < 8) continue;
    let sx = 0;
    let sy = 0;
    for (const i of pts) {
      sx += i % w;
      sy += (i - (i % w)) / w;
    }
    const mx = sx / n;
    const my = sy / n;
    let cxx = 0;
    let cyy = 0;
    let cxy = 0;
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    for (const i of pts) {
      const x = i % w;
      const y = (i - x) / w;
      cxx += (x - mx) ** 2;
      cyy += (y - my) ** 2;
      cxy += (x - mx) * (y - my);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    cxx /= n;
    cyy /= n;
    cxy /= n;
    const tr = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc;
    const l2 = tr / 2 - disc;
    const ang = Math.atan2(2 * cxy, cxx - cyy) / 2; // 主軸の x 軸からの角度
    const tilt = (90 - Math.abs((ang * 180) / Math.PI)) * Math.sign(ang || 1);
    stats.push({
      n,
      mx,
      x0,
      x1,
      y0,
      y1,
      tilt,
      len: Math.sqrt(12 * l1),
      wid: Math.sqrt(12 * l2),
      bw: x1 - x0 + 1,
      bh: y1 - y0 + 1,
    });
  }
  const dashes = stats.filter((s) => s.bh >= 2 * s.bw && s.n >= 20);
  const dashArea = dashes.reduce((a, s) => a + s.n, 0) / (w * h);
  console.log(
    `  components(n>=8) ${stats.length}, dashes ${dashes.length}, dash area frac ${dashArea.toFixed(3)}`,
  );
  desc(
    "pca len",
    dashes.map((s) => s.len),
  );
  desc(
    "pca wid",
    dashes.map((s) => s.wid),
  );
  desc(
    "tilt deg (+=上端が右)",
    dashes.map((s) => s.tilt),
  );
  const dxs = [];
  const dys = [];
  for (const a of dashes) {
    let best = Number.POSITIVE_INFINITY;
    let bestY = Number.POSITIVE_INFINITY;
    for (const b of dashes) {
      if (a === b) continue;
      if (Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0) {
        const d = Math.abs(a.mx - b.mx);
        if (d > 1 && d < best) best = d;
      }
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0 && b.y0 > a.y1) {
        const d = b.y0 - a.y1;
        if (d < bestY) bestY = d;
      }
    }
    if (best < Number.POSITIVE_INFINITY) dxs.push(best);
    if (bestY < Number.POSITIVE_INFINITY) dys.push(bestY);
  }
  desc("最近傍の列中心間隔", dxs);
  desc("直下のダッシュまでの縦の隙間", dys);
  console.log(`  dash density per 100x100: ${((dashes.length / (w * h)) * 1e4).toFixed(2)}`);
  return dark;
}

if (mode === "ref") {
  const file = args[1];
  if (!file) {
    console.error("ref: 画像パスが必要");
    process.exit(1);
  }
  const { data, w, h } = await loadRgba(file, {
    maxEdge: num("max-edge", 1024),
    blur: num("blur", undefined),
    flatten: num("flatten", undefined),
  });
  const cents = kmeans(data, 2);
  const darkIdx = lum(cents[0]) < lum(cents[1]) ? 0 : 1;
  const dark = new Uint8Array(w * h);
  let nd = 0;
  for (let i = 0; i < w * h; i++) {
    let best = 0;
    let bd = Number.POSITIVE_INFINITY;
    for (let c = 0; c < 2; c++) {
      const d =
        (data[i * 4] - cents[c][0]) ** 2 +
        (data[i * 4 + 1] - cents[c][1]) ** 2 +
        (data[i * 4 + 2] - cents[c][2]) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best === darkIdx) {
      dark[i] = 1;
      nd++;
    }
  }
  const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  console.log(
    `ref ${file}: ${w}x${h}, dark frac ${(nd / (w * h)).toFixed(3)}, centroids ${cents.map(hex).join(" ")}`,
  );
  analyze(dark, w, h);
  const dump = flags.find((f) => f.startsWith("--dump="))?.slice(7);
  if (dump) {
    const { writePng } = await import("./render.mjs");
    const out = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const v = dark[i] ? 40 : 220;
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
      out[i * 4 + 3] = 255;
    }
    writePng(dump, out, w, h);
  }
} else {
  const key = args[1];
  if (!PRESETS[key] || PRESETS[key].kind !== "rain") {
    console.error(`gen: kind 'rain' のプリセットキーが必要 (${key})`);
    process.exit(1);
  }
  const scales = args.slice(2).map(Number);
  if (!scales.length) scales.push(1.0);
  const seed = num("seed", 1234);
  const size = num("size", 512);
  for (const scale of scales) {
    const t0 = performance.now();
    const r = generate(key, size, size, seed, scale);
    const ms = performance.now() - t0;
    const dark = new Uint8Array(size * size);
    let nd = 0;
    for (let i = 0; i < dark.length; i++) if (r.index[i] === 1) (dark[i] = 1), nd++;
    console.log(
      `gen ${key} seed ${seed} scale ${scale} ${size}px: dark frac ${(nd / dark.length).toFixed(3)}, ${ms.toFixed(0)}ms`,
    );
    analyze(dark, size, size);
  }
}
