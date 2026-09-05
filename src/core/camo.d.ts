// prototype 由来の生成コア (camo.js) の型定義。実装は JS のまま (browser/Node 共用・依存ゼロを維持)。
export type PresetKey =
  | "woodland"
  | "cce"
  | "marpat"
  | "marpat_desert"
  | "aor1"
  | "aor2"
  | "ucp"
  | "cadpat"
  | "pla07"
  | "emr"
  | "nwu1"
  | "dcu"
  | "dbdu"
  | "jgsdf2"
  | "frogskin"
  | "frogskin_beach"
  | "dpm"
  | "ddpm"
  | "auscam"
  | "tigerstripe"
  | "berezka";
export interface PresetColor { name: string; hex: string; }
export interface Preset {
  name: string;
  kind: "quilt" | "growth" | "spots";
  ref?: string;
  colors: PresetColor[];
  [k: string]: unknown;
}
export interface GenerateOptions {
  /** true (既定): 上下左右に並べても継ぎ目が出ないトーラス生成。false: フェーズ1 と同じ非タイル生成 */
  tileable?: boolean;
  /** 進捗 0..1 (単調増加、最後に 1) */
  progress?: (fraction: number) => void;
  /** 多段解像度の基準長辺 (既定 1024)。これを超える出力は縮小生成 → 拡大 → 実寸で後処理 */
  baseMax?: number;
}
export interface GenResult {
  w: number;
  h: number;
  /** 色インデックス (0..colors.length-1)。形状と色を分離するための正本 */
  index: Uint8Array;
  /** クラスタ成長系のみ: セルグリッド (SVG 出力用) */
  grid?: { gw: number; gh: number; cellPx: number; cellColor: Uint8Array };
}
export const PRESETS: Record<PresetKey, Preset>;
/** AOR1/AOR2 実物マップの登録 (digsrc.js を動的 import して渡す)。クイルト系 generate() の前に必要 */
export function registerSources(mod: {
  AOR1_SRC_W?: number; AOR1_SRC_H?: number; AOR1_SRC_RLE?: string;
  AOR2_SRC_W?: number; AOR2_SRC_H?: number; AOR2_SRC_RLE?: string;
}): void;
export function hasSources(key: PresetKey): boolean;
export function generate(key: PresetKey, w: number, h: number, seed: number, scale: number, opt?: GenerateOptions): GenResult;
export function toRGBA(res: GenResult, palette: string[]): Uint8ClampedArray<ArrayBuffer>;
export function hexToRgb(hex: string): [number, number, number];
export function hash2(ix: number, iy: number, seed: number): number;
export function mulberry32(seed: number): () => number;
