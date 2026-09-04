// 選択 UI (PresetPickerDrawer) はタグとサムネイルが全プリセットに揃っている前提で作られている。
// プリセットを足したときの付け忘れ (タグ無しで絞り込みから消える / 画像が 404 になる) を検出する。
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRESETS } from "../src/core/camo.js";
import { COUNTRY_LABEL } from "../src/data/countries";
import {
  ALL_ENVS,
  ALL_ERAS,
  PRESET_GROUPS,
  PRESET_KEYS,
  PRESET_META,
} from "../src/data/presets-meta";

const THUMB_DIR = path.resolve(import.meta.dirname, "../public/thumbs");

describe("PRESET_META", () => {
  it("生成コアの PRESETS と過不足なく一致する", () => {
    expect([...PRESET_KEYS].sort()).toEqual(Object.keys(PRESETS).sort());
  });

  it.each(PRESET_KEYS)("%s に 4 軸のタグが揃っている", (key) => {
    const m = PRESET_META[key];
    expect(m.env.length).toBeGreaterThan(0);
    for (const e of m.env) expect(ALL_ENVS).toContain(e);
    expect(ALL_ERAS).toContain(m.era);
    expect(COUNTRY_LABEL[m.country]).toBeTruthy();
    expect(PRESET_GROUPS.map((g) => g.key)).toContain(m.group);
  });
});

describe("サムネイル (public/thumbs)", () => {
  const files = fs.readdirSync(THUMB_DIR);

  it.each(PRESET_KEYS)("%s.jpg が存在する", (key) => {
    // 欠けていたら node tools/gen-thumbs.mjs (docs/04-add-preset.md)
    expect(files).toContain(`${key}.jpg`);
  });

  it("削除済みプリセットの孤児ファイルが残っていない", () => {
    const orphans = files.filter(
      (f) => !(PRESET_KEYS as string[]).includes(f.replace(/\.jpg$/, "")),
    );
    expect(orphans).toEqual([]);
  });
});
