// データ層の二言語ラベル (L10n) が全項目で ja / en とも埋まっていることを検査する。
// 消費側は pick(l, lang) で片方を取り出すだけなので、欠けは表示の空白として現れる。
// ここで先に落として、プリセット・色・用途を足したときの英訳漏れを検出する。
import { describe, expect, it } from "vitest";
import { PRESETS } from "../src/core/camo.js";
import { COUNTRY_LABEL } from "../src/data/countries";
import { HUE_LABEL, LIBRARY, USE_LABEL } from "../src/data/palette";
import { ENV_LABEL, ERA_LABEL, PRESET_GROUPS } from "../src/data/presets-meta";
import { COLOR_ROLE_EN, colorRole } from "../src/i18n/color-roles";
import type { L10n } from "../src/i18n/types";
import { LANGS } from "../src/i18n/types";

const expectL10n = (l: L10n) => {
  for (const lang of LANGS) expect(l[lang].trim()).not.toBe("");
};

describe("色役割名 (color-roles)", () => {
  const names = Array.from(
    new Set(Object.values(PRESETS).flatMap((p) => p.colors.map((c) => c.name))),
  );

  it.each(names)("%s に英語名がある", (name) => {
    expect(COLOR_ROLE_EN[name]?.trim()).toBeTruthy();
    expect(colorRole(name, "en")).toBe(COLOR_ROLE_EN[name]);
    expect(colorRole(name, "ja")).toBe(name);
  });

  it("PRESETS に無い孤児エントリが残っていない", () => {
    const orphans = Object.keys(COLOR_ROLE_EN).filter((k) => !names.includes(k));
    expect(orphans).toEqual([]);
  });

  it("未定義の名前は en でもそのまま返す", () => {
    expect(colorRole("カスタム色", "en")).toBe("カスタム色");
  });
});

describe("タグ軸ラベル", () => {
  it.each(Object.entries(ENV_LABEL))("ENV_LABEL.%s", (_k, l) => expectL10n(l));
  it.each(Object.entries(ERA_LABEL))("ERA_LABEL.%s", (_k, l) => expectL10n(l));
  it.each(PRESET_GROUPS.map((g) => [g.key, g.label] as const))("PRESET_GROUPS.%s", (_k, l) =>
    expectL10n(l),
  );
  it.each(Object.entries(HUE_LABEL))("HUE_LABEL.%s", (_k, l) => expectL10n(l));
  it.each(Object.entries(USE_LABEL))("USE_LABEL.%s", (_k, l) => expectL10n(l));
  it.each(Object.entries(COUNTRY_LABEL))("COUNTRY_LABEL.%s", (_k, l) => expectL10n(l));
});

describe("カラーライブラリ (palette-library.json)", () => {
  const uses = Array.from(new Set(LIBRARY.flatMap((c) => c.tags.use)));
  it.each(uses)("tags.use %s に USE_LABEL がある", (use) => {
    expect(USE_LABEL[use]).toBeDefined();
  });

  const countries = Array.from(new Set(LIBRARY.flatMap((c) => c.tags.country)));
  it.each(countries)("tags.country %s に COUNTRY_LABEL がある", (code) => {
    expect(COUNTRY_LABEL[code]).toBeDefined();
  });

  it("note を持つ全エントリに noteEn がある", () => {
    const missing = LIBRARY.filter((c) => c.note && !c.noteEn?.trim()).map((c) => c.id);
    expect(missing).toEqual([]);
  });

  it("noteEn だけ持つエントリ (note 無し) がない", () => {
    const stray = LIBRARY.filter((c) => c.noteEn && !c.note).map((c) => c.id);
    expect(stray).toEqual([]);
  });
});

describe("palette-library.json の英語版フィールド", () => {
  const cjk = /[぀-ヿ一-鿿]/;
  it.each(["name", "std", "code"] as const)(
    "%s に日本語を含む全エントリに %sEn があり、含まないエントリには無い",
    (k) => {
      for (const c of LIBRARY) {
        const en = c[`${k}En`];
        if (cjk.test(c[k])) {
          expect(en, `${c.id}.${k}En`).toBeTruthy();
          expect(en, `${c.id}.${k}En`).not.toMatch(cjk);
        } else expect(en, `${c.id}.${k}En は不要`).toBeUndefined();
      }
    },
  );
  it("noteEn に日本語が残っていない", () => {
    for (const c of LIBRARY) if (c.noteEn) expect(c.noteEn, c.id).not.toMatch(cjk);
  });
});
