// src/core/camo.js の PRESETS[*].colors[*].name (日本語の色役割名) → 英語名。
// camo.js は browser / Node 共用の依存ゼロモジュールなので、翻訳表はこちら側に置く。
// 網羅性は tests/i18n-data.test.ts が PRESETS を走査して検査する (孤児エントリも検出)。
import type { Lang } from "@/i18n/types";

export const COLOR_ROLE_EN: Record<string, string> = {
  サンド: "Sand",
  グリーン: "Green",
  ブラウン: "Brown",
  ブラック: "Black",
  ライトカーキ: "Light Khaki",
  タン: "Tan",
  ライトグリーン: "Light Green",
  ダークグリーン: "Dark Green",
  ブラウンブラック: "Brown Black",
  ライトサンド: "Light Sand",
  ダークブラウン: "Dark Brown",
  ライトタン: "Light Tan",
  カーキ: "Khaki",
  デザートサンド: "Desert Sand",
  アーバングレー: "Urban Grey",
  フォリッジグリーン: "Foliage Green",
  ミッドグリーン: "Mid Green",
  ライトグレー: "Light Grey",
  ブルー: "Blue",
  ホワイトグレー: "White Grey",
  オリーブグリーン: "Olive Green",
  ネイビーブルー: "Navy Blue",
  グレー: "Grey",
  ライトブルー: "Light Blue",
  ダークネイビー: "Dark Navy",
  ペールグリーン: "Pale Green",
  ダークオリーブ: "Dark Olive",
  ライトブラウン: "Light Brown",
  ペールタン: "Pale Tan",
  小石ホワイト: "Pebble White",
  ライム: "Lime",
  クリーム: "Cream",
  オレンジブラウン: "Orange Brown",
  ミッドブラウン: "Mid Brown",
  グレーベージュ: "Grey Beige",
  レッドブラウン: "Red Brown",
  ペールグレー: "Pale Grey",
  ペールブルーグレー: "Pale Blue Grey",
  ペールサンド: "Pale Sand",
  ミッドオリーブ: "Mid Olive",
  セージグリーン: "Sage Green",
  オフホワイト: "Off White",
  ピンクブラウン: "Pink Brown",
  ペールイエロー: "Pale Yellow",
  ホワイト: "White",
  ミッドグレー: "Mid Grey",
  ダークグレー: "Dark Grey",
  チャコールグレー: "Charcoal Grey",
};

/** 色役割名の表示。en で未定義なら ja 名をそのまま返す (URL 由来のカスタム名など) */
export const colorRole = (name: string, lang: Lang): string =>
  lang === "en" ? (COLOR_ROLE_EN[name] ?? name) : name;
