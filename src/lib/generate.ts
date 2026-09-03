// 生成の非同期窓口。Web Worker で実行し UI をブロックしない (Issue #3)。
// Worker が使えない環境 (古いブラウザ・テスト) ではメインスレッドにフォールバックする。
import {
  type GenResult,
  generate,
  hasSources,
  type PresetKey,
  registerSources,
} from "@/core/camo.js";
import type { WorkerRequest, WorkerResponse } from "@/workers/generate.worker";

export interface GenerateRequest {
  preset: PresetKey;
  w: number;
  h: number;
  seed: number;
  scale: number;
  tileable: boolean;
}

let sourcesLoading: Promise<void> | null = null;
/** AOR 実物マップ (約 280KB) は必要になった時だけ読む (メインスレッド用) */
export function ensureSources(preset: PresetKey): Promise<void> {
  if (hasSources(preset)) return Promise.resolve();
  sourcesLoading ??= import("@/core/digsrc.js")
    .then((m) => registerSources(m))
    .catch((e) => {
      // 取得失敗 (オフライン・デプロイ直後のハッシュずれ等) はキャッシュを捨てて次回再試行できるようにする
      sourcesLoading = null;
      throw e;
    });
  return sourcesLoading;
}

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, { resolve: (r: GenResult) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../workers/generate.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    workerBroken = true;
    return null;
  }
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if ("error" in e.data) p.reject(new Error(e.data.error));
    else p.resolve(e.data.res);
  };
  worker.onerror = () => {
    // Worker 自体が壊れたら以後はメインスレッドで。待っている要求は失敗させる
    workerBroken = true;
    for (const p of pending.values()) p.reject(new Error("generate worker failed"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

async function generateOnMain(req: GenerateRequest): Promise<GenResult> {
  await ensureSources(req.preset);
  return new Promise((resolve) => {
    // 描画フレームを 1 つ譲ってから実行 (進捗表示を描かせる)
    setTimeout(() => {
      resolve(generate(req.preset, req.w, req.h, req.seed, req.scale, { tileable: req.tileable }));
    }, 0);
  });
}

export function generateAsync(req: GenerateRequest): Promise<GenResult> {
  const w = getWorker();
  if (!w) return generateOnMain(req);
  const id = ++seq;
  return new Promise<GenResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const msg: WorkerRequest = { id, req };
    w.postMessage(msg);
  }).catch((e) => {
    // Worker 側の失敗 (メモリ不足など) は 1 回だけメインスレッドで再試行
    if (workerBroken) return generateOnMain(req);
    throw e;
  });
}

/** プレビュー用: 出力比率を保ちつつ長辺を上限に収める */
export function previewSize(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { w: Math.max(64, Math.round(w * k)), h: Math.max(64, Math.round(h * k)) };
}
