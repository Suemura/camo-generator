// 迷彩プリセットのピッカー: 大カテゴリ (すべて / 用途 / 国 / 系統 / 年代) をタブで切替、
// その軸のタグをチップで絞り込む。タグ未選択時はタグごとに見出しを付けてグループ表示する。
// カラーライブラリ (PaletteLibraryDrawer) と同じ操作体系。プリセットが増えても縦に伸び続けない。
import { useEffect, useMemo, useRef, useState } from "react";
import type { PresetKey } from "@/core/camo.js";
import {
  ALL_ENVS,
  ALL_ERAS,
  ALL_PRESET_COUNTRIES,
  countryLabel,
  ENV_LABEL,
  ERA_LABEL,
  PRESET_GROUPS,
  PRESET_KEYS,
  PRESET_META,
  type PresetMeta,
} from "@/data/presets-meta";
import styles from "./PresetPickerDrawer.module.scss";

interface Props {
  open: boolean;
  current: PresetKey;
  onPick: (key: PresetKey) => void;
  onClose: () => void;
}

type Axis = "all" | "env" | "country" | "group" | "era";
const AXIS_LABEL: Record<Axis, string> = {
  all: "すべて",
  env: "用途ごと",
  country: "国ごと",
  group: "系統ごと",
  era: "年代ごと",
};

const TAGS: Record<Exclude<Axis, "all">, { key: string; label: string }[]> = {
  env: ALL_ENVS.map((k) => ({ key: k, label: ENV_LABEL[k] })),
  country: ALL_PRESET_COUNTRIES.map((k) => ({ key: k, label: countryLabel(k) })),
  group: PRESET_GROUPS.map((g) => ({ key: g.key, label: g.label })),
  era: ALL_ERAS.map((k) => ({ key: k, label: ERA_LABEL[k] })),
};

function hasTag(m: PresetMeta, axis: Exclude<Axis, "all">, key: string) {
  if (axis === "env") return (m.env as string[]).includes(key);
  if (axis === "country") return m.country === key;
  if (axis === "group") return m.group === key;
  return m.era === key;
}

/** 検索対象: 表示名・補足・国名・全タグのラベル (「砂漠」「ロシア」「デジタル」等で引ける) */
function haystack(m: PresetMeta) {
  return [
    m.label,
    m.note,
    countryLabel(m.country),
    ...m.env.map((e) => ENV_LABEL[e]),
    ERA_LABEL[m.era],
    PRESET_GROUPS.find((g) => g.key === m.group)?.label ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function PresetPickerDrawer({ open, current, onPick, onClose }: Props) {
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
  const groups = useMemo((): { key: string; label: string | null; items: PresetKey[] }[] => {
    const base = PRESET_KEYS.filter((k) => !needle || haystack(PRESET_META[k]).includes(needle));
    if (axis === "all") return [{ key: "all", label: null, items: base }];
    if (tag)
      return [
        { key: tag, label: null, items: base.filter((k) => hasTag(PRESET_META[k], axis, tag)) },
      ];
    return TAGS[axis]
      .map((t) => ({
        key: t.key,
        label: t.label,
        items: base.filter((k) => hasTag(PRESET_META[k], axis, t.key)),
      }))
      .filter((g) => g.items.length);
  }, [axis, tag, needle]);
  // 用途は複数タグを持てるので、グループの合計ではなく実プリセット数を数える
  const total = new Set(groups.flatMap((g) => g.items)).size;

  if (!open) return null;
  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="閉じる" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="迷彩プリセット">
        <header className={styles.head}>
          <h2 className="sectionTitle">迷彩プリセット</h2>
          <button type="button" className="btn ghost icon" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>
        <input
          ref={first}
          className="input"
          placeholder="検索 (名称 / 国 / 用途…)"
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
        <p className="hint">{total} 種</p>
        <div className={styles.list}>
          {groups.map((g) => {
            const headingId = `preset-tag-${g.key}`;
            return (
              <section key={g.key} className={styles.group}>
                {g.label && (
                  <h3 id={headingId} className={styles.groupTitle}>
                    {g.label} <span className="mono">{g.items.length}</span>
                  </h3>
                )}
                <div
                  className={styles.grid}
                  role="radiogroup"
                  aria-labelledby={g.label ? headingId : undefined}
                  aria-label={g.label ? undefined : "迷彩プリセット"}
                >
                  {g.items.map((k) => {
                    const m = PRESET_META[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={k === current}
                        className={`${styles.card} ${k === current ? styles.active : ""}`}
                        onClick={() => onPick(k)}
                      >
                        <img
                          className={styles.thumb}
                          src={`/thumbs/${k}.jpg`}
                          alt=""
                          width={256}
                          height={256}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className={styles.cardName}>{m.label}</span>
                        <span className={styles.cardNote}>
                          {countryLabel(m.country)} · {m.note}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </aside>
    </>
  );
}
