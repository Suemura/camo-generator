// 汎用の確認モーダル。開いたら「続ける」にフォーカスし、Escape / 背景クリックはキャンセル扱い
import { type ReactNode, useEffect, useRef } from "react";
import styles from "./ConfirmDialog.module.scss";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "続ける",
  cancelLabel = "キャンセル",
  onConfirm,
  onCancel,
}: Props) {
  const confirmBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="閉じる" onClick={onCancel} />
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
      >
        <h2 id="confirm-title" className="sectionTitle">
          {title}
        </h2>
        <div id="confirm-body" className={styles.body}>
          {children}
        </div>
        <div className={styles.foot}>
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button ref={confirmBtn} type="button" className="btn primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
