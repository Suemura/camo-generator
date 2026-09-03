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
export type WorkerResponse =
  | { id: number; res: GenResult }
  | { id: number; progress: number }
  | { id: number; error: string };

let sources: Promise<void> | null = null;
function ensure(preset: PresetKey) {
  if (hasSources(preset)) return Promise.resolve();
  sources ??= import("@/core/digsrc.js")
    .then((m) => registerSources(m))
    .catch((e) => {
      sources = null; // 取得失敗は次回再試行できるようにキャッシュを捨てる
      throw e;
    });
  return sources;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, req } = e.data;
  try {
    await ensure(req.preset);
    let lastSent = -1;
    const res = generate(req.preset, req.w, req.h, req.seed, req.scale, {
      tileable: req.tileable,
      progress: (fraction) => {
        // 進捗は 2% 刻みで間引く
        if (fraction - lastSent < 0.02 && fraction < 1) return;
        lastSent = fraction;
        const msg: WorkerResponse = { id, progress: fraction };
        (self as unknown as Worker).postMessage(msg);
      },
    });
    const transfer: ArrayBuffer[] = [res.index.buffer as ArrayBuffer];
    if (res.grid) transfer.push(res.grid.cellColor.buffer as ArrayBuffer);
    const msg: WorkerResponse = { id, res };
    (self as unknown as Worker).postMessage(msg, transfer);
  } catch (err) {
    const msg: WorkerResponse = { id, error: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(msg);
  }
};
