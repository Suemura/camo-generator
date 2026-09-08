import { useState } from "react";
import { PRESET_META } from "@/data/presets-meta";
import { useI18n } from "@/i18n";
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
  const { t, pick } = useI18n();
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
      <h2 className="sectionTitle">{t("export.title")}</h2>
      <div className="row">
        <div className="seg" role="group" aria-label={t("export.sizeMode")}>
          <button type="button" aria-pressed={state.unit === "px"} onClick={() => switchUnit("px")}>
            {t("export.px")}
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
            {t("export.width", { unit: state.unit })}
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
          title={t("export.lockRatio")}
        >
          {lock ? "🔒" : "🔓"}
        </button>
        <div className="field">
          <label className="label" htmlFor="outH">
            {t("export.height", { unit: state.unit })}
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
              {t("export.paper")}
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
              <option value="">{t("export.select")}</option>
              {PAPER_PRESETS.map((p, i) => (
                <option key={p.label.en} value={i}>
                  {pick(p.label)}
                </option>
              ))}
            </select>
          </div>
          <p className="hint">
            {t("export.outputPrefix")}{" "}
            <span className="mono">
              {out.w}×{out.h} px
            </span>
            {t("export.outputSuffix")}
          </p>
        </>
      )}
      {out.over && (
        <p className={`hint ${styles.warn}`}>{t("export.overMax", { max: LIMITS.px.max })}</p>
      )}
      {Math.min(out.w, out.h) < LIMITS.px.min && (
        <p className={`hint ${styles.warn}`}>{t("export.underMin", { min: LIMITS.px.min })}</p>
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
          title={svgOk ? t("export.svgOk") : t("export.svgOnlyGrid")}
        >
          SVG
        </button>
      </div>
      {!svgOk && <p className="hint">{t("export.svgHint")}</p>}
    </div>
  );
}

function round(v: number, unit: Unit) {
  return unit === "px" ? Math.round(v) : +v.toFixed(1);
}
