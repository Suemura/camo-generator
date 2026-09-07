import { useEffect, useRef, useState } from "react";
import type { PresetKey } from "@/core/camo.js";
import { countryLabel, PRESET_META } from "@/data/presets-meta";
import { type AppState, LIMITS } from "@/lib/state";
import { ConfirmDialog } from "./ConfirmDialog";
import styles from "./PatternSection.module.scss";
import { PresetPickerDrawer } from "./PresetPickerDrawer";

interface Props {
  state: AppState;
  onChange: (patch: Partial<AppState>) => void;
}

export function PatternSection({ state, onChange }: Props) {
  const setSeed = (n: number) =>
    onChange({ seed: Math.min(LIMITS.seed.max, Math.max(0, Math.round(n))) });
  // プリセット一覧はドロワーに追い出し、ここには選択中の 1 枚だけを出す
  // (プリセットが増えてもサイドバーが縦に伸び続けないようにするため)
  const [pickerOpen, setPickerOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const meta = PRESET_META[state.preset];
  const pick = (k: PresetKey) => {
    onChange({ preset: k, palette: null });
    setPickerOpen(false);
    trigger.current?.focus();
  };
  // 模様スケール: LIMITS.scale.heavy 未満はドラッグ中も即反映する (従来どおり)。
  // heavy 以上はクイルト系の生成時間が scale² で伸び、Worker への要求は取り消せずに積み上がるため、
  // ドラッグ中はローカル値だけ動かし、離した時点で 1 回だけ確定する。heavy 未満 → 以上へ跨ぐときは
  // 確認モーダルを挟む (既に heavy 以上で使っている間は再確認しない)
  const HEAVY = LIMITS.scale.heavy;
  const [scaleDraft, setScaleDraft] = useState(state.scale);
  const [heavyPending, setHeavyPending] = useState<number | null>(null);
  useEffect(() => setScaleDraft(state.scale), [state.scale]);
  const moveScale = (v: number) => {
    setScaleDraft(v);
    if (v < HEAVY) onChange({ scale: v });
  };
  const commitScale = () => {
    if (scaleDraft < HEAVY || scaleDraft === state.scale || heavyPending !== null) return;
    if (state.scale >= HEAVY) onChange({ scale: scaleDraft });
    else setHeavyPending(scaleDraft);
  };
  return (
    <div className="section">
      <h2 className="sectionTitle">パターン</h2>
      <div className="field">
        <span className="label" id="preset-label">
          迷彩
        </span>
        <button
          ref={trigger}
          type="button"
          className={styles.current}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-labelledby="preset-label"
          onClick={() => setPickerOpen(true)}
        >
          <img
            className={styles.currentThumb}
            src={`/thumbs/${state.preset}.jpg`}
            alt=""
            width={256}
            height={256}
            decoding="async"
          />
          <span className={styles.currentMeta}>
            <span className={styles.cardName}>{meta.label}</span>
            <span className={styles.cardNote}>
              {countryLabel(meta.country)} · {meta.note}
            </span>
          </span>
          <span className={styles.currentAction} aria-hidden="true">
            変更
          </span>
        </button>
      </div>
      <PresetPickerDrawer
        open={pickerOpen}
        current={state.preset}
        onPick={pick}
        onClose={() => {
          setPickerOpen(false);
          trigger.current?.focus();
        }}
      />
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
          模様スケール <span className="mono">×{scaleDraft.toFixed(2)}</span>
        </label>
        <input
          id="scale"
          className="range"
          type="range"
          min={LIMITS.scale.min}
          max={LIMITS.scale.max}
          step={0.05}
          value={scaleDraft}
          onChange={(e) => moveScale(Number(e.target.value))}
          onPointerUp={commitScale}
          onKeyUp={commitScale}
          onBlur={commitScale}
        />
        <p className="hint">
          ×{LIMITS.scale.heavy} 以上は生成に時間がかかります (細かさの 2 乗で増加。数十秒〜数分)
        </p>
      </div>
      <ConfirmDialog
        open={heavyPending !== null}
        title="生成に時間がかかります"
        onConfirm={() => {
          if (heavyPending !== null) onChange({ scale: heavyPending });
          setHeavyPending(null);
        }}
        onCancel={() => {
          setHeavyPending(null);
          setScaleDraft(state.scale);
        }}
      >
        <p>
          模様スケール ×{heavyPending?.toFixed(2)} はプレビューと書き出しの計算量が大きく、PC
          に負荷がかかります。生成が終わるまで数十秒〜数分かかることがあります。
        </p>
        <p>このまま進めますか?</p>
      </ConfirmDialog>
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
