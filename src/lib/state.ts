// アプリ状態と URL クエリの相互変換。URL が状態の正本 (docs/02-spec.md §2.6)。
import { PRESETS, type PresetKey } from "@/core/camo.js";
import { PRESET_KEYS } from "@/data/presets-meta";

export type Unit = "px" | "mm" | "in";

export interface AppState {
  preset: PresetKey;
  seed: number;
  scale: number;
  /** null = プリセット既定色 */
  palette: string[] | null;
  /** 出力サイズ。unit が px なら px、それ以外は物理寸法 */
  w: number;
  h: number;
  unit: Unit;
  dpi: number;
  tileable: boolean;
}

export const LIMITS = {
  scale: { min: 0.4, max: 2.5 },
  px: { min: 512, max: 8192 },
  dpi: { min: 36, max: 1200 },
  seed: { min: 0, max: 2 ** 31 - 1 },
};

export const DEFAULT_STATE: AppState = {
  preset: "woodland",
  seed: 1234,
  scale: 1,
  palette: null,
  w: 1024,
  h: 1024,
  unit: "px",
  dpi: 300,
  tileable: true,
};

export function defaultPalette(preset: PresetKey): string[] {
  return PRESETS[preset].colors.map((c) => c.hex);
}

export function effectivePalette(s: AppState): string[] {
  const def = defaultPalette(s.preset);
  if (!s.palette || s.palette.length !== def.length) return def;
  return s.palette;
}

const HEX = /^[0-9a-f]{6}$/i;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function num(v: string | null, def: number, lo: number, hi: number, int = false): number {
  if (v == null) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return clamp(int ? Math.round(n) : n, lo, hi);
}

/** URL クエリ → 状態。不正値は既定値にフォールバック */
export function parseState(search: string): AppState {
  const q = new URLSearchParams(search);
  const p = q.get("p");
  const preset: PresetKey =
    p && (PRESET_KEYS as string[]).includes(p) ? (p as PresetKey) : DEFAULT_STATE.preset;
  const unitRaw = q.get("u");
  const unit: Unit = unitRaw === "mm" || unitRaw === "in" ? unitRaw : "px";
  const sizeLo = unit === "px" ? LIMITS.px.min : 1;
  const sizeHi = unit === "px" ? LIMITS.px.max : unit === "mm" ? 10000 : 400;
  const defW = unit === "px" ? DEFAULT_STATE.w : unit === "mm" ? 210 : 8.5;
  const defH = unit === "px" ? DEFAULT_STATE.h : unit === "mm" ? 297 : 11;
  let palette: string[] | null = null;
  const c = q.get("c");
  if (c) {
    const parts = c.split(",");
    if (parts.length === PRESETS[preset].colors.length && parts.every((x) => HEX.test(x))) {
      palette = parts.map((x) => `#${x.toLowerCase()}`);
    }
  }
  return {
    preset,
    seed: num(q.get("s"), DEFAULT_STATE.seed, LIMITS.seed.min, LIMITS.seed.max, true),
    scale: num(q.get("k"), DEFAULT_STATE.scale, LIMITS.scale.min, LIMITS.scale.max),
    palette,
    w: num(q.get("w"), defW, sizeLo, sizeHi, unit === "px"),
    h: num(q.get("h"), defH, sizeLo, sizeHi, unit === "px"),
    unit,
    dpi: num(q.get("d"), DEFAULT_STATE.dpi, LIMITS.dpi.min, LIMITS.dpi.max, true),
    tileable: q.get("t") !== "0",
  };
}

/** 状態 → URL クエリ。既定値は省略して短く保つ */
export function serializeState(s: AppState): string {
  const q = new URLSearchParams();
  if (s.preset !== DEFAULT_STATE.preset) q.set("p", s.preset);
  if (s.seed !== DEFAULT_STATE.seed) q.set("s", String(s.seed));
  if (s.scale !== DEFAULT_STATE.scale) q.set("k", String(+s.scale.toFixed(2)));
  if (s.palette) {
    const def = defaultPalette(s.preset);
    if (s.palette.some((c, i) => c.toLowerCase() !== def[i].toLowerCase())) {
      q.set("c", s.palette.map((c) => c.slice(1).toLowerCase()).join(","));
    }
  }
  if (s.unit !== "px") q.set("u", s.unit);
  const defW = s.unit === "px" ? DEFAULT_STATE.w : s.unit === "mm" ? 210 : 8.5;
  const defH = s.unit === "px" ? DEFAULT_STATE.h : s.unit === "mm" ? 297 : 11;
  if (s.w !== defW) q.set("w", String(s.w));
  if (s.h !== defH) q.set("h", String(s.h));
  if (s.unit !== "px" && s.dpi !== DEFAULT_STATE.dpi) q.set("d", String(s.dpi));
  if (!s.tileable) q.set("t", "0");
  const str = q.toString();
  return str ? `?${str}` : "";
}
