import type { Theme } from "@/app/useTheme";
import styles from "./Header.module.scss";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onCopyLink: () => void;
  onShare?: () => void;
}

export function Header({ theme, onToggleTheme, onCopyLink, onShare }: Props) {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.brand}>
        <span className={styles.logo} aria-hidden="true" />
        <span className={styles.title}>Camo Generator</span>
      </a>
      <nav className={styles.actions} aria-label="グローバル操作">
        <button type="button" className="btn ghost sm" onClick={onCopyLink}>
          リンクをコピー
        </button>
        {onShare && (
          <button type="button" className="btn ghost sm" onClick={onShare}>
            共有
          </button>
        )}
        <a href="/about" className="btn ghost sm">
          About
        </a>
        <button
          type="button"
          className="btn ghost icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "ライトテーマに切替" : "ダークテーマに切替"}
          title="テーマ切替"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </nav>
    </header>
  );
}
