// 決定性テスト: 同一シード → 同一 index マップ。生成結果が変わればここが落ちる。
// 意図した変更なら docs/tech-verification/ に新規エントリを追加してスナップショットを更新する (vitest -u)。
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey, registerSources } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";

registerSources(digsrc);

const keys = Object.keys(PRESETS) as PresetKey[];
const sha = (u8: Uint8Array) => createHash("sha1").update(u8).digest("hex");

describe("generate() は決定的", () => {
  for (const key of keys) {
    it(`${key}: 同一シードで同一出力`, () => {
      const a = generate(key, 256, 256, 1234, 1.0);
      const b = generate(key, 256, 256, 1234, 1.0);
      expect(a.index).toEqual(b.index);
      expect(a.index.length).toBe(256 * 256);
      expect(Math.max(...a.index)).toBeLessThan(PRESETS[key].colors.length);
    });
    it(`${key}: 異なるシードで異なる出力`, () => {
      expect(sha(generate(key, 256, 256, 1234, 1.0).index)).not.toBe(
        sha(generate(key, 256, 256, 777, 1.0).index),
      );
    });
  }
  it("cce は woodland と同一ソースでも srcAspect で別出力になる", () => {
    // 同じ m81 ソース・同じ kBase。差は srcAspect (横伸長) と patchR だけ。
    // 異方サンプリングが無効化されると両者が一致してしまうため、その回帰を検知する
    expect(sha(generate("cce", 256, 256, 1234, 1.0).index)).not.toBe(
      sha(generate("woodland", 256, 256, 1234, 1.0).index),
    );
  });
  it("index マップのハッシュ (回帰スナップショット)", () => {
    const snap = Object.fromEntries(
      keys.map((k) => [k, sha(generate(k, 256, 256, 1234, 1.0).index)]),
    );
    expect(snap).toMatchSnapshot();
  });
});
