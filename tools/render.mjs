// Node 用レンダリングハーネス: 各プリセットを PNG 出力して目視確認する。
// usage: node tools/render.mjs <outdir> <seed> [scale] [--tile | --crop=N | --compare] [--size=WxH] [--preset=key]
//   --compare: 左=生成、右=実物リファレンス (refs/private/<key>.* → refs/<key>.* の順に探索) を並べた
//              <key>-compare.png を出す。精度改善の基本ループはこれ。参照が無いプリセットは警告して単一出力

import fs from "node:fs";
import zlib from "node:zlib";
import { generate, PRESETS, registerSources, toRGBA } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";
import { findRef, loadRgba } from "./image.mjs";

registerSources(digsrc);

function crc32(buf) {
  let c,
    table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function writePng(path, rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // 8bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path, png);
}

const outDir = process.argv[2] || "./out";
fs.mkdirSync(outDir, { recursive: true });
const seed = parseInt(process.argv[3] || "1234", 10);
// scale を省略してフラグを直接置いた場合 (render.mjs out 1234 --compare) は 1.0 扱い
const scale = process.argv[4]?.startsWith("--") ? 1.0 : parseFloat(process.argv[4] || "1.0");
const tile = process.argv.includes("--tile"); // 2x2 に並べて継ぎ目を目視確認
const compare = process.argv.includes("--compare"); // 実物リファレンスと左右比較
const arg = (name, def) =>
  (process.argv.find((a) => a.startsWith(`--${name}=`)) ?? `=${def}`).split("=")[1];
const [W0, H0] = arg("size", "512x512").split("x").map(Number); // --size=640x400
const only = arg("preset", ""); // --preset=ucp
const crop = Number(arg("crop", "0")); // --crop=512: 中央を等倍で切り出す (高解像度の階段・ギザ確認用)
for (const [key, P] of Object.entries(PRESETS)) {
  if (only && key !== only) continue;
  const t0 = Date.now();
  const res = generate(key, W0, H0, seed, scale);
  const pal = P.colors.map((c) => c.hex);
  const refPath = compare ? findRef(key) : null;
  if (tile) {
    // 2x2 タイル: 継ぎ目が中央の十字に来る
    const W = W0 * 2;
    const H = H0 * 2;
    const idx = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) idx[y * W + x] = res.index[(y % H0) * W0 + (x % W0)];
    writePng(`${outDir}/${key}-tile.png`, toRGBA({ w: W, h: H, index: idx }, pal), W, H);
  } else if (crop > 0) {
    const c = Math.min(crop, W0, H0);
    const idx = new Uint8Array(c * c);
    const ox = ((W0 - c) / 2) | 0;
    const oy = ((H0 - c) / 2) | 0;
    for (let y = 0; y < c; y++)
      for (let x = 0; x < c; x++) idx[y * c + x] = res.index[(oy + y) * W0 + ox + x];
    writePng(`${outDir}/${key}-crop${c}.png`, toRGBA({ w: c, h: c, index: idx }, pal), c, c);
  } else if (refPath) {
    // 左右比較: 参照画像を出力寸法に cover でリサイズし、生成結果の右に並べる
    const ref = await loadRgba(refPath, { width: W0, height: H0 });
    const gen = toRGBA(res, pal);
    const W = W0 * 2;
    const rgba = new Uint8ClampedArray(W * H0 * 4);
    for (let y = 0; y < H0; y++) {
      rgba.set(gen.subarray(y * W0 * 4, (y + 1) * W0 * 4), y * W * 4);
      rgba.set(ref.data.subarray(y * W0 * 4, (y + 1) * W0 * 4), (y * W + W0) * 4);
    }
    writePng(`${outDir}/${key}-compare.png`, rgba, W, H0);
    console.log(`${key}: ${Date.now() - t0}ms (ref: ${refPath})`);
    continue;
  } else {
    if (compare)
      console.warn(`${key}: リファレンス画像が refs/private/ に無いため単一出力 (refs/README.md)`);
    writePng(`${outDir}/${key}.png`, toRGBA(res, pal), W0, H0);
  }
  console.log(`${key}: ${Date.now() - t0}ms`);
}
