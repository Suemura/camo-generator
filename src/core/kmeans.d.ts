// kmeans.js の型定義。実装は JS のまま (browser / Node 共用・依存ゼロ)。
export type RGB = [number, number, number];
/** 固定シードの k-means。RGBA 配列から k 色を明度順 (暗→明) で返す。同じ入力 → 同じ結果 */
export function kmeans(pixels: Uint8ClampedArray | Uint8Array, k: number, iters?: number): RGB[];
export function lum(rgb: RGB): number;
export function rgbToHex(rgb: RGB): string;
