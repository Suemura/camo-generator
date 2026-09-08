// 国コード → 表示名。カラーライブラリ (palette.ts) と迷彩プリセット (presets-meta.ts) で共用する。
// palette-library.json に依存しない小モジュールとして切り出してあるのは、presets-meta.ts 経由で
// 100 色以上の JSON が初期バンドルに載るのを避けるため。
import type { L10n } from "@/i18n/types";

export const COUNTRY_LABEL: Record<string, L10n> = {
  us: { ja: "米国", en: "USA" },
  ru: { ja: "ソ連 / ロシア", en: "USSR / Russia" },
  ca: { ja: "カナダ", en: "Canada" },
  cn: { ja: "中国", en: "China" },
  uk: { ja: "英国", en: "UK" },
  de: { ja: "ドイツ", en: "Germany" },
  jp: { ja: "日本", en: "Japan" },
  au: { ja: "オーストラリア", en: "Australia" },
  fr: { ja: "フランス", en: "France" },
  it: { ja: "イタリア", en: "Italy" },
  il: { ja: "イスラエル", en: "Israel" },
  vn: { ja: "ベトナム", en: "Vietnam" },
  dk: { ja: "デンマーク", en: "Denmark" },
  // ISO 3166-1 から削除されたコード。迷彩を制定した当時の国名で示す (rh: 現ジンバブエ、dd: 東ドイツ)
  rh: { ja: "ローデシア", en: "Rhodesia" },
  dd: { ja: "東ドイツ", en: "East Germany" },
  other: { ja: "その他", en: "Other" },
};
