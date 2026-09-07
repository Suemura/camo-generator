// About ページのシェル。上部バー (戻るリンク + 言語切替) を持ち、本文は言語ごとの AboutJa / AboutEn に委ねる。
import { useI18n } from "@/i18n";
import styles from "./About.module.scss";
import { AboutEn } from "./AboutEn";
import { AboutJa } from "./AboutJa";

export function About() {
  const { lang, t, toggleLang } = useI18n();
  return (
    <main className={styles.about}>
      <div className={styles.bar}>
        <a href="/" className="btn ghost sm">
          {lang === "en" ? "← Back to generator" : "← ジェネレータへ戻る"}
        </a>
        <button
          type="button"
          className="btn ghost sm"
          onClick={toggleLang}
          aria-label={t("lang.switchToAria")}
          lang={lang === "ja" ? "en" : "ja"}
        >
          {t("lang.switchTo")}
        </button>
      </div>
      {lang === "en" ? <AboutEn /> : <AboutJa />}
    </main>
  );
}
