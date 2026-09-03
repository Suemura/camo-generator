// 画像 → パレット抽出の窓口 (Worker 起動・画像縮小)。docs/02-spec.md §3.4
import type { ExtractRequest, ExtractResponse } from "@/workers/palette-extract.worker";

const MAX_EDGE = 256;

export async function extractPalette(file: File, k: number): Promise<string[]> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * s));
  const h = Math.max(1, Math.round(bmp.height * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const pixels = ctx.getImageData(0, 0, w, h).data;
  const worker = new Worker(new URL("../workers/palette-extract.worker.ts", import.meta.url), {
    type: "module",
  });
  try {
    return await new Promise<string[]>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<ExtractResponse>) => resolve(e.data.colors);
      worker.onerror = (e) => reject(e.error ?? new Error("extract worker failed"));
      const req: ExtractRequest = { pixels, k };
      worker.postMessage(req, [pixels.buffer]);
    });
  } finally {
    worker.terminate();
  }
}
