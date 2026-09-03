// 出力: index マップ → 画像 Blob / SVG 文字列 (docs/02-spec.md §2.3 / §3.2)
import { type GenResult, toRGBA } from "@/core/camo.js";
import { withDpi } from "./png";

export type Format = "png" | "jpg" | "webp" | "svg";

export function drawToCanvas(
  res: GenResult,
  palette: string[],
  canvas: HTMLCanvasElement | OffscreenCanvas,
) {
  canvas.width = res.w;
  canvas.height = res.h;
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) throw new Error("2D context unavailable");
  ctx.putImageData(new ImageData(toRGBA(res, palette), res.w, res.h), 0, 0);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}

export async function exportRaster(
  res: GenResult,
  palette: string[],
  format: Exclude<Format, "svg">,
  dpi?: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  drawToCanvas(res, palette, canvas);
  if (format === "png") {
    const blob = await canvasToBlob(canvas, "image/png");
    return dpi ? withDpi(blob, dpi) : blob;
  }
  if (format === "jpg") return canvasToBlob(canvas, "image/jpeg", 0.92);
  return canvasToBlob(canvas, "image/webp", 0.92);
}

/** セルグリッド系のみ: 水平ランを結合した rect で出力 (プロトタイプ由来) */
export function gridToSvg(res: GenResult, palette: string[]): string {
  const g = res.grid;
  if (!g) throw new Error("SVG はセルグリッド系プリセットのみ対応");
  const { gw, gh, cellColor } = g;
  const cw = res.w / gw;
  const ch = res.h / gh;
  let body = "";
  for (let y = 0; y < gh; y++) {
    let x = 0;
    while (x < gw) {
      const c = cellColor[y * gw + x];
      let x2 = x + 1;
      while (x2 < gw && cellColor[y * gw + x2] === c) x2++;
      body += `<rect x="${(x * cw).toFixed(2)}" y="${(y * ch).toFixed(2)}" width="${((x2 - x) * cw).toFixed(2)}" height="${(ch + 0.5).toFixed(2)}" fill="${palette[c]}"/>`;
      x = x2;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${res.w}" height="${res.h}" viewBox="0 0 ${res.w} ${res.h}" shape-rendering="crispEdges">${body}</svg>`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportFilename(preset: string, seed: number, w: number, h: number, ext: Format) {
  return `camo-${preset}-${seed}-${w}x${h}.${ext}`;
}
