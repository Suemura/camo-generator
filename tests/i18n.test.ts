// UI 文言辞書 (src/i18n/ja.ts / en.ts) の整合。型検査 (Record<MessageKey, string>) で欠落・過剰は弾けるが、
// 空文字・プレースホルダの食い違い・未使用キー・辞書に無いキーの参照は実行時にしか分からない。
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "../src/i18n/en";
import { ja } from "../src/i18n/ja";
import { t } from "../src/i18n/t";

const SRC = path.resolve(import.meta.dirname, "../src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === "core" ? [] : walk(p);
    return /\.tsx?$/.test(d.name) ? [p] : [];
  });
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n 辞書", () => {
  const keys = Object.keys(ja) as (keyof typeof ja)[];

  it("ja と en のキー集合が一致する", () => {
    expect(Object.keys(en).sort()).toEqual([...keys].sort());
  });

  it.each(keys)("%s は両言語で空でなく、プレースホルダが一致する", (k) => {
    expect(ja[k].trim()).not.toBe("");
    expect(en[k].trim()).not.toBe("");
    expect(placeholders(en[k])).toEqual(placeholders(ja[k]));
  });

  it("en の文言に日本語が残っていない (言語切替ボタンの「日本語」だけ例外)", () => {
    const cjk = /[぀-ヿ一-鿿]/;
    for (const k of keys) {
      if (k === "lang.switchTo") continue;
      expect(en[k], k).not.toMatch(cjk);
    }
  });

  it("t() は {param} を置換し、未指定の param は残す", () => {
    expect(t("ja", "app.busy.generating", { w: 10, h: 20 })).toBe("10×20 px を生成中…");
    expect(t("en", "app.toast.exported", { name: "a.png" })).toBe("Exported a.png");
    expect(t("en", "export.width", {})).toBe("Width ({unit})");
  });

  it("ソースが参照するキーは辞書にあり、辞書のキーはすべて参照される", () => {
    // 動的キーは AXIS_KEY のような Record<_, MessageKey> 経由に限る。文字列リテラルで書かれたキーを拾う
    const used = new Set<string>();
    const re = /"((?:[a-z0-9]+\.)+[A-Za-z0-9]+)"/g;
    for (const f of walk(SRC)) {
      if (f.includes(`${path.sep}i18n${path.sep}`)) continue;
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(re)) if (m[1] in ja) used.add(m[1]);
    }
    const unused = keys.filter((k) => !used.has(k));
    expect(unused).toEqual([]);
  });
});
