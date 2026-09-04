// プリセットの表示メタ。生成パラメータは src/core/camo.js の PRESETS が正本。
// 名称は「〜風」表記 (MARPAT 等は商標。公式図案の複製ではない)。
// 実物リファレンス画像はアプリに同梱しない (refs/ に開発時専用で置く。refs/README.md)。
// 選択 UI (PresetPickerDrawer) は 4 軸のタグ (系統 group / 使用環境 env / 国 country / 年代 era) で絞り込む。

import type { PresetKey } from "@/core/camo.js";
import { COUNTRY_LABEL } from "@/data/countries";

/** 図案の系統 (生成手法・見た目の大分類)。表示順は PRESET_GROUPS */
export type PresetGroup = "woodland" | "desert" | "digital" | "stroke" | "other";

export const PRESET_GROUPS: { key: PresetGroup; label: string }[] = [
  { key: "woodland", label: "ウッドランド系" },
  { key: "desert", label: "デザート系" },
  { key: "digital", label: "デジタル系" },
  { key: "stroke", label: "ストローク系" },
  { key: "other", label: "その他" },
];

/** 想定する使用環境。実物が配備された地域・地形から付ける (色味の印象ではなく運用実態) */
export type PresetEnv = "forest" | "jungle" | "arid" | "urban" | "transitional";

export const ENV_LABEL: Record<PresetEnv, string> = {
  forest: "森林 / 温帯林",
  jungle: "ジャングル",
  arid: "砂漠 / 乾燥地",
  urban: "市街地",
  transitional: "汎用 / 移行帯",
};
export const ALL_ENVS = Object.keys(ENV_LABEL) as PresetEnv[];

/** 制式採用年代 (10 年刻み)。note 冒頭の年代表記と一致させる */
export type PresetEra = "1940s" | "1960s" | "1980s" | "1990s" | "2000s";

export const ERA_LABEL: Record<PresetEra, string> = {
  "1940s": "1940 年代",
  "1960s": "1960 年代",
  "1980s": "1980 年代",
  "1990s": "1990 年代",
  "2000s": "2000 年代",
};
export const ALL_ERAS = Object.keys(ERA_LABEL) as PresetEra[];

export interface PresetMeta {
  /** UI 表示名 */
  label: string;
  /** 補足 (年代・色数・形状) */
  note: string;
  /** 由来国。COUNTRY_LABEL のキー */
  country: string;
  /** 選択 UI のグループ (系統軸) */
  group: PresetGroup;
  /** 使用環境 (1 件以上) */
  env: PresetEnv[];
  /** 制式採用年代 */
  era: PresetEra;
  /** SVG 出力可否 (セルグリッド系のみ) */
  svg: boolean;
}

export const PRESET_META: Record<PresetKey, PresetMeta> = {
  woodland: {
    label: "ウッドランド風 (M81)",
    note: "1981〜 4 色。有機形状",
    country: "us",
    group: "woodland",
    env: ["forest"],
    era: "1980s",
    svg: false,
  },
  cce: {
    label: "CCE 風 (フランス)",
    note: "1990〜 4 色。M81 派生の横長",
    country: "fr",
    group: "woodland",
    env: ["forest"],
    era: "1990s",
    svg: false,
  },
  dcu: {
    label: "3 カラーデザート風 (DCU)",
    note: "1990〜 3 色。有機形状",
    country: "us",
    group: "desert",
    env: ["arid"],
    era: "1990s",
    svg: false,
  },
  dbdu: {
    label: "6 カラーデザート風 (DBDU)",
    note: "1981〜 5 色。有機形状 + 小石斑点",
    country: "us",
    group: "desert",
    env: ["arid"],
    era: "1980s",
    svg: false,
  },
  auscam: {
    // DPCU は豪州本土の乾いた低木林を想定した汎用迷彩なので森林 + 移行帯
    label: "オーストラリア DPCU 風 (Auscam)",
    note: "1980 年代〜 5 色。丸い斑点",
    country: "au",
    group: "woodland",
    env: ["forest", "transitional"],
    era: "1980s",
    svg: false,
  },
  jgsdf2: {
    label: "陸自迷彩 2 型風",
    note: "1991〜 4 色。有機形状 + 斑点",
    country: "jp",
    group: "woodland",
    env: ["forest"],
    era: "1990s",
    svg: false,
  },
  frogskin: {
    // リバーシブルの表面。太平洋戦線のジャングル用
    label: "フロッグスキン風 (ジャングル面)",
    note: "1942〜 5 色。丸い斑点",
    country: "us",
    group: "woodland",
    env: ["jungle", "forest"],
    era: "1940s",
    svg: false,
  },
  frogskin_beach: {
    // 同じ生地の裏面。上陸戦の砂浜・珊瑚礁用
    label: "フロッグスキン風 (ビーチ面)",
    note: "1942〜 4 色。リバーシブルの裏面",
    country: "us",
    group: "desert",
    env: ["arid"],
    era: "1940s",
    svg: false,
  },
  dpm: {
    label: "DPM 風 (英国)",
    note: "1960 年代〜 4 色。筆致状の有機形状",
    country: "uk",
    group: "woodland",
    env: ["forest"],
    era: "1960s",
    svg: false,
  },
  ddpm: {
    label: "デザート DPM 風 (DDPM)",
    note: "1990 年代〜 2 色。サンド地にブラウン",
    country: "uk",
    group: "desert",
    env: ["arid"],
    era: "1990s",
    svg: false,
  },
  marpat: {
    // MARPAT の制式採用は 2002 年 (note の「4 色」は色数)
    label: "デジタル・ウッドランド風",
    note: "MARPAT 系 2002〜 4 色。ピクセル",
    country: "us",
    group: "digital",
    env: ["forest"],
    era: "2000s",
    svg: true,
  },
  marpat_desert: {
    label: "デジタル・デザート風",
    note: "MARPAT 系 2002〜 4 色。ピクセル",
    country: "us",
    group: "digital",
    env: ["arid"],
    era: "2000s",
    svg: true,
  },
  aor1: {
    label: "AOR1 風 (デザート)",
    note: "海軍 2010 年頃〜 4 色。微細ピクセル",
    country: "us",
    group: "digital",
    env: ["arid"],
    era: "2000s",
    svg: false,
  },
  aor2: {
    label: "AOR2 風 (ウッドランド)",
    note: "海軍 2010 年頃〜 4 色。微細ピクセル",
    country: "us",
    group: "digital",
    env: ["forest", "jungle"],
    era: "2000s",
    svg: false,
  },
  ucp: {
    // UCP は「都市・砂漠・森林のどこでも」を狙って灰緑に振った経緯があるので都市 + 汎用
    label: "UCP 風 (ACU)",
    note: "陸軍 2004〜 3 色。ピクセル",
    country: "us",
    group: "digital",
    env: ["urban", "transitional"],
    era: "2000s",
    svg: true,
  },
  cadpat: {
    label: "CADPAT 風 (温帯林)",
    note: "1997〜 4 色。緑 3 段のピクセル",
    country: "ca",
    group: "digital",
    env: ["forest"],
    era: "1990s",
    svg: true,
  },
  pla07: {
    label: "07 式 通用迷彩風",
    note: "2007〜 4 色。粗いピクセル",
    country: "cn",
    group: "digital",
    env: ["forest", "transitional"],
    era: "2000s",
    svg: true,
  },
  emr: {
    label: "EMR 風 (デジタルフローラ)",
    note: "2008〜 4 色。縦長の微細ピクセル",
    country: "ru",
    group: "digital",
    env: ["forest"],
    era: "2000s",
    svg: true,
  },
};

export const PRESET_KEYS = Object.keys(PRESET_META) as PresetKey[];

/** 実際に使われている国コード (PRESET_GROUPS と同じくタグ軸の並び順に使う) */
export const ALL_PRESET_COUNTRIES = Array.from(
  new Set(PRESET_KEYS.map((k) => PRESET_META[k].country)),
);

/** 国コードの表示名 (未知のコードはそのまま返す) */
export const countryLabel = (code: string) => COUNTRY_LABEL[code] ?? code;
