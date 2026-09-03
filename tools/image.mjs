// Node 側の画像入力ユーティリティ (render.mjs --compare / extract-palette.mjs 共用)。
// デコードは devDependency の sharp に任せ、必要になった時だけ動的 import する
// (render.mjs の既定経路や CI に sharp のネイティブ依存を持ち込まない)。
import fs from "node:fs";
import path from "node:path";

const EXTS = ["png", "jpg", "jpeg", "webp"];

/**
 * プリセットキーに対応するリファレンス画像のパスを探す。
 * refs/private/<key>.* (再配布不可、ローカル専用) を優先し、無ければ refs/<key>.*。
 * @param {string} key
 * @param {string} [root] リポジトリルート
 * @returns {string | null}
 */
export function findRef(key, root = path.resolve(import.meta.dirname, "..")) {
  for (const dir of ["refs/private", "refs"]) {
    for (const ext of EXTS) {
      const p = path.join(root, dir, `${key}.${ext}`);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

/**
 * 画像を RGBA (Uint8ClampedArray) で読む。
 * @param {string} file
 * @param {{ maxEdge?: number, width?: number, height?: number }} [opt]
 *   maxEdge: 長辺をこれ以下に縮小 (比率維持)。width/height: その寸法に cover でリサイズ
 * @returns {Promise<{ data: Uint8ClampedArray, w: number, h: number }>}
 */
export async function loadRgba(file, opt = {}) {
  const { default: sharp } = await import("sharp");
  let img = sharp(file).rotate(); // EXIF の向きを反映
  if (opt.width && opt.height) {
    img = img.resize(opt.width, opt.height, { fit: "cover" });
  } else if (opt.maxEdge) {
    img = img.resize(opt.maxEdge, opt.maxEdge, { fit: "inside", withoutEnlargement: true });
  }
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    w: info.width,
    h: info.height,
  };
}
