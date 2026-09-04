// パレットライブラリ (docs/design/palette-library.json のコピー)。規格名ベース、模型塗料品番は note のみ。
import raw from "./palette-library.json";

export type Hue = "green" | "brown" | "tan" | "grey" | "black" | "other";

export interface LibraryColor {
  id: string;
  name: string;
  std: string;
  code: string;
  hex: string;
  tags: { hue: Hue; use: string[]; country: string[] };
  note?: string;
  source?: string;
}

export const LIBRARY: LibraryColor[] = raw as LibraryColor[];

export const HUE_LABEL: Record<Hue, string> = {
  green: "グリーン",
  brown: "ブラウン",
  tan: "タン / サンド",
  grey: "グレー",
  black: "ブラック",
  other: "その他",
};

export { COUNTRY_LABEL } from "./countries";

export const USE_LABEL: Record<string, string> = {
  tank: "戦車 / 車両",
  aircraft: "航空機",
  ship: "艦船",
  uniform: "被服 / 装具",
  "camo-m81": "M81 ウッドランド",
  "camo-marpat": "MARPAT 系",
  "camo-aor": "AOR 系",
  "camo-ucp": "UCP",
  "camo-multicam": "MultiCam 系",
  "camo-flecktarn": "フレクター",
  "camo-dpm": "DPM",
  "camo-ddpm": "デザート DPM (DDPM)",
  "camo-3color-desert": "3 色デザート",
  "camo-6color-desert": "6 色デザート (チョコチップ)",
  "camo-jgsdf2": "陸自迷彩 2 型",
  "camo-auscam": "オーストラリア DPCU",
  "camo-cadpat": "CADPAT",
  "camo-pla07": "07 式",
  "camo-emr": "EMR",
  "camo-frogskin": "フロッグスキン (M1942)",
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
