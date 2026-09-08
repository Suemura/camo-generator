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
  libraryLabel,
  USE_LABEL,
} from "@/data/palette";
import { type L10n, type MessageKey, useI18n } from "@/i18n";
import styles from "./PaletteLibraryDrawer.module.scss";

interface Props {
  open: boolean;
  slotName: string;
  currentId?: string;
  onPick: (color: LibraryColor) => void;
  onClose: () => void;
}

type Axis = "all" | "hue" | "country" | "use";
const AXES: Axis[] = ["all", "hue", "country", "use"];
const AXIS_KEY: Record<Axis, MessageKey> = {
  all: "common.all",
  hue: "axis.hue",
  country: "axis.country",
  use: "axis.use",
};

const asIs = (k: string): L10n => ({ ja: k, en: k });
const TAGS: Record<Exclude<Axis, "all">, { key: string; label: L10n }[]> = {
  hue: (Object.keys(HUE_LABEL) as Hue[]).map((k) => ({ key: k, label: HUE_LABEL[k] })),
  country: ALL_COUNTRIES.map((k) => ({ key: k, label: COUNTRY_LABEL[k] ?? asIs(k) })),
  use: ALL_USES.map((k) => ({ key: k, label: USE_LABEL[k] ?? asIs(k) })),
};

function hasTag(c: LibraryColor, axis: Exclude<Axis, "all">, key: string) {
  if (axis === "hue") return c.tags.hue === key;
  if (axis === "country") return c.tags.country.includes(key);
  return c.tags.use.includes(key);
}

export function PaletteLibraryDrawer({ open, slotName, currentId, onPick, onClose }: Props) {
  const { t, lang, pick } = useI18n();
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
  // 検索は両言語の name / std / code / note を常に含める
  const matchesQ = (c: LibraryColor) =>
    !needle ||
    [
      c.name,
      c.nameEn ?? "",
      c.std,
      c.stdEn ?? "",
      c.code,
      c.codeEn ?? "",
      c.note ?? "",
      c.noteEn ?? "",
      c.hex,
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);

  // グループ: 軸 + タグ未選択 → タグごと。それ以外は単一グループ
  const groups = useMemo((): { key: string; label: string | null; items: LibraryColor[] }[] => {
    const base = LIBRARY.filter(matchesQ);
    if (axis === "all") return [{ key: "all", label: null, items: base }];
    if (tag) return [{ key: tag, label: null, items: base.filter((c) => hasTag(c, axis, tag)) }];
    return TAGS[axis]
      .map((tg) => ({
        key: tg.key,
        label: tg.label[lang],
        items: base.filter((c) => hasTag(c, axis, tg.key)),
      }))
      .filter((g) => g.items.length);
  }, [axis, tag, needle, lang]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={t("library.title")}
      >
        <header className={styles.head}>
          <h2 className="sectionTitle">
            {t("library.title")} <span className={styles.target}>→ {slotName}</span>
          </h2>
          <button
            type="button"
            className="btn ghost icon"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </header>
        <input
          ref={first}
          className="input"
          placeholder={t("library.search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className={`seg ${styles.axis}`} role="tablist" aria-label={t("axis.aria")}>
          {AXES.map((a) => (
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
              {t(AXIS_KEY[a])}
            </button>
          ))}
        </div>
        {axis !== "all" && (
          <div className={styles.chips} aria-label={t(AXIS_KEY[axis])}>
            <button
              type="button"
              className="chip"
              aria-pressed={tag === null}
              onClick={() => setTag(null)}
            >
              {t("common.all")}
            </button>
            {TAGS[axis].map((tg) => (
              <button
                type="button"
                key={tg.key}
                className="chip"
                aria-pressed={tag === tg.key}
                onClick={() => setTag(tag === tg.key ? null : tg.key)}
              >
                {pick(tg.label)}
              </button>
            ))}
          </div>
        )}
        <p className="hint">{t("library.count", { n: total })}</p>
        <div className={styles.list}>
          {groups.map((g) => (
            <section key={g.key} className={styles.group}>
              {g.label && (
                <h3 className={styles.groupTitle}>
                  {g.label} <span className="mono">{g.items.length}</span>
                </h3>
              )}
              <ul className={styles.items}>
                {g.items.map((c) => {
                  const l = libraryLabel(c, lang);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={`${styles.item} ${c.id === currentId ? styles.current : ""}`}
                        onClick={() => onPick(c)}
                        aria-current={c.id === currentId || undefined}
                      >
                        <span className={styles.big} style={{ background: c.hex }} />
                        <span className={styles.itemMeta}>
                          <span className={styles.itemName}>{l.name}</span>
                          <span className={`${styles.itemCode} mono`}>
                            {l.std} {l.code} · {c.hex}
                          </span>
                          {l.note && <span className={styles.itemNote}>{l.note}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
