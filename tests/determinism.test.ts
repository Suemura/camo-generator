// 決定性テスト: 同一シード → 同一 index マップ。生成結果が変わればここが落ちる。
// 意図した変更なら docs/01-tech-verification.md に追記してスナップショットを更新する (vitest -u)。
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
  it("index マップのハッシュ (回帰スナップショット)", () => {
    const snap = Object.fromEntries(
      keys.map((k) => [k, sha(generate(k, 256, 256, 1234, 1.0).index)]),
    );
    expect(snap).toMatchSnapshot();
  });
});
