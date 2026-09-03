// パレットライブラリ: 検索 + 3 軸タグフィルタ。チップクリックで対象スロットへ適用。
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_COUNTRIES,
  ALL_USES,
  COUNTRY_LABEL,
  HUE_LABEL,
  type Hue,
  LIBRARY,
  USE_LABEL,
} from "@/data/palette";
import styles from "./PaletteLibraryDrawer.module.scss";

interface Props {
  open: boolean;
  slotName: string;
  onPick: (hex: string) => void;
  onClose: () => void;
}

const HUES = Object.keys(HUE_LABEL) as Hue[];

export function PaletteLibraryDrawer({ open, slotName, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const [hue, setHue] = useState<Hue | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [use, setUse] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return LIBRARY.filter((c) => {
      if (hue && c.tags.hue !== hue) return false;
      if (country && !c.tags.country.includes(country)) return false;
      if (use && !c.tags.use.includes(use)) return false;
      if (!needle) return true;
      return [c.name, c.std, c.code, c.note ?? "", c.hex].join(" ").toLowerCase().includes(needle);
    });
  }, [q, hue, country, use]);

  if (!open) return null;
  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="閉じる" onClick={onClose} />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="カラーライブラリ"
      >
        <header className={styles.head}>
          <h2 className="sectionTitle">
            カラーライブラリ <span className={styles.target}>→ {slotName}</span>
          </h2>
          <button type="button" className="btn ghost icon" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>
        <input
          ref={first}
          className="input"
          placeholder="検索 (名称 / FS / RAL / 用途…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={styles.filters}>
          <div className={styles.chips} aria-label="色味">
            {HUES.map((h) => (
              <button
                type="button"
                key={h}
                className="chip"
                aria-pressed={hue === h}
                onClick={() => setHue(hue === h ? null : h)}
              >
                {HUE_LABEL[h]}
              </button>
            ))}
          </div>
          <div className={styles.chips} aria-label="国">
            {ALL_COUNTRIES.map((c) => (
              <button
                type="button"
                key={c}
                className="chip"
                aria-pressed={country === c}
                onClick={() => setCountry(country === c ? null : c)}
              >
                {COUNTRY_LABEL[c] ?? c}
              </button>
            ))}
          </div>
          <div className={styles.chips} aria-label="用途">
            {ALL_USES.map((u) => (
              <button
                type="button"
                key={u}
                className="chip"
                aria-pressed={use === u}
                onClick={() => setUse(use === u ? null : u)}
              >
                {USE_LABEL[u] ?? u}
              </button>
            ))}
          </div>
        </div>
        <p className="hint">{list.length} 色</p>
        <ul className={styles.list}>
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" className={styles.item} onClick={() => onPick(c.hex)}>
                <span className={styles.big} style={{ background: c.hex }} />
                <span className={styles.itemMeta}>
                  <span className={styles.itemName}>{c.name}</span>
                  <span className={`${styles.itemCode} mono`}>
                    {c.std} {c.code} · {c.hex}
                  </span>
                  {c.note && <span className={styles.itemNote}>{c.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
