import { PRESETS } from "@/core/camo.js";
import { type LibraryColor, libraryByHex, libraryById, libraryLabel } from "@/data/palette";
import { useI18n } from "@/i18n";
import { colorRole } from "@/i18n/color-roles";
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
  const { t, lang } = useI18n();
  const pal = effectivePalette(state);
  const roles = PRESETS[state.preset].colors.map((c) => colorRole(c.name, lang));
  const isDefault = pal.every(
    (c, i) => c.toLowerCase() === defaultPalette(state.preset)[i].toLowerCase(),
  );
  return (
    <div className="section">
      <h2 className="sectionTitle">
        {t("palette.title")}
        <button
          type="button"
          className="btn ghost sm"
          disabled={isDefault}
          onClick={() => onChange({ palette: null })}
        >
          {t("palette.reset")}
        </button>
      </h2>
      <ul className={styles.slots}>
        {pal.map((hex, i) => {
          const lib = resolveSlot(hex, slotIds[i]);
          const isDefaultSlot = hex.toLowerCase() === defaultPalette(state.preset)[i].toLowerCase();
          // 表示名: ライブラリ色ならその名称、既定色なら役割名、カスタム色なら「カスタム」
          const l = lib ? libraryLabel(lib, lang) : undefined;
          const name = l ? l.name : isDefaultSlot ? roles[i] : t("palette.custom");
          return (
            <li key={`${i}-${roles[i]}`} className={styles.slot}>
              <label className={styles.picker} title={t("palette.pickColor")}>
                <span className={styles.swatch} style={{ background: hex }} />
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => onPickerChange(i, e.target.value)}
                  aria-label={t("palette.slotColor", { role: roles[i] })}
                  className="srOnly"
                />
              </label>
              <div className={styles.meta} tabIndex={lib ? 0 : -1}>
                <span className={styles.name}>{name}</span>
                <span className={`${styles.hex} mono`}>
                  {l ? `${l.std} ${l.code} · ` : ""}
                  {hex}
                </span>
                {l && (
                  <div className={styles.detail} role="tooltip">
                    <strong>{l.name}</strong>{" "}
                    <span className="mono">
                      {l.std} {l.code}
                    </span>
                    {l.note && <p>{l.note}</p>}
                    <p className={styles.role}>{t("palette.role", { role: roles[i] })}</p>
                  </div>
                )}
              </div>
              <button type="button" className="btn sm" onClick={() => onOpenLibrary(i)}>
                {t("palette.library")}
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn block" onClick={onOpenExtract}>
        {t("palette.extract")}
      </button>
    </div>
  );
}
