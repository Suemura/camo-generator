// プリセットの表示メタ。生成パラメータは src/core/camo.js の PRESETS が正本。
// 名称は「〜風」表記 (MARPAT 等は商標。公式図案の複製ではない)。
// 実物リファレンス画像はアプリに同梱しない (refs/ に開発時専用で置く。refs/README.md)。
// 選択 UI (PresetPickerDrawer) は 4 軸のタグ (系統 group / 使用環境 env / 国 country / 年代 era) で絞り込む。

import type { PresetKey } from "@/core/camo.js";
import type { L10n } from "@/i18n/types";

/** 図案の系統 (生成手法・見た目の大分類)。表示順は PRESET_GROUPS */
export type PresetGroup = "woodland" | "desert" | "digital" | "stroke" | "geometric" | "other";

export const PRESET_GROUPS: { key: PresetGroup; label: L10n }[] = [
  { key: "woodland", label: { ja: "ウッドランド系", en: "Woodland" } },
  { key: "desert", label: { ja: "デザート系", en: "Desert" } },
  { key: "digital", label: { ja: "デジタル系", en: "Digital" } },
  { key: "stroke", label: { ja: "ストローク系", en: "Stroke" } },
  { key: "geometric", label: { ja: "幾何 / 直線系", en: "Geometric / linear" } },
  { key: "other", label: { ja: "その他", en: "Other" } },
];

/** 想定する使用環境。実物が配備された地域・地形から付ける (色味の印象ではなく運用実態) */
export type PresetEnv = "forest" | "jungle" | "arid" | "urban" | "marine" | "transitional";

export const ENV_LABEL: Record<PresetEnv, L10n> = {
  forest: { ja: "森林 / 温帯林", en: "Forest / temperate woodland" },
  jungle: { ja: "ジャングル", en: "Jungle" },
  arid: { ja: "砂漠 / 乾燥地", en: "Desert / arid" },
  urban: { ja: "市街地", en: "Urban" },
  marine: { ja: "海上 / 沿岸", en: "Maritime / coastal" },
  transitional: { ja: "汎用 / 移行帯", en: "Universal / transitional" },
};
export const ALL_ENVS = Object.keys(ENV_LABEL) as PresetEnv[];

/** 制式採用年代 (10 年刻み)。note 冒頭の年代表記と一致させる */
export type PresetEra =
  | "1930s"
  | "1940s"
  | "1950s"
  | "1960s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s";

export const ERA_LABEL: Record<PresetEra, L10n> = {
  "1930s": { ja: "1930 年代", en: "1930s" },
  "1940s": { ja: "1940 年代", en: "1940s" },
  "1950s": { ja: "1950 年代", en: "1950s" },
  "1960s": { ja: "1960 年代", en: "1960s" },
  "1980s": { ja: "1980 年代", en: "1980s" },
  "1990s": { ja: "1990 年代", en: "1990s" },
  "2000s": { ja: "2000 年代", en: "2000s" },
  "2010s": { ja: "2010 年代", en: "2010s" },
};
export const ALL_ERAS = Object.keys(ERA_LABEL) as PresetEra[];

export interface PresetMeta {
  /** UI 表示名 (ja は「〜風」、en は "-inspired") */
  label: L10n;
  /** 補足 (年代・色数・形状) */
  note: L10n;
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
    label: { ja: "ウッドランド風 (M81)", en: "Woodland-inspired (M81)" },
    note: { ja: "1981〜 4 色。有機形状", en: "1981– 4 colors. Organic shapes" },
    country: "us",
    group: "woodland",
    env: ["forest"],
    era: "1980s",
    svg: false,
  },
  cce: {
    label: { ja: "CCE 風 (フランス)", en: "CCE-inspired (France)" },
    note: {
      ja: "1990〜 4 色。M81 派生の横長",
      en: "1990– 4 colors. Horizontally stretched M81 derivative",
    },
    country: "fr",
    group: "woodland",
    env: ["forest"],
    era: "1990s",
    svg: false,
  },
  dcu: {
    label: { ja: "3 カラーデザート風 (DCU)", en: "3-Color Desert-inspired (DCU)" },
    note: { ja: "1990〜 3 色。有機形状", en: "1990– 3 colors. Organic shapes" },
    country: "us",
    group: "desert",
    env: ["arid"],
    era: "1990s",
    svg: false,
  },
  dbdu: {
    label: { ja: "6 カラーデザート風 (DBDU)", en: "6-Color Desert-inspired (DBDU)" },
    note: {
      ja: "1981〜 5 色。有機形状 + 小石斑点",
      en: "1981– 5 colors. Organic shapes + pebble spots",
    },
    country: "us",
    group: "desert",
    env: ["arid"],
    era: "1980s",
    svg: false,
  },
  auscam: {
    // DPCU は豪州本土の乾いた低木林を想定した汎用迷彩なので森林 + 移行帯
    label: { ja: "オーストラリア DPCU 風 (Auscam)", en: "Australian DPCU-inspired (Auscam)" },
    note: { ja: "1980 年代〜 5 色。丸い斑点", en: "1980s– 5 colors. Round spots" },
    country: "au",
    group: "woodland",
    env: ["forest", "transitional"],
    era: "1980s",
    svg: false,
  },
  jgsdf2: {
    label: { ja: "陸自迷彩 2 型風", en: "JGSDF Type 2-inspired" },
    note: { ja: "1991〜 4 色。有機形状 + 斑点", en: "1991– 4 colors. Organic shapes + spots" },
    country: "jp",
    group: "woodland",
    env: ["forest"],
    era: "1990s",
    svg: false,
  },
  frogskin: {
    // リバーシブルの表面。太平洋戦線のジャングル用
    label: { ja: "フロッグスキン風 (ジャングル面)", en: "Frog Skin-inspired (jungle side)" },
    note: { ja: "1942〜 5 色。丸い斑点", en: "1942– 5 colors. Round spots" },
    country: "us",
    group: "woodland",
    env: ["jungle", "forest"],
    era: "1940s",
    svg: false,
  },
  frogskin_beach: {
    // 同じ生地の裏面。上陸戦の砂浜・珊瑚礁用
    label: { ja: "フロッグスキン風 (ビーチ面)", en: "Frog Skin-inspired (beach side)" },
    note: {
      ja: "1942〜 4 色。リバーシブルの裏面",
      en: "1942– 4 colors. Reverse side of the reversible fabric",
    },
    country: "us",
    group: "desert",
    env: ["arid"],
    era: "1940s",
    svg: false,
  },
  dpm: {
    label: { ja: "DPM 風 (英国)", en: "DPM-inspired (UK)" },
    note: {
      ja: "1960 年代〜 4 色。筆致状の有機形状",
      en: "1960s– 4 colors. Brushstroke-like organic shapes",
    },
    country: "uk",
    group: "woodland",
    env: ["forest"],
    era: "1960s",
    svg: false,
  },
  ddpm: {
    label: { ja: "デザート DPM 風 (DDPM)", en: "Desert DPM-inspired (DDPM)" },
    note: {
      ja: "1990 年代〜 2 色。サンド地にブラウン",
      en: "1990s– 2 colors. Brown on a sand ground",
    },
    country: "uk",
    group: "desert",
    env: ["arid"],
    era: "1990s",
    svg: false,
  },
  tigerstripe: {
    // 南ベトナム軍が起源で米軍特殊部隊が現地調達して広まった。country は現地製である南ベトナム側を採る
    label: { ja: "タイガーストライプ風", en: "Tigerstripe-inspired" },
    note: {
      ja: "1960 年代〜 4 色。横に流れる縞",
      en: "1960s– 4 colors. Horizontally flowing stripes",
    },
    country: "vn",
    group: "stroke",
    env: ["jungle"],
    era: "1960s",
    svg: false,
  },
  brushstroke: {
    // ローデシア軍が 1965〜1980 に使用。現ジンバブエ国軍にも引き継がれたが、
    // country は制定した国 (ローデシア) の歴史的コードを採る
    label: { ja: "ローデシアン・ブラッシュストローク風", en: "Rhodesian Brushstroke-inspired" },
    note: {
      ja: "1960 年代〜 4 色。太い斜めの筆跡",
      en: "1960s– 4 colors. Broad diagonal brushstrokes",
    },
    country: "rh",
    group: "stroke",
    env: ["jungle", "transitional"],
    era: "1960s",
    svg: false,
  },
  lizard: {
    // タイガーストライプの原型。TAP47 として 1950 年代から 1980 年代まで使われた
    label: { ja: "リザード (TAP47) 風", en: "Lizard-inspired (TAP47)" },
    note: {
      ja: "1950 年代〜 4 色。水平寄りの筆跡",
      en: "1950s– 4 colors. Near-horizontal brushstrokes",
    },
    country: "fr",
    group: "stroke",
    env: ["forest", "transitional"],
    era: "1950s",
    svg: false,
  },
  marpat: {
    // MARPAT の制式採用は 2002 年 (note の「4 色」は色数)
    label: { ja: "デジタル・ウッドランド風", en: "Digital Woodland-inspired" },
    note: { ja: "MARPAT 系 2002〜 4 色。ピクセル", en: "MARPAT family 2002– 4 colors. Pixels" },
    country: "us",
    group: "digital",
    env: ["forest"],
    era: "2000s",
    svg: true,
  },
  marpat_desert: {
    label: { ja: "デジタル・デザート風", en: "Digital Desert-inspired" },
    note: { ja: "MARPAT 系 2002〜 4 色。ピクセル", en: "MARPAT family 2002– 4 colors. Pixels" },
    country: "us",
    group: "digital",
    env: ["arid"],
    era: "2000s",
    svg: true,
  },
  aor1: {
    label: { ja: "AOR1 風 (デザート)", en: "AOR1-inspired (desert)" },
    note: { ja: "海軍 2010 年頃〜 4 色。微細ピクセル", en: "Navy c. 2010– 4 colors. Fine pixels" },
    country: "us",
    group: "digital",
    env: ["arid"],
    era: "2000s",
    svg: false,
  },
  aor2: {
    label: { ja: "AOR2 風 (ウッドランド)", en: "AOR2-inspired (woodland)" },
    note: { ja: "海軍 2010 年頃〜 4 色。微細ピクセル", en: "Navy c. 2010– 4 colors. Fine pixels" },
    country: "us",
    group: "digital",
    env: ["forest", "jungle"],
    era: "2000s",
    svg: false,
  },
  ucp: {
    // UCP は「都市・砂漠・森林のどこでも」を狙って灰緑に振った経緯があるので都市 + 汎用
    label: { ja: "UCP 風 (ACU)", en: "UCP-inspired (ACU)" },
    note: { ja: "陸軍 2004〜 3 色。ピクセル", en: "Army 2004– 3 colors. Pixels" },
    country: "us",
    group: "digital",
    env: ["urban", "transitional"],
    era: "2000s",
    svg: true,
  },
  cadpat: {
    label: { ja: "CADPAT 風 (温帯林)", en: "CADPAT-inspired (temperate woodland)" },
    note: { ja: "1997〜 4 色。緑 3 段のピクセル", en: "1997– 4 colors. Pixels in 3 greens" },
    country: "ca",
    group: "digital",
    env: ["forest"],
    era: "1990s",
    svg: true,
  },
  pla07: {
    label: { ja: "07 式 通用迷彩風", en: "Type 07 Universal-inspired (PLA)" },
    note: { ja: "2007〜 4 色。粗いピクセル", en: "2007– 4 colors. Coarse pixels" },
    country: "cn",
    group: "digital",
    env: ["forest", "transitional"],
    era: "2000s",
    svg: true,
  },
  pla07_ocean: {
    label: { ja: "07 式 海洋迷彩風 (海軍陸戦隊)", en: "Type 07 Ocean-inspired (PLA Marines)" },
    note: {
      ja: "2007〜 4 色。ブルー地の粗いピクセル",
      en: "2007– 4 colors. Coarse pixels on a blue ground",
    },
    country: "cn",
    group: "digital",
    env: ["marine"],
    era: "2000s",
    svg: true,
  },
  emr: {
    label: { ja: "EMR 風 (デジタルフローラ)", en: "EMR-inspired (Digital Flora)" },
    note: {
      ja: "2008〜 4 色。縦長の微細ピクセル",
      en: "2008– 4 colors. Vertically elongated fine pixels",
    },
    country: "ru",
    group: "digital",
    env: ["forest"],
    era: "2000s",
    svg: true,
  },
  splinter: {
    // スプリンター系の始祖。制定は 1931 年 (Splittermuster 31)、雨線は 1938 年以降の版
    label: { ja: "スプリンター風 (Splittertarn)", en: "Splinter-inspired (Splittertarn)" },
    note: {
      ja: "1931〜 3 色。直線多角形 + 雨線",
      en: "1931– 3 colors. Straight-edged polygons + rain strokes",
    },
    country: "de",
    group: "geometric",
    env: ["forest", "transitional"],
    era: "1930s",
    svg: false,
  },
  strichtarn: {
    // NVA (東ドイツ国家人民軍) の Strichtarn。2 色の縦ダッシュのみの図案。
    // ストロークで構成される図案なので group は stroke (ブラッシュストロークと同じ軸)
    label: { ja: "シュトリヒタルン風 (東ドイツ)", en: "Strichtarn-inspired (East Germany)" },
    note: {
      ja: "1965〜1990 2 色。細い縦ダッシュ (レインパターン)",
      en: "1965–1990 2 colors. Thin vertical dashes (rain pattern)",
    },
    country: "dd",
    group: "stroke",
    env: ["forest", "transitional"],
    era: "1960s",
    svg: false,
  },
  berezka: {
    // 色で溶け込むのではなく明色の塊で人型シルエットを破断させる設計。
    // デジタル系ではなく粗いステンシル版由来の階段なので group は other
    label: { ja: "ベリョースカ風 (KLMK)", en: "Berezka-inspired (KLMK)" },
    note: {
      ja: "1957〜 2 色。階段状の葉形シルエット",
      en: "1957– 2 colors. Stair-stepped leaf silhouettes",
    },
    country: "ru",
    group: "other",
    env: ["forest"],
    era: "1950s",
    svg: true,
  },
  nwu1: {
    label: { ja: "NWU Type I 風 (米海軍)", en: "NWU Type I-inspired (US Navy)" },
    note: {
      ja: "2008〜2019 4 色。青灰の粗いピクセル",
      en: "2008–2019 4 colors. Coarse blue-grey pixels",
    },
    country: "us",
    group: "digital",
    env: ["urban", "transitional"],
    era: "2000s",
    svg: true,
  },
  mm14: {
    label: { ja: "MM-14 風 (ウクライナ)", en: "MM-14-inspired (Ukraine)" },
    note: {
      ja: "2014〜 5 色。明度順に入れ子になる粗いピクセル",
      en: "2014– 5 colors. Coarse pixels nested in luminance order",
    },
    country: "ua",
    group: "digital",
    env: ["transitional", "arid"],
    era: "2010s",
    svg: true,
  },
  flecktarn: {
    label: { ja: "フレックターン風", en: "Flecktarn-inspired" },
    note: {
      ja: "1990〜 5 色。融合した丸い小斑と暗色の偏在",
      en: "1990– 5 colors. Merged round dots with clustered dark areas",
    },
    country: "de",
    group: "woodland",
    env: ["forest", "transitional"],
    era: "1990s",
    svg: false,
  },
  wuestentarn: {
    // Wikipedia が「しばしば誤ってトロペンターンと呼ばれる」と注記する 3 色版。
    // 参照スウォッチの版数 (3) に従い 3-Farben-Tarndruck として扱う
    label: { ja: "ヴュステンターン風 (3 色デザート)", en: "Wüstentarn-inspired (3-color desert)" },
    note: {
      ja: "1993〜 3 色。タン地にグリーンの塊とブラウンの斑",
      en: "1993– 3 colors. Green blobs and brown spots on a tan ground",
    },
    country: "de",
    group: "desert",
    env: ["arid"],
    era: "1990s",
    svg: false,
  },
  // ---- フレックターン図案の配色替え (形状は flecktarn と共有) ----
  tibetarn: {
    label: { ja: "Tibetarn 風 (中国 高原)", en: "Tibetarn-inspired (China, plateau)" },
    note: {
      ja: "2000 年代〜 5 色。独図案の高原配色",
      en: "2000s– 5 colors. Plateau colorway of the German pattern",
    },
    country: "cn",
    group: "desert",
    env: ["arid", "transitional"],
    era: "2000s",
    svg: false,
  },
  arid_flecktarn: {
    // Mil-Tec の商用製品で軍の制式採用はない。country は製造元のドイツ
    label: { ja: "Arid フレックターン風 (商用)", en: "Arid Flecktarn-inspired (commercial)" },
    note: {
      ja: "2013〜 5 色。MultiCam 寄りの配色",
      en: "2013– 5 colors. MultiCam-leaning colorway",
    },
    country: "de",
    group: "desert",
    env: ["arid", "transitional"],
    era: "2000s",
    svg: false,
  },
  // ---- M/84 系 (独 5 版を 3 群に統合した配色替え) ----
  m84: {
    label: { ja: "M/84 風 (デンマーク)", en: "M/84-inspired (Denmark)" },
    note: {
      ja: "1984〜2018 3 色。独図案を 3 色に統合",
      en: "1984–2018 3 colors. German pattern merged into 3 colors",
    },
    country: "dk",
    group: "woodland",
    env: ["forest"],
    era: "1980s",
    svg: false,
  },
  m01dk: {
    label: { ja: "M/01 デザート風 (デンマーク)", en: "M/01 Desert-inspired (Denmark)" },
    note: { ja: "2001〜 3 色。M/84 の砂漠配色", en: "2001– 3 colors. Desert colorway of M/84" },
    country: "dk",
    group: "desert",
    env: ["arid"],
    era: "2000s",
    svg: false,
  },
  t99dk: {
    label: { ja: "T/99 デザート風 (デンマーク)", en: "T/99 Desert-inspired (Denmark)" },
    note: { ja: "1999 3 色。M/01 前段の試験型", en: "1999 3 colors. Trial pattern preceding M/01" },
    country: "dk",
    group: "desert",
    env: ["arid"],
    era: "1990s",
    svg: false,
  },
  flectar_d: {
    label: { ja: "Flectar-D 風 (ロシア)", en: "Flectar-D-inspired (Russia)" },
    note: {
      ja: "2006〜 3 色。M/84 の明色地配色",
      en: "2006– 3 colors. Light-ground colorway of M/84",
    },
    country: "ru",
    group: "woodland",
    env: ["forest", "transitional"],
    era: "2000s",
    svg: false,
  },
  schneetarn: {
    // TacGear の商用スノー迷彩。仏 13e RDP が雪中で使用する。country は製造元のドイツ
    label: { ja: "Schneetarn 風 (スノー)", en: "Schneetarn-inspired (snow)" },
    note: { ja: "3 色。白地に黒とオリーブ", en: "3 colors. Black and olive on white" },
    country: "de",
    group: "other",
    env: ["transitional"],
    era: "2000s",
    svg: false,
  },
  m84urban: {
    label: { ja: "M/84 アーバン風", en: "M/84 Urban-inspired" },
    note: {
      ja: "3 色。無彩色 3 段の市街地配色",
      en: "3 colors. Urban colorway in 3 neutral greys",
    },
    country: "dk",
    group: "other",
    env: ["urban"],
    era: "2000s",
    svg: false,
  },
};

export const PRESET_KEYS = Object.keys(PRESET_META) as PresetKey[];

/** 実際に使われている国コード (PRESET_GROUPS と同じくタグ軸の並び順に使う) */
export const ALL_PRESET_COUNTRIES = Array.from(
  new Set(PRESET_KEYS.map((k) => PRESET_META[k].country)),
);

/** 国コードの表示名 (未知のコードはそのまま返す) */
