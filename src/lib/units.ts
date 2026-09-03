// 実寸モード: 物理寸法 × DPI → px (docs/02-spec.md §3.2)
import { type AppState, LIMITS, type Unit } from "./state";

export function toPx(value: number, unit: Unit, dpi: number): number {
  if (unit === "px") return Math.round(value);
  if (unit === "mm") return Math.round((value / 25.4) * dpi);
  return Math.round(value * dpi);
}

export function outputPx(s: AppState): { w: number; h: number; over: boolean } {
  const w = toPx(s.w, s.unit, s.dpi);
  const h = toPx(s.h, s.unit, s.dpi);
  const over = Math.max(w, h) > LIMITS.px.max;
  return { w, h, over };
}

export function fromPx(px: number, unit: Unit, dpi: number): number {
  if (unit === "px") return px;
  if (unit === "mm") return +((px / dpi) * 25.4).toFixed(1);
  return +(px / dpi).toFixed(2);
}

/** 用紙・生地プリセット (mm) */
export const PAPER_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "A4 (210×297)", w: 210, h: 297 },
  { label: "A3 (297×420)", w: 297, h: 420 },
  { label: "Letter (215.9×279.4)", w: 215.9, h: 279.4 },
  { label: "生地 1100mm 幅 × 1m", w: 1100, h: 1000 },
  { label: "生地 1500mm 幅 × 1m", w: 1500, h: 1000 },
];

export const PX_PRESETS = [512, 1024, 2048, 4096];
