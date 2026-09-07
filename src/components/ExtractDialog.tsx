// 画像からパレット抽出: ドロップ → k-means (Worker) → スロット対応をドラッグで並べ替え → 適用
import { type DragEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { extractPalette } from "@/lib/extract";
import styles from "./ExtractDialog.module.scss";

interface Props {
  open: boolean;
  slotNames: string[];
  onApply: (palette: string[]) => void;
  onClose: () => void;
}

export function ExtractDialog({ open, slotNames, onApply, onClose }: Props) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(null);
  const [colors, setColors] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const load = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setErr(null);
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      setColors(await extractPalette(file, slotNames.length));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    load(e.dataTransfer.files[0]);
  };
  const move = (from: number, to: number) => {
    if (!colors || from === to) return;
    const next = [...colors];
    const [c] = next.splice(from, 1);
    next.splice(to, 0, c);
    setColors(next);
  };

  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t("extract.title")}
      >
        <header className={styles.head}>
          <h2 className="sectionTitle">{t("extract.title")}</h2>
          <button
            type="button"
            className="btn ghost icon"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </header>
        <button
          type="button"
          className={styles.drop}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => fileInput.current?.click()}
        >
          {preview ? (
            <img src={preview} alt={t("extract.sourceAlt")} className={styles.previewImg} />
          ) : (
            <span>{t("extract.drop")}</span>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="srOnly"
            onChange={(e) => load(e.target.files?.[0])}
          />
        </button>
        <p className="hint">{t("extract.hint", { n: slotNames.length })}</p>
        {err && <p className={`hint ${styles.err}`}>{err}</p>}
        {busy && <p className="hint">{t("extract.busy")}</p>}
        {colors && (
          <ul className={styles.map}>
            {colors.map((hex, i) => (
              <li
                key={`${hex}-${i}`}
                className={`${styles.pair} ${drag === i ? styles.dragging : ""}`}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag !== null) move(drag, i);
                  setDrag(null);
                }}
                onDragEnd={() => setDrag(null)}
              >
                <span className={styles.sw} style={{ background: hex }} />
                <span className="mono">{hex}</span>
                <span className={styles.arrow}>→</span>
                <span className={styles.slotName}>{slotNames[i]}</span>
                <span className={styles.handle} aria-hidden="true">
                  ⋮⋮
                </span>
              </li>
            ))}
          </ul>
        )}
        <footer className={styles.foot}>
          <button type="button" className="btn" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={!colors}
            onClick={() => colors && onApply(colors)}
          >
            {t("extract.apply")}
          </button>
        </footer>
      </div>
    </>
  );
}
