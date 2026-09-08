// パレットライブラリ。規格名ベース、模型塗料品番は note のみ。出典は各エントリの source と docs/design/palette-library-sources.md。
import type { L10n, Lang } from "@/i18n/types";
import raw from "./palette-library.json";

export type Hue = "green" | "brown" | "tan" | "grey" | "blue" | "black" | "other";

export interface LibraryColor {
  id: string;
  name: string;
  std: string;
  code: string;
  hex: string;
  tags: { hue: Hue; use: string[]; country: string[] };
  note?: string;
  /** 日本語を含む name / std / code / note の英語版。日本語を含まないフィールドには付けない (tests/i18n-data.test.ts) */
  nameEn?: string;
  stdEn?: string;
  codeEn?: string;
  noteEn?: string;
  source?: string;
}

/** 表示用の name / std / code / note を言語で選ぶ。en 版が無いフィールドは元の値 (元が英語) */
export function libraryLabel(c: LibraryColor, lang: Lang) {
  const en = lang === "en";
  return {
    name: (en && c.nameEn) || c.name,
    std: (en && c.stdEn) || c.std,
    code: (en && c.codeEn) || c.code,
    note: en ? (c.noteEn ?? c.note) : c.note,
  };
}

export const LIBRARY: LibraryColor[] = raw as LibraryColor[];

export const HUE_LABEL: Record<Hue, L10n> = {
  green: { ja: "グリーン", en: "Green" },
  brown: { ja: "ブラウン", en: "Brown" },
  tan: { ja: "タン / サンド", en: "Tan / sand" },
  grey: { ja: "グレー", en: "Grey" },
  blue: { ja: "ブルー", en: "Blue" },
  black: { ja: "ブラック", en: "Black" },
  other: { ja: "その他", en: "Other" },
};

export { COUNTRY_LABEL } from "./countries";

export const USE_LABEL: Record<string, L10n> = {
  tank: { ja: "戦車 / 車両", en: "Tanks / vehicles" },
  aircraft: { ja: "航空機", en: "Aircraft" },
  ship: { ja: "艦船", en: "Ships" },
  uniform: { ja: "被服 / 装具", en: "Uniforms / gear" },
  "camo-m81": { ja: "M81 ウッドランド", en: "M81 Woodland" },
  "camo-marpat": { ja: "MARPAT 系", en: "MARPAT family" },
  "camo-aor": { ja: "AOR 系", en: "AOR family" },
  "camo-ucp": { ja: "UCP", en: "UCP" },
  "camo-multicam": { ja: "MultiCam 系", en: "MultiCam family" },
  "camo-flecktarn": { ja: "フレックターン", en: "Flecktarn" },
  "camo-wuestentarn": { ja: "ヴュステンターン (3 色デザート)", en: "Wüstentarn (3-color desert)" },
  "camo-tibetarn": { ja: "Tibetarn (中国 高原)", en: "Tibetarn (China, plateau)" },
  "camo-m84": { ja: "M/84 系 (デンマーク・ロシア)", en: "M/84 family (Denmark / Russia)" },
  "camo-dpm": { ja: "DPM", en: "DPM" },
  "camo-ddpm": { ja: "デザート DPM (DDPM)", en: "Desert DPM (DDPM)" },
  "camo-3color-desert": { ja: "3 色デザート", en: "3-color desert" },
  "camo-6color-desert": {
    ja: "6 色デザート (チョコチップ)",
    en: "6-color desert (chocolate chip)",
  },
  "camo-jgsdf2": { ja: "陸自迷彩 2 型", en: "JGSDF Type 2" },
  "camo-auscam": { ja: "オーストラリア DPCU", en: "Australian DPCU" },
  "camo-cadpat": { ja: "CADPAT", en: "CADPAT" },
  "camo-pla07": { ja: "07 式", en: "Type 07" },
  "camo-pla07-ocean": { ja: "07 式 海洋", en: "Type 07 Ocean" },
  "camo-emr": { ja: "EMR", en: "EMR" },
  "camo-frogskin": { ja: "フロッグスキン (M1942)", en: "Frog Skin (M1942)" },
  "camo-tigerstripe": { ja: "タイガーストライプ", en: "Tigerstripe" },
  "camo-berezka": { ja: "ベリョースカ (KLMK)", en: "Berezka (KLMK)" },
  "camo-nwu1": { ja: "NWU Type I", en: "NWU Type I" },
  "camo-brushstroke": { ja: "ローデシアン・ブラッシュストローク", en: "Rhodesian Brushstroke" },
  "camo-lizard": { ja: "リザード (TAP47)", en: "Lizard (TAP47)" },
  "camo-splinter": { ja: "スプリンター (Splittertarn)", en: "Splinter (Splittertarn)" },
  "camo-strichtarn": { ja: "シュトリヒタルン (Strichtarn)", en: "Strichtarn" },
  "camo-cce": { ja: "CCE (フランス)", en: "CCE (France)" },
};

const uniq = (xs: string[]) => Array.from(new Set(xs));
export const ALL_COUNTRIES = uniq(LIBRARY.flatMap((c) => c.tags.country));
export const ALL_USES = uniq(LIBRARY.flatMap((c) => c.tags.use));

const BY_ID = new Map(LIBRARY.map((c) => [c.id, c]));
const BY_HEX = new Map<string, LibraryColor>();
for (const c of LIBRARY) if (!BY_HEX.has(c.hex.toLowerCase())) BY_HEX.set(c.hex.toLowerCase(), c);

export function libraryById(id: string | undefined): LibraryColor | undefined {
  return id ? BY_ID.get(id) : undefined;
}
/** hex から逆引き (同 hex が複数ある場合は最初の 1 件)。URL には hex しか無いので復元用 */
export function libraryByHex(hex: string): LibraryColor | undefined {
  return BY_HEX.get(hex.toLowerCase());
}
