// プリセットの表示メタ。生成パラメータは src/core/camo.js の PRESETS が正本。
// 名称は「〜風」表記 (MARPAT 等は商標。公式図案の複製ではない)。
import type { PresetKey } from "@/core/camo.js";

export interface PresetMeta {
  /** UI 表示名 */
  label: string;
  /** 補足 (系統・由来) */
  note: string;
  /** 実物リファレンス画像キー (src/data/refs.js) */
  ref: string;
  /** SVG 出力可否 (セルグリッド系のみ) */
  svg: boolean;
}

export const PRESET_META: Record<PresetKey, PresetMeta> = {
  woodland: {
    label: "ウッドランド風 (M81)",
    note: "米軍 1981〜 4 色。有機形状",
    ref: "m81",
    svg: false,
  },
  marpat: {
    label: "デジタル・ウッドランド風",
    note: "MARPAT 系 4 色。ピクセル",
    ref: "marpat",
    svg: true,
  },
  marpat_desert: {
    label: "デジタル・デザート風",
    note: "MARPAT 系 4 色。ピクセル",
    ref: "marpat_desert",
    svg: true,
  },
  aor1: { label: "AOR1 風 (デザート)", note: "米海軍 4 色。微細ピクセル", ref: "aor1", svg: false },
  aor2: {
    label: "AOR2 風 (ウッドランド)",
    note: "米海軍 4 色。微細ピクセル",
    ref: "aor2",
    svg: false,
  },
  ucp: { label: "UCP 風 (ACU)", note: "米陸軍 2004〜 3 色。ピクセル", ref: "ucp", svg: true },
};

export const PRESET_KEYS = Object.keys(PRESET_META) as PresetKey[];
