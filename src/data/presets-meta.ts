// プリセットの表示メタ。生成パラメータは src/core/camo.js の PRESETS が正本。
// 名称は「〜風」表記 (MARPAT 等は商標。公式図案の複製ではない)。
// 実物リファレンス画像はアプリに同梱しない (refs/ に開発時専用で置く。refs/README.md)。
import type { PresetKey } from "@/core/camo.js";

/** 選択 UI の見出しグループ (系統別)。表示順は PRESET_GROUPS */
export type PresetGroup = "woodland" | "desert" | "digital" | "stroke" | "other";

export const PRESET_GROUPS: { key: PresetGroup; label: string }[] = [
  { key: "woodland", label: "ウッドランド系" },
  { key: "desert", label: "デザート系" },
  { key: "digital", label: "デジタル系" },
  { key: "stroke", label: "ストローク系" },
  { key: "other", label: "その他" },
];

export interface PresetMeta {
  /** UI 表示名 */
  label: string;
  /** 補足 (年代・色数・形状) */
  note: string;
  /** 由来国 (表示用) */
  country: string;
  /** 選択 UI のグループ */
  group: PresetGroup;
  /** SVG 出力可否 (セルグリッド系のみ) */
  svg: boolean;
}

export const PRESET_META: Record<PresetKey, PresetMeta> = {
  woodland: {
    label: "ウッドランド風 (M81)",
    note: "1981〜 4 色。有機形状",
    country: "米国",
    group: "woodland",
    svg: false,
  },
  dcu: {
    label: "3 カラーデザート風 (DCU)",
    note: "1990〜 3 色。有機形状",
    country: "米国",
    group: "desert",
    svg: false,
  },
  jgsdf2: {
    label: "陸自迷彩 2 型風",
    note: "1991〜 4 色。有機形状 + 斑点",
    country: "日本",
    group: "woodland",
    svg: false,
  },
  marpat: {
    label: "デジタル・ウッドランド風",
    note: "MARPAT 系 4 色。ピクセル",
    country: "米国",
    group: "digital",
    svg: true,
  },
  marpat_desert: {
    label: "デジタル・デザート風",
    note: "MARPAT 系 4 色。ピクセル",
    country: "米国",
    group: "digital",
    svg: true,
  },
  aor1: {
    label: "AOR1 風 (デザート)",
    note: "海軍 4 色。微細ピクセル",
    country: "米国",
    group: "digital",
    svg: false,
  },
  aor2: {
    label: "AOR2 風 (ウッドランド)",
    note: "海軍 4 色。微細ピクセル",
    country: "米国",
    group: "digital",
    svg: false,
  },
  ucp: {
    label: "UCP 風 (ACU)",
    note: "陸軍 2004〜 3 色。ピクセル",
    country: "米国",
    group: "digital",
    svg: true,
  },
};

export const PRESET_KEYS = Object.keys(PRESET_META) as PresetKey[];
