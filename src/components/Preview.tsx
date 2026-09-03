// プレビュー: 出力比率を保った縮小生成を表示。単一 / タイル 2×2 / 実物比較。
import { useEffect, useRef, useState } from "react";
import { type GenResult, PRESETS } from "@/core/camo.js";
import { PRESET_META } from "@/data/presets-meta";
import { drawToCanvas } from "@/lib/export";
import { generateAsync, previewSize } from "@/lib/generate";
import { type AppState, effectivePalette } from "@/lib/state";
import { outputPx } from "@/lib/units";
import styles from "./Preview.module.scss";

export type ViewMode = "single" | "tile" | "compare";
const PREVIEW_EDGE = 768;
const COARSE_EDGE = 192; // まず粗い結果を即表示してフリーズ感を消す

interface Props {
  state: AppState;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  busy?: string | null;
  /** 書き出し等の外部処理の進捗 0..1 (null で非表示) */
  busyProgress?: number | null;
}

export function Preview({ state, mode, onMode, busy, busyProgress }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [res, setRes] = useState<(GenResult & { preset: string; colors: number }) | null>(null);
  const [ms, setMs] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [coarse, setCoarse] = useState(false);
  const [refSrc, setRefSrc] = useState<string | null>(null);
  const out = outputPx(state);
  const pal = effectivePalette(state);

  // 形状生成 (パレット変更では再生成しない: 形状と色の分離)
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setGenerating(true);
      setProgress(0);
      const tag = { preset: state.preset, colors: PRESETS[state.preset].colors.length };
      const req = {
        preset: state.preset,
        seed: state.seed,
        scale: state.scale,
        tileable: state.tileable,
      };
      // 1. 粗いプレビュー (数十 ms) を先に出してフリーズ感を消す
      const cz = previewSize(out.w, out.h, COARSE_EDGE);
      const coarseRes = await generateAsync({ ...req, w: cz.w, h: cz.h });
      if (!alive) return;
      setRes({ ...coarseRes, ...tag });
      setCoarse(true);
      // 2. 本プレビュー (進捗つき)
      const sz = previewSize(out.w, out.h, PREVIEW_EDGE);
      const t0 = performance.now();
      const r = await generateAsync({ ...req, w: sz.w, h: sz.h }, (f) => alive && setProgress(f));
      if (!alive) return;
      setMs(Math.round(performance.now() - t0));
      setRes({ ...r, ...tag });
      setCoarse(false);
      setGenerating(false);
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [state.preset, state.seed, state.scale, state.tileable, out.w, out.h]);

  // 着色・描画
  useEffect(() => {
    const el = canvas.current;
    // 旧プリセットの形状に新パレットを当てない (色数不一致で落ちる)
    if (!el || !res || res.preset !== state.preset || pal.length < res.colors) return;
    if (mode === "tile") {
      const tmp = document.createElement("canvas");
      drawToCanvas(res, pal, tmp);
      el.width = res.w * 2;
      el.height = res.h * 2;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      const pattern = ctx.createPattern(tmp, "repeat");
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, el.width, el.height);
      }
    } else {
      drawToCanvas(res, pal, el);
    }
  }, [res, pal, mode, state.preset]);

  // 実物リファレンス (比較モードのみ動的 import)
  useEffect(() => {
    if (mode !== "compare") return;
    let alive = true;
    import("@/data/refs.js").then((m) => {
      if (alive) setRefSrc(m.REFS[PRESET_META[state.preset].ref] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [mode, state.preset]);

  const physical =
    state.unit !== "px" ? `${state.w}×${state.h} ${state.unit} @ ${state.dpi} dpi → ` : "";

  return (
    <section className={styles.preview} aria-label="プレビュー">
      <div className={styles.toolbar}>
        <div className="seg" role="group" aria-label="表示モード">
          <button type="button" aria-pressed={mode === "single"} onClick={() => onMode("single")}>
            単一
          </button>
          <button type="button" aria-pressed={mode === "tile"} onClick={() => onMode("tile")}>
            タイル 2×2
          </button>
          <button type="button" aria-pressed={mode === "compare"} onClick={() => onMode("compare")}>
            実物比較
          </button>
        </div>
        <p className={`${styles.status} mono`}>
          {physical}
          {out.w}×{out.h} px{out.over && <span className="warn"> (上限超過)</span>} · プレビュー{" "}
          {res?.w ?? "–"}×{res?.h ?? "–"} · {ms} ms
        </p>
      </div>
      <div className={`${styles.stage} ${mode === "compare" ? styles.split : ""}`}>
        <div className={styles.frame} style={{ aspectRatio: `${out.w} / ${out.h}` }}>
          <canvas ref={canvas} className={styles.canvas} aria-label="生成された迷彩" />
          {busy && (
            <div className={styles.overlay} role="status" aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              <span>{busy}</span>
              {busyProgress != null && (
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${Math.round(busyProgress * 100)}%` }} />
                </span>
              )}
            </div>
          )}
          {!busy && generating && (
            <div className={styles.badge} role="status" aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              {coarse ? `高解像度を生成中 ${Math.round(progress * 100)}%` : "生成中…"}
            </div>
          )}
        </div>
        {mode === "compare" && (
          <figure className={styles.refFig}>
            {refSrc ? (
              <img
                src={refSrc}
                alt={`${PRESET_META[state.preset].label} の実物リファレンス`}
                className={styles.refImg}
              />
            ) : (
              <div className={styles.refEmpty}>読み込み中…</div>
            )}
            <figcaption className="hint">
              実物リファレンス (Wikimedia Commons) · 出典は About 参照
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
