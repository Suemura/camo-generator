// 3D プレビューの純粋ロジック (three.js 非依存。Vitest で検証する)。
// シーンは mm 単位で組む。生成タイルの「物理サイズ」とモデル寸法からテクスチャのリピート数を決め、
// 実寸モードでは「この生地を Ø300mm の球に巻いたらこう見える」を再現する。
import type { AppState, Unit } from "./state";

export type Model3D = "sphere" | "cloth" | "pouch";

/** モデル寸法 (mm)。球は直径、布は一辺、ポーチは幅×高さ×奥行き */
export const MODEL_SIZE_MM = {
  sphere: { d: 300 },
  cloth: { w: 600, h: 600 },
  pouch: { w: 200, h: 150, d: 80 },
} as const;

/**
 * 各モデルの UV 1 単位が対応する物理長さ (mm)。geometry 側はこの規約に合わせて UV を張る。
 * - 球: SphereGeometry 既定 UV。u = 円周、v = 極→極の半円周
 * - 布: PlaneGeometry 既定 UV = 一辺
 * - ポーチ: BoxGeometry の 6 面 UV を scaleBoxUv で「1 = POUCH_UV_REF_MM」に再スケール
 */
export const POUCH_UV_REF_MM = 200;
export const MODEL_UV_EXTENT_MM: Record<Model3D, { u: number; v: number }> = {
  sphere: { u: Math.PI * MODEL_SIZE_MM.sphere.d, v: (Math.PI * MODEL_SIZE_MM.sphere.d) / 2 },
  cloth: { u: MODEL_SIZE_MM.cloth.w, v: MODEL_SIZE_MM.cloth.h },
  pouch: { u: POUCH_UV_REF_MM, v: POUCH_UV_REF_MM },
};

/** px モードには物理サイズが無いので、出力長辺を 300mm と仮定する (布の柄 1 リピート相当) */
export const PX_NOMINAL_LONG_MM = 300;
/** 布地 normal / roughness マップ 1 タイルの物理サイズ (織り目の粗さを実物相当にする) */
export const FABRIC_TILE_MM = 60;

const REPEAT_MIN = 0.05;
const REPEAT_MAX = 200;

export function toMm(value: number, unit: Unit, dpi: number): number {
  if (unit === "mm") return value;
  if (unit === "in") return value * 25.4;
  return (value / dpi) * 25.4;
}

/** 生成タイル 1 枚の物理サイズ (mm)。px モードは長辺 PX_NOMINAL_LONG_MM で比率維持 */
export function tileSizeMm(s: Pick<AppState, "w" | "h" | "unit" | "dpi">): {
  w: number;
  h: number;
} {
  if (s.unit === "px") {
    const k = PX_NOMINAL_LONG_MM / Math.max(s.w, s.h);
    return { w: s.w * k, h: s.h * k };
  }
  return { w: toMm(s.w, s.unit, s.dpi), h: toMm(s.h, s.unit, s.dpi) };
}

function safeRepeat(extentMm: number, tileMm: number): number {
  const r = extentMm / tileMm;
  if (!Number.isFinite(r) || r <= 0) return 1;
  return Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, r));
}

/** 迷彩テクスチャのリピート数 = モデル UV の物理長 ÷ タイル物理サイズ */
export function textureRepeat(
  model: Model3D,
  tile: { w: number; h: number },
): { x: number; y: number } {
  const e = MODEL_UV_EXTENT_MM[model];
  return { x: safeRepeat(e.u, tile.w), y: safeRepeat(e.v, tile.h) };
}

/** 布地マップのリピート数 (迷彩テクスチャとは独立) */
export function fabricRepeat(model: Model3D): { x: number; y: number } {
  const e = MODEL_UV_EXTENT_MM[model];
  return { x: safeRepeat(e.u, FABRIC_TILE_MM), y: safeRepeat(e.v, FABRIC_TILE_MM) };
}

/**
 * 布のたわみ (mm)。吊るした生地の大きなうねりと細かい皺の 2 重正弦。
 * 座標だけで決まる決定的関数 (乱数不使用)。振幅の合計は 20mm 以下。
 */
export function clothWave(x: number, y: number): number {
  return (
    12 * Math.sin(x / 70 + 0.6) * Math.cos(y / 95 - 0.3) +
    5 * Math.sin((x + y) / 38) +
    3 * Math.cos((x - 2 * y) / 55)
  );
}

/**
 * BoxGeometry (各面 4 頂点、面順 +x,-x,+y,-y,+z,-z) の UV を面の実寸で再スケールし、
 * 「UV 1 = refMm」に揃える。面をまたいでも模様の物理密度が一致する (実物ポーチの生地は連続している)。
 * faceSizes は面順どおりの [幅, 高さ] (mm)。
 */
export function scaleBoxUv(
  uv: Float32Array,
  faceSizes: readonly (readonly [number, number])[],
  refMm: number,
): void {
  for (let f = 0; f < faceSizes.length; f++) {
    const [fw, fh] = faceSizes[f];
    for (let v = 0; v < 4; v++) {
      const i = (f * 4 + v) * 2;
      uv[i] *= fw / refMm;
      uv[i + 1] *= fh / refMm;
    }
  }
}

/** BoxGeometry(w, h, d) の面順 +x,-x,+y,-y,+z,-z に対応する面サイズ */
export function boxFaceSizes(w: number, h: number, d: number): [number, number][] {
  return [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
}
