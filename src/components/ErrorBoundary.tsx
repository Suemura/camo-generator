import { Component, type ReactNode } from "react";
import { readLang, t } from "@/i18n/t";

interface State {
  error: Error | null;
}

/** 描画エラーで画面全体が消えるのを防ぐ。再読み込み導線つき。Provider の外側に居るので言語は <html lang> から読む */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    const lang = readLang();
    return (
      <div style={{ padding: "var(--space-4)", maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontSize: "var(--text-lg)" }}>{t(lang, "error.title")}</h1>
        <pre
          className="mono"
          style={{
            whiteSpace: "pre-wrap",
            fontSize: "var(--text-xs)",
            color: "var(--color-fg-muted)",
          }}
        >
          {this.state.error.message}
        </pre>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          {t(lang, "error.reload")}
        </button>
      </div>
    );
  }
}
