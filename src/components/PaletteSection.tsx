import { PRESETS } from "@/core/camo.js";
import { type LibraryColor, libraryByHex, libraryById } from "@/data/palette";
import { type AppState, defaultPalette, effectivePalette } from "@/lib/state";
import styles from "./PaletteSection.module.scss";

interface Props {
  state: AppState;
  /** スロット → ライブラリ id (セッション内でライブラリから選んだ記録。URL には hex しか無い) */
  slotIds: (string | undefined)[];
  onChange: (patch: Partial<AppState>) => void;
  onPickerChange: (slot: number, hex: string) => void;
  onOpenLibrary: (slot: number) => void;
  onOpenExtract: () => void;
}

export function resolveSlot(hex: string, id: string | undefined): LibraryColor | undefined {
  const byId = libraryById(id);
  if (byId && byId.hex.toLowerCase() === hex.toLowerCase()) return byId;
  return libraryByHex(hex);
}

export function PaletteSection({
  state,
  slotIds,
  onChange,
  onPickerChange,
  onOpenLibrary,
  onOpenExtract,
}: Props) {
  const pal = effectivePalette(state);
  const roles = PRESETS[state.preset].colors.map((c) => c.name);
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
        {pal.map((hex, i) => {
          const lib = resolveSlot(hex, slotIds[i]);
          const isDefaultSlot = hex.toLowerCase() === defaultPalette(state.preset)[i].toLowerCase();
          // 表示名: ライブラリ色ならその名称、既定色なら役割名、カスタム色なら「カスタム」
          const name = lib ? lib.name : isDefaultSlot ? roles[i] : "カスタム";
          return (
            <li key={`${i}-${roles[i]}`} className={styles.slot}>
              <label className={styles.picker} title="クリックで色を選択">
                <span className={styles.swatch} style={{ background: hex }} />
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => onPickerChange(i, e.target.value)}
                  aria-label={`${roles[i]} の色`}
                  className="srOnly"
                />
              </label>
              <div className={styles.meta} tabIndex={lib ? 0 : -1}>
                <span className={styles.name}>{name}</span>
                <span className={`${styles.hex} mono`}>
                  {lib ? `${lib.std} ${lib.code} · ` : ""}
                  {hex}
                </span>
                {lib && (
                  <div className={styles.detail} role="tooltip">
                    <strong>{lib.name}</strong>{" "}
                    <span className="mono">
                      {lib.std} {lib.code}
                    </span>
                    {lib.note && <p>{lib.note}</p>}
                    <p className={styles.role}>役割: {roles[i]}</p>
                  </div>
                )}
              </div>
              <button type="button" className="btn sm" onClick={() => onOpenLibrary(i)}>
                ライブラリ
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn block" onClick={onOpenExtract}>
        画像から抽出…
      </button>
    </div>
  );
}
