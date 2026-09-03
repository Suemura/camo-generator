import { useState } from "react";
import { PRESET_META } from "@/data/presets-meta";
import type { Format } from "@/lib/export";
import { type AppState, LIMITS, type Unit } from "@/lib/state";
import { fromPx, outputPx, PAPER_PRESETS, PX_PRESETS, toPx } from "@/lib/units";
import styles from "./ExportSection.module.scss";

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onExport: (format: Format) => void;
  busy: boolean;
}

export function ExportSection({ state, onChange, onExport, busy }: Props) {
  const [lock, setLock] = useState(true);
  const out = outputPx(state);
  const svgOk = PRESET_META[state.preset].svg;
  const ratio = state.w / state.h;

  const setW = (w: number) => onChange(lock ? { w, h: round(w / ratio, state.unit) } : { w });
  const setH = (h: number) => onChange(lock ? { h, w: round(h * ratio, state.unit) } : { h });

  const switchUnit = (unit: Unit) => {
    if (unit === state.unit) return;
    // 現在の出力 px を維持したまま単位を換算
    const px = outputPx(state);
    onChange({ unit, w: fromPx(px.w, unit, state.dpi), h: fromPx(px.h, unit, state.dpi) });
  };

  return (
    <div className="section">
      <h2 className="sectionTitle">出力</h2>
      <div className="row">
        <div className="seg" role="group" aria-label="サイズ指定">
          <button type="button" aria-pressed={state.unit === "px"} onClick={() => switchUnit("px")}>
            ピクセル
          </button>
          <button type="button" aria-pressed={state.unit === "mm"} onClick={() => switchUnit("mm")}>
            mm
          </button>
          <button type="button" aria-pressed={state.unit === "in"} onClick={() => switchUnit("in")}>
            inch
          </button>
        </div>
      </div>
      <div className={styles.size}>
        <div className="field">
          <label className="label" htmlFor="outW">
            幅 ({state.unit})
          </label>
          <input
            id="outW"
            className="input mono"
            type="number"
            step={state.unit === "px" ? 1 : 0.1}
            value={state.w}
            onChange={(e) => setW(Number(e.target.value) || 1)}
          />
        </div>
        <button
          type="button"
          className={`btn icon ${styles.lock}`}
          aria-pressed={lock}
          onClick={() => setLock(!lock)}
          title="比率を固定"
        >
          {lock ? "🔒" : "🔓"}
        </button>
        <div className="field">
          <label className="label" htmlFor="outH">
            高さ ({state.unit})
          </label>
          <input
            id="outH"
            className="input mono"
            type="number"
            step={state.unit === "px" ? 1 : 0.1}
            value={state.h}
            onChange={(e) => setH(Number(e.target.value) || 1)}
          />
        </div>
      </div>
      {state.unit === "px" ? (
        <div className={styles.presets}>
          {PX_PRESETS.map((p) => (
            <button
              type="button"
              key={p}
              className="chip"
              aria-pressed={state.w === p && state.h === p}
              onClick={() => onChange({ w: p, h: p })}
            >
              {p}²
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="field">
            <label className="label" htmlFor="dpi">
              DPI
            </label>
            <div className="row">
              <input
                id="dpi"
                className="input mono grow"
                type="number"
                min={LIMITS.dpi.min}
                max={LIMITS.dpi.max}
                value={state.dpi}
                onChange={(e) =>
                  onChange({
                    dpi: Math.min(
                      LIMITS.dpi.max,
                      Math.max(LIMITS.dpi.min, Number(e.target.value) || 72),
                    ),
                  })
                }
              />
              {[72, 150, 300].map((d) => (
                <button
                  type="button"
                  key={d}
                  className="chip"
                  aria-pressed={state.dpi === d}
                  onClick={() => onChange({ dpi: d })}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="paper">
              用紙 / 生地
            </label>
            <select
              id="paper"
              className="select"
              value=""
              onChange={(e) => {
                const p = PAPER_PRESETS[Number(e.target.value)];
                if (!p) return;
                onChange(
                  state.unit === "mm"
                    ? { w: p.w, h: p.h }
                    : {
                        w: fromPx(toPx(p.w, "mm", state.dpi), "in", state.dpi),
                        h: fromPx(toPx(p.h, "mm", state.dpi), "in", state.dpi),
                      },
                );
              }}
            >
              <option value="">選択…</option>
              {PAPER_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <p className="hint">
            出力{" "}
            <span className="mono">
              {out.w}×{out.h} px
            </span>
            。PNG には DPI を埋め込みます (Photoshop 等で実寸として開けます)。
          </p>
        </>
      )}
      {out.over && (
        <p className={`hint ${styles.warn}`}>
          長辺が {LIMITS.px.max}px を超えています。サイズか DPI を下げてください。
        </p>
      )}
      {Math.min(out.w, out.h) < LIMITS.px.min && (
        <p className={`hint ${styles.warn}`}>
          短辺が {LIMITS.px.min}px 未満です。小さすぎると模様が破綻します。
        </p>
      )}
      <div className={styles.formats}>
        <button
          type="button"
          className="btn primary"
          disabled={busy || out.over}
          onClick={() => onExport("png")}
        >
          PNG
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || out.over}
          onClick={() => onExport("jpg")}
        >
          JPG
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || out.over}
          onClick={() => onExport("webp")}
        >
          WebP
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || out.over || !svgOk}
          onClick={() => onExport("svg")}
          title={
            svgOk ? "セル矩形を結合した SVG" : "SVG はセルグリッド系 (デジタル) プリセットのみ"
          }
        >
          SVG
        </button>
      </div>
      {!svgOk && (
        <p className="hint">SVG は有機形状プリセットでは未対応 (ベクタ化は今後の課題)。</p>
      )}
    </div>
  );
}

function round(v: number, unit: Unit) {
  return unit === "px" ? Math.round(v) : +v.toFixed(1);
}
