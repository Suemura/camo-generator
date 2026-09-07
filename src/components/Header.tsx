import type { Theme } from "@/app/useTheme";
import { useI18n } from "@/i18n";
import styles from "./Header.module.scss";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  onCopyLink: () => void;
  onShare?: () => void;
}

export function Header({ theme, onToggleTheme, onCopyLink, onShare }: Props) {
  const { t, lang, toggleLang } = useI18n();
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
        <button
          type="button"
          className="btn ghost sm"
          onClick={toggleLang}
          aria-label={t("lang.switchToAria")}
          lang={lang === "ja" ? "en" : "ja"}
        >
          <span className={styles.langFull}>{t("lang.switchTo")}</span>
          <span className={styles.langShort} aria-hidden="true">
            {lang === "ja" ? "EN" : "JA"}
          </span>
        </button>
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
