import { PRESETS } from "@/core/camo.js";
import { type AppState, defaultPalette, effectivePalette } from "@/lib/state";
import styles from "./PaletteSection.module.scss";

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
  onOpenLibrary: (slot: number) => void;
  onOpenExtract: () => void;
}

export function PaletteSection({ state, onChange, onOpenLibrary, onOpenExtract }: Props) {
  const pal = effectivePalette(state);
  const names = PRESETS[state.preset].colors.map((c) => c.name);
  const setSlot = (i: number, hex: string) => {
    const next = [...pal];
    next[i] = hex.toLowerCase();
    onChange({ palette: next });
  };
  const isDefault = pal.every(
    (c, i) => c.toLowerCase() === defaultPalette(state.preset)[i].toLowerCase(),
  );
  return (
    <div className="section">
      <h2 className="sectionTitle">
        パレット
        <button
          type="button"
          className="btn ghost sm"
          disabled={isDefault}
          onClick={() => onChange({ palette: null })}
        >
          既定色に戻す
        </button>
      </h2>
      <ul className={styles.slots}>
        {pal.map((hex, i) => (
          <li key={`${i}-${names[i]}`} className={styles.slot}>
            <label className={styles.picker} title="クリックで色を選択">
              <span className={styles.swatch} style={{ background: hex }} />
              <input
                type="color"
                value={hex}
                onChange={(e) => setSlot(i, e.target.value)}
                aria-label={`${names[i]} の色`}
                className="srOnly"
              />
            </label>
            <div className={styles.meta}>
              <span className={styles.name}>{names[i]}</span>
              <span className={`${styles.hex} mono`}>{hex}</span>
            </div>
            <button type="button" className="btn sm" onClick={() => onOpenLibrary(i)}>
              ライブラリ
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn block" onClick={onOpenExtract}>
        画像から抽出…
      </button>
    </div>
  );
}
