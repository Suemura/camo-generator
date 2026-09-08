// 言語切替のトグルスイッチ。2 択 (JA / EN) をラジオグループとして表し、選択側にサム (背景) をスライドさせる。
// ヘッダーと About の両方で使う。言語状態は I18nProvider が持つ (URL には載せない)。
import { type Lang, useI18n } from "@/i18n";
import styles from "./LangSwitch.module.scss";

const OPTIONS: { lang: Lang; short: string }[] = [
  { lang: "ja", short: "JA" },
  { lang: "en", short: "EN" },
];

export function LangSwitch() {
  const { t, lang, setLang } = useI18n();
  return (
    <div className={styles.switch} role="radiogroup" aria-label={t("lang.label")} data-lang={lang}>
      <span className={styles.thumb} aria-hidden="true" />
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          type="button"
          role="radio"
          aria-checked={lang === o.lang}
          aria-label={t(o.lang === "ja" ? "lang.ja" : "lang.en")}
          lang={o.lang}
          className={styles.option}
          onClick={() => setLang(o.lang)}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
