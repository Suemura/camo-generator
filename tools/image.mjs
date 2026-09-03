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
 * @param {{ maxEdge?: number, width?: number, height?: number, blur?: number, flatten?: number }} [opt]
 *   maxEdge: 長辺をこれ以下に縮小 (比率維持)。width/height: その寸法に cover でリサイズ。
 *   blur: リサイズ後にガウシアンぼかし (布地の織り目を落として量子化を設計色へ収束させる)。
 *   flatten: 照明ムラ・周辺減光の平坦化 (フラットフィールド補正)。値は照明成分とみなす sigma
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
  if (opt.flatten) img = sharp(await flatten(await img.png().toBuffer(), opt.flatten));
  if (opt.blur) img = img.blur(opt.blur);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length),
    w: info.width,
    h: info.height,
  };
}

/**
 * フラットフィールド補正: 画像を「強くぼかした自分自身」で割って全体平均へ正規化する。
 * スウォッチではなく布地の写真をリファレンスにすると、周辺減光と照明ムラが色そのものより
 * 大きな分散になり、k-means が図案の設計色ではなく「画面の隅が暗い」を拾ってしまう
 * (陸自 2 型では四隅の減光が丸ごと 4 色目=黒に量子化され、黒の面積比が 15% → 22% に膨らんだ)。
 * sigma は図案の特徴長より十分大きく取る (照明成分だけを推定するため)。
 * @param {Buffer} png
 * @param {number} sigma
 * @returns {Promise<Buffer>} 補正後の PNG
 */
async function flatten(png, sigma) {
  const { default: sharp } = await import("sharp");
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = await sharp(png).removeAlpha().blur(sigma).raw().toBuffer();
  const ch = info.channels;
  const mean = new Array(ch).fill(0);
  for (let i = 0; i < bg.length; i += ch) for (let c = 0; c < ch; c++) mean[c] += bg[i + c];
  for (let c = 0; c < ch; c++) mean[c] /= bg.length / ch;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += ch) {
    for (let c = 0; c < ch; c++) {
      // bg[i+c] は blur 後の背景推定値。写真の最暗部が 8bit で 0 に張り付くと
      // ゼロ除算になるため 1 にフォールバックする（該当画素は data[i+c] も 0 付近で
      // 出力への影響は小さいが、mean[c] 側との比率がわずかに不連続になる点は許容）。
      const b = bg[i + c] || 1;
      out[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] * mean[c]) / b)));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toBuffer();
}
