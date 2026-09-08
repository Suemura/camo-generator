import type { Theme } from "@/app/useTheme";
import { useI18n } from "@/i18n";
import styles from "./Header.module.scss";
import { LangSwitch } from "./LangSwitch";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onCopyLink: () => void;
  onShare?: () => void;
}

export function Header({ theme, onToggleTheme, onCopyLink, onShare }: Props) {
  const { t } = useI18n();
  return (
    <header className={styles.header}>
      <a href="/" className={styles.brand}>
        <span className={styles.logo} aria-hidden="true" />
        <span className={styles.title}>Camo Generator</span>
      </a>
      <nav className={styles.actions} aria-label={t("header.actions")}>
        <button type="button" className={`btn ghost sm ${styles.copyLink}`} onClick={onCopyLink}>
          {t("header.copyLink")}
        </button>
        {onShare && (
          <button type="button" className="btn ghost sm" onClick={onShare}>
            {t("header.share")}
          </button>
        )}
        <a href="/about" className="btn ghost sm">
          About
        </a>
        <a
          href="https://github.com/Suemura/camo-generator"
          className="btn ghost sm"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("header.github")}
        >
          GitHub ↗
        </a>
        <LangSwitch />
        <button
          type="button"
          className="btn ghost icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? t("header.themeToLight") : t("header.themeToDark")}
          title={t("header.themeToggle")}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </nav>
    </header>
  );
}
