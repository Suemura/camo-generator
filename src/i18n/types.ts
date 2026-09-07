// 言語まわりの型。DOM に依存しないので data/ や tests からも import できる。
export type Lang = "ja" | "en";
export const LANGS: readonly Lang[] = ["ja", "en"];

/** データ側ラベル (プリセット名・国名・用途名など) の二言語表記。UI 文言は src/i18n/ja.ts / en.ts */
export interface L10n {
  ja: string;
  en: string;
}

export const pick = (l: L10n, lang: Lang): string => l[lang];

/** ラベル表が無いキー (未登録の国コード等) はキーをそのまま出す */
export const pickOr = (l: L10n | undefined, lang: Lang, fallback: string): string =>
  l ? l[lang] : fallback;

export const isLang = (v: unknown): v is Lang => v === "ja" || v === "en";
