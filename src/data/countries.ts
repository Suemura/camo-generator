// 国コード → 表示名。カラーライブラリ (palette.ts) と迷彩プリセット (presets-meta.ts) で共用する。
// palette-library.json に依存しない小モジュールとして切り出してあるのは、presets-meta.ts 経由で
// 100 色以上の JSON が初期バンドルに載るのを避けるため。
export const COUNTRY_LABEL: Record<string, string> = {
  us: "米国",
  ru: "ソ連 / ロシア",
  ca: "カナダ",
  cn: "中国",
  uk: "英国",
  de: "ドイツ",
  jp: "日本",
  au: "オーストラリア",
  fr: "フランス",
  it: "イタリア",
  il: "イスラエル",
  other: "その他",
};
