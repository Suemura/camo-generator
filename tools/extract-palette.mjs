// リファレンス画像からパレット既定値を実測する (規約: 既定色は感覚で決めず参照画像から抽出)。
// UI の「画像から抽出」と同じ k-means (src/core/kmeans.js) を Node から呼ぶので結果が一致する。
// usage: node tools/extract-palette.mjs <image> [k=4]
//   例: node tools/extract-palette.mjs refs/woodland.png 4
// 出力: 暗→明の hex 一覧と、PRESETS.colors にそのまま貼れるスニペット

import { kmeans, rgbToHex } from "../src/core/kmeans.js";
import { loadRgba } from "./image.mjs";

const MAX_EDGE = 256; // src/lib/extract.ts と同じ縮小上限 (UI の抽出結果と揃える)

const file = process.argv[2];
const k = Number(process.argv[3] || 4);
if (!file) {
  console.error("usage: node tools/extract-palette.mjs <image> [k=4]");
  process.exit(1);
}
const { data, w, h } = await loadRgba(file, { maxEdge: MAX_EDGE });
const colors = kmeans(data, k).map(rgbToHex);
console.log(`${file} (${w}×${h} に縮小、k=${k})`);
for (const c of colors) console.log(`  ${c}`);
console.log("\n// PRESETS.colors 用スニペット (name は実物の呼称に置き換える)");
console.log("colors: [");
for (const c of colors) console.log(`  { name: '', hex: '${c}' },`);
console.log("],");
