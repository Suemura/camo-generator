// 生成ワーカー: メインスレッドをブロックせずに index マップを作る (Issue #3)。
// 結果の ArrayBuffer は transfer で渡す (コピーなし)。
import {
  type GenResult,
  generate,
  hasSources,
  type PresetKey,
  registerSources,
} from "@/core/camo.js";
import type { GenerateRequest } from "@/lib/generate";

export interface WorkerRequest {
  id: number;
  req: GenerateRequest;
}
export type WorkerResponse = { id: number; res: GenResult } | { id: number; error: string };

let sources: Promise<void> | null = null;
function ensure(preset: PresetKey) {
  if (hasSources(preset)) return Promise.resolve();
  sources ??= import("@/core/digsrc.js").then((m) => registerSources(m));
  return sources;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, req } = e.data;
  try {
    await ensure(req.preset);
    const res = generate(req.preset, req.w, req.h, req.seed, req.scale, { tileable: req.tileable });
    const transfer: ArrayBuffer[] = [res.index.buffer as ArrayBuffer];
    if (res.grid) transfer.push(res.grid.cellColor.buffer as ArrayBuffer);
    const msg: WorkerResponse = { id, res };
    (self as unknown as Worker).postMessage(msg, transfer);
  } catch (err) {
    const msg: WorkerResponse = { id, error: (err as Error).message };
    (self as unknown as Worker).postMessage(msg);
  }
};
