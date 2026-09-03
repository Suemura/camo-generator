// 生成の非同期窓口。現状はメインスレッドで同期実行するが、呼び出し側は Promise として扱うので
// Web Worker 化 (Issue #3) の際に差し替えるだけで済む。
import {
  type GenResult,
  generate,
  hasSources,
  type PresetKey,
  registerSources,
} from "@/core/camo.js";

export interface GenerateRequest {
  preset: PresetKey;
  w: number;
  h: number;
  seed: number;
  scale: number;
  tileable: boolean;
}

let sourcesLoading: Promise<void> | null = null;
/** AOR 実物マップ (約 280KB) は必要になった時だけ読む */
export function ensureSources(preset: PresetKey): Promise<void> {
  if (hasSources(preset)) return Promise.resolve();
  sourcesLoading ??= import("@/core/digsrc.js").then((m) => registerSources(m));
  return sourcesLoading;
}

export async function generateAsync(req: GenerateRequest): Promise<GenResult> {
  await ensureSources(req.preset);
  return new Promise((resolve) => {
    // 描画フレームを 1 つ譲ってから実行 (進捗表示を描かせる)
    setTimeout(() => {
      resolve(generate(req.preset, req.w, req.h, req.seed, req.scale, { tileable: req.tileable }));
    }, 0);
  });
}

/** プレビュー用: 出力比率を保ちつつ長辺を上限に収める */
export function previewSize(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.max(64, Math.round(w * k)), h: Math.max(64, Math.round(h * k)) };
}
