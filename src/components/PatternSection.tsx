import type { PresetKey } from "@/core/camo.js";
import { PRESET_GROUPS, PRESET_KEYS, PRESET_META } from "@/data/presets-meta";
import { type AppState, LIMITS } from "@/lib/state";
import styles from "./PatternSection.module.scss";

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
}

export function PatternSection({ state, onChange }: Props) {
  const setSeed = (n: number) =>
    onChange({ seed: Math.min(LIMITS.seed.max, Math.max(0, Math.round(n))) });
  return (
    <div className="section">
      <h2 className="sectionTitle">パターン</h2>
      <div>
        {PRESET_GROUPS.map((g) => {
          // 該当プリセットが無いグループは見出しも出さない (プリセット追加に応じて自然に現れる)
          const keys = PRESET_KEYS.filter((k: PresetKey) => PRESET_META[k].group === g.key);
          if (keys.length === 0) return null;
          const headingId = `preset-group-${g.key}`;
          return (
            <div key={g.key} className={styles.group}>
              <h3 id={headingId} className={styles.groupTitle}>
                {g.label}
              </h3>
              <div role="radiogroup" aria-labelledby={headingId} className={styles.grid}>
                {keys.map((k: PresetKey) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={state.preset === k}
                    className={`${styles.card} ${state.preset === k ? styles.active : ""}`}
                    onClick={() => onChange({ preset: k, palette: null })}
                  >
                    <span className={styles.cardName}>{PRESET_META[k].label}</span>
                    <span className={styles.cardNote}>
                      {PRESET_META[k].country} · {PRESET_META[k].note}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="field">
        <label className="label" htmlFor="seed">
          シード
        </label>
        <div className="row">
          <button
            type="button"
            className="btn icon"
            aria-label="前のシード"
            onClick={() => setSeed(state.seed - 1)}
          >
            −
          </button>
          <input
            id="seed"
            className="input mono grow"
            type="number"
            min={0}
            max={LIMITS.seed.max}
            value={state.seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
          />
          <button
            type="button"
            className="btn icon"
            aria-label="次のシード"
            onClick={() => setSeed(state.seed + 1)}
          >
            +
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
            title="ランダム"
          >
            🎲
          </button>
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="scale">
          模様スケール <span className="mono">×{state.scale.toFixed(2)}</span>
        </label>
        <input
          id="scale"
          className="range"
          type="range"
          min={LIMITS.scale.min}
          max={LIMITS.scale.max}
          step={0.05}
          value={state.scale}
          onChange={(e) => onChange({ scale: Number(e.target.value) })}
        />
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={state.tileable}
          onChange={(e) => onChange({ tileable: e.target.checked })}
        />
        シームレス (タイル可能)
      </label>
    </div>
  );
}
