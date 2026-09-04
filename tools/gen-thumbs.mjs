// 迷彩選択 UI 用のサムネイル JPG を生成する (public/thumbs/<presetKey>.jpg)。
// 生成物はリポジトリにコミットして配信する静的アセット。実行時に生成し直さないのは、
// 18 プリセット分の生成コストを開いた瞬間に払うのを避けるため。
// 新しいプリセットを追加したとき (docs/04-add-preset.md のチェックリスト) と、
// 生成手法を変えて既存プリセットの見た目が変わったとき (--force) にだけ走らせる。
//
// usage: node tools/gen-thumbs.mjs [--force] [--preset=key] [--seed=N] [--scale=N]
//                                  [--render=N] [--size=N] [--quality=N] [--out=dir]
//   既定は「public/thumbs/<key>.jpg が無いものだけ生成」。JPEG エンコーダのバージョン差で
//   全ファイルが無意味なバイナリ差分になるのを避けるため、既存ファイルは触らない。

import fs from "node:fs";
import path from "node:path";
import { generate, PRESETS, registerSources, toRGBA } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";

registerSources(digsrc);

const arg = (name, def) =>
  (process.argv.find((a) => a.startsWith(`--${name}=`)) ?? `=${def}`).split("=")[1];
const force = process.argv.includes("--force");
const only = arg("preset", "");
const seed = Number(arg("seed", "1234")); // render.mjs の既定シードと揃える
const scale = Number(arg("scale", "1"));
const render = Number(arg("render", "512")); // 生成解像度。縮小してからエンコードすると縮小時のモアレが減る
const size = Number(arg("size", "256")); // 出力辺 (表示は約 120px なので Retina 相当)
const quality = Number(arg("quality", "80"));
const outDir = path.resolve(import.meta.dirname, "..", arg("out", "public/thumbs"));

const { default: sharp } = await import("sharp");
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
let made = 0;
for (const [key, P] of Object.entries(PRESETS)) {
  if (only && key !== only) continue;
  const file = path.join(outDir, `${key}.jpg`);
  if (fs.existsSync(file) && !force) {
    total += fs.statSync(file).size;
    console.log(`${key}: skip (既存。作り直すなら --force)`);
    continue;
  }
  const t0 = Date.now();
  // 図案が 256px で潰れるプリセットが出たら --preset=<key> --scale=N --force で個別に作り直す
  const res = generate(key, render, render, seed, scale);
  const rgba = toRGBA(
    res,
    P.colors.map((c) => c.hex),
  );
  await sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.length), {
    raw: { width: render, height: render, channels: 4 },
  })
    .resize(size, size)
    .jpeg({ quality, chromaSubsampling: "4:4:4" }) // 色数の少ない図案では色にじみが目立つので 4:4:4
    .toFile(file);
  const bytes = fs.statSync(file).size;
  total += bytes;
  made++;
  console.log(
    `${key}: ${size}x${size} q${quality} ${(bytes / 1024).toFixed(1)}KB ${Date.now() - t0}ms`,
  );
}
console.log(`\n生成 ${made} 件 / 合計 ${(total / 1024).toFixed(1)}KB (${outDir})`);
