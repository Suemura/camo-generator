// プレビュー: 出力比率を保った縮小生成を表示。単一 / タイル 2×2 / 実物比較。
import { useEffect, useRef, useState } from "react";
import type { GenResult } from "@/core/camo.js";
import { PRESET_META } from "@/data/presets-meta";
import { drawToCanvas } from "@/lib/export";
import { generateAsync, previewSize } from "@/lib/generate";
import { type AppState, effectivePalette } from "@/lib/state";
import { outputPx } from "@/lib/units";
import styles from "./Preview.module.scss";

export type ViewMode = "single" | "tile" | "compare";
const PREVIEW_EDGE = 768;

interface Props {
  state: AppState;
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  busy?: string | null;
}

export function Preview({ state, mode, onMode, busy }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [res, setRes] = useState<GenResult | null>(null);
  const [ms, setMs] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [refSrc, setRefSrc] = useState<string | null>(null);
  const out = outputPx(state);
  const pal = effectivePalette(state);

  // 形状生成 (パレット変更では再生成しない: 形状と色の分離)
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setGenerating(true);
      const sz = previewSize(out.w, out.h, PREVIEW_EDGE);
      const t0 = performance.now();
      const r = await generateAsync({
        preset: state.preset,
        w: sz.w,
        h: sz.h,
        seed: state.seed,
        scale: state.scale,
        tileable: state.tileable,
      });
      if (!alive) return;
      setMs(Math.round(performance.now() - t0));
      setRes(r);
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
    if (!el || !res) return;
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
  }, [res, pal, mode]);

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
          {(generating || busy) && (
            <div className={styles.overlay} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              {busy ?? "生成中…"}
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
