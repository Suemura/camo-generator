// prototype 由来の生成コア (camo.js) の型定義。実装は JS のまま (browser/Node 共用・依存ゼロを維持)。
export type PresetKey = "woodland" | "marpat" | "marpat_desert" | "aor1" | "aor2" | "ucp";
export interface PresetColor { name: string; hex: string; }
export interface Preset {
  name: string;
  kind: "quilt" | "growth";
  ref?: string;
  colors: PresetColor[];
  [k: string]: unknown;
}
export interface GenResult {
  w: number;
  h: number;
  /** 色インデックス (0..colors.length-1)。形状と色を分離するための正本 */
  index: Uint8Array;
  /** クラスタ成長系のみ: セルグリッド (SVG 出力用) */
  grid?: { cw: number; ch: number; cell: number; data: Uint8Array };
}
export const PRESETS: Record<PresetKey, Preset>;
export function generate(key: PresetKey, w: number, h: number, seed: number, scale: number): GenResult;
export function toRGBA(res: GenResult, palette: string[]): Uint8ClampedArray<ArrayBuffer>;
export function hexToRgb(hex: string): [number, number, number];
export function hash2(ix: number, iy: number, seed: number): number;
export function mulberry32(seed: number): () => number;
