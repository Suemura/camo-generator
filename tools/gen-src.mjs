// 参照画像 → クイルト用インデックスマップ (RLE + base64) の生成ツール。
// genQuilt は「局所形状 = 実物図案そのもの」なので、図案の設計言語（ブロブの丸み・輪郭の
// 入り組み方）はソースマップ側で決まる。プリセットのパラメータでは変えられないため、
// 新しい系統の迷彩を追加するときは専用のソースマップをここから生成する。
//
// usage: node tools/gen-src.mjs <image> <out.js> <k> <PREFIX>
//   例: node tools/gen-src.mjs refs/dcu.png src/core/dcusrc.js 3 DCU
// 出力: <out.js> に `<PREFIX>_SRC_W` / `_SRC_H` / `_SRC_RLE` を書き出す。
//   標準エラーに各値の面積比（PRESETS.frac にそのまま使う）と量子化パレット（colors の
//   並びの確認用）を出す。パレット既定値そのものは tools/extract-palette.mjs で実測する。
//
// 量子化はパレット抽出と同じ固定シード k-means（src/core/kmeans.js）なので、同じ画像なら
// 常に同じソースマップになる。インデックス値は **明度降順**（0 = 最も明るい色）で、
// PRESETS.colors の並びと一致させる前提。

import { kmeans, lum, rgbToHex } from "../src/core/kmeans.js";
import { loadRgba } from "./image.mjs";

const RUN_MAX = 63; // RLE 1 バイトあたりの最大ラン長 (byte = (値 << 6) | ラン長)
const VALUE_MAX = 3; // 値は 2 bit なので 0..3 まで
const MIN_FRAG = 16; // 量子化ノイズとみなす連結成分の面積 (JPEG 由来のソースで効く)

const [file, out, kArg, prefix] = process.argv.slice(2);
const k = Number(kArg || 4);
if (!file || !out || !prefix) {
  console.error("usage: node tools/gen-src.mjs <image> <out.js> <k> <PREFIX>");
  process.exit(1);
}
if (!(k >= 2 && k <= VALUE_MAX + 1)) {
  console.error(`k must be 2..${VALUE_MAX + 1} (値は 2 bit で保持する)`);
  process.exit(1);
}

const { data, w, h } = await loadRgba(file);
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

for (let i = 0; i < w * h; i++) counts[map[i]]++;
const maxValue = map.reduce((m, v) => (v > m ? v : m), 0);
if (maxValue > VALUE_MAX) throw new Error(`index value ${maxValue} exceeds ${VALUE_MAX}`);
if (counts.some((c) => c === 0)) throw new Error(`未使用の値がある: ${counts.join(", ")}`);

// RLE: 1 バイト = (値 << 6) | ラン長。ラン長 0 は出さない（decodeSrc が進まなくなる）
const bytes = [];
for (let i = 0; i < map.length; ) {
  const v = map[i];
  let n = 1;
  while (i + n < map.length && map[i + n] === v && n < RUN_MAX) n++;
  bytes.push((v << 6) | n);
  i += n;
}
const rle = Buffer.from(bytes).toString("base64");

const { writeFile } = await import("node:fs/promises");
await writeFile(
  out,
  `// ${prefix} 実物図案の ${k} 値インデックスマップ (RLE + base64)。\n` +
    `// 生成: node tools/gen-src.mjs ${file} ${out} ${k} ${prefix}\n` +
    `// 値は明度降順 (0 = 最も明るい色) で PRESETS.${prefix.toLowerCase()}.colors の並びと一致する。\n` +
    `export const ${prefix}_SRC_W = ${w};\n` +
    `export const ${prefix}_SRC_H = ${h};\n` +
    `export const ${prefix}_SRC_RLE = '${rle}';\n`,
);

console.error(`${file} → ${out}  ${w}×${h}  runs=${bytes.length}  base64=${rle.length}B`);
console.error(`量子化パレット (明度降順): ${palette.map(rgbToHex).join(" ")}`);
console.error(`frac: [${counts.map((c) => (c / (w * h)).toFixed(3)).join(", ")}]`);
