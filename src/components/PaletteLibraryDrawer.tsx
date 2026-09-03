// パレットライブラリ: 大カテゴリ (すべて / 色味 / 国 / 用途) をタブで切替、その軸のタグをチップで絞り込み。
// タグ未選択時はそのタグごとに見出しを付けてグループ表示する。
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_COUNTRIES,
  ALL_USES,
  COUNTRY_LABEL,
  HUE_LABEL,
  type Hue,
  LIBRARY,
  type LibraryColor,
  USE_LABEL,
} from "@/data/palette";
import styles from "./PaletteLibraryDrawer.module.scss";

interface Props {
  open: boolean;
  slotName: string;
  currentId?: string;
  onPick: (color: LibraryColor) => void;
  onClose: () => void;
}

type Axis = "all" | "hue" | "country" | "use";
const AXIS_LABEL: Record<Axis, string> = {
  all: "すべて",
  hue: "色味ごと",
  country: "国ごと",
  use: "用途ごと",
};

const TAGS: Record<Exclude<Axis, "all">, { key: string; label: string }[]> = {
  hue: (Object.keys(HUE_LABEL) as Hue[]).map((k) => ({ key: k, label: HUE_LABEL[k] })),
  country: ALL_COUNTRIES.map((k) => ({ key: k, label: COUNTRY_LABEL[k] ?? k })),
  use: ALL_USES.map((k) => ({ key: k, label: USE_LABEL[k] ?? k })),
};

function hasTag(c: LibraryColor, axis: Exclude<Axis, "all">, key: string) {
  if (axis === "hue") return c.tags.hue === key;
  if (axis === "country") return c.tags.country.includes(key);
  return c.tags.use.includes(key);
}

export function PaletteLibraryDrawer({ open, slotName, currentId, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const [axis, setAxis] = useState<Axis>("all");
  const [tag, setTag] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const needle = q.trim().toLowerCase();
  const matchesQ = (c: LibraryColor) =>
    !needle ||
    [c.name, c.std, c.code, c.note ?? "", c.hex].join(" ").toLowerCase().includes(needle);

  // グループ: 軸 + タグ未選択 → タグごと。それ以外は単一グループ
  const groups = useMemo((): { key: string; label: string | null; items: LibraryColor[] }[] => {
    const base = LIBRARY.filter(matchesQ);
    if (axis === "all") return [{ key: "all", label: null, items: base }];
    if (tag) return [{ key: tag, label: null, items: base.filter((c) => hasTag(c, axis, tag)) }];
    return TAGS[axis]
      .map((t) => ({
        key: t.key,
        label: t.label,
        items: base.filter((c) => hasTag(c, axis, t.key)),
      }))
      .filter((g) => g.items.length);
  }, [axis, tag, needle]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

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
        <div className={`seg ${styles.axis}`} role="tablist" aria-label="大カテゴリ">
          {(Object.keys(AXIS_LABEL) as Axis[]).map((a) => (
            <button
              type="button"
              key={a}
              role="tab"
              aria-selected={axis === a}
              aria-pressed={axis === a}
              onClick={() => {
                setAxis(a);
                setTag(null);
              }}
            >
              {AXIS_LABEL[a]}
            </button>
          ))}
        </div>
        {axis !== "all" && (
          <div className={styles.chips} aria-label={AXIS_LABEL[axis]}>
            <button
              type="button"
              className="chip"
              aria-pressed={tag === null}
              onClick={() => setTag(null)}
            >
              すべて
            </button>
            {TAGS[axis].map((t) => (
              <button
                type="button"
                key={t.key}
                className="chip"
                aria-pressed={tag === t.key}
                onClick={() => setTag(tag === t.key ? null : t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <p className="hint">{total} 色</p>
        <div className={styles.list}>
          {groups.map((g) => (
            <section key={g.key} className={styles.group}>
              {g.label && (
                <h3 className={styles.groupTitle}>
                  {g.label} <span className="mono">{g.items.length}</span>
                </h3>
              )}
              <ul className={styles.items}>
                {g.items.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`${styles.item} ${c.id === currentId ? styles.current : ""}`}
                      onClick={() => onPick(c)}
                      aria-current={c.id === currentId || undefined}
                    >
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
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
