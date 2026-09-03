// 斑点配置 (genSpots、フロッグスキン系) の構造不変条件。
// 決定性スナップショットは「変わったか」しか見ないので、新エンジンが守るべき性質をここで固定する:
//   - 全ての版 (色) が出現し、地色 (index 0) が最大面積を占める (地色に斑を置く構成)
//   - 重ね刷りで挟まれた薄片・微小片が残らない (P.minFrag による欠片除去の回帰ガード)
//   - tileable:false でも完走する (トーラス前提のコードが非タイル時に落ちない)
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey } from "../src/core/camo.js";

const SEEDS = [1234, 777, 211025];
const KEYS = (Object.keys(PRESETS) as PresetKey[]).filter((k) => PRESETS[k].kind === "spots");

/** 4 連結成分 (トーラス) の最小面積 */
function minComponentArea(index: Uint8Array, w: number, h: number): number {
  const seen = new Uint8Array(w * h);
  let min = Number.POSITIVE_INFINITY;
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const c = index[start];
    const stack = [start];
    seen[start] = 1;
    let n = 0;
    while (stack.length) {
      const i = stack.pop() as number;
      n++;
      const x = i % w;
      const y = (i / w) | 0;
      const nb = [
        y * w + ((x + w - 1) % w),
        y * w + ((x + 1) % w),
        ((y + h - 1) % h) * w + x,
        ((y + 1) % h) * w + x,
      ];
      for (const j of nb) {
        if (!seen[j] && index[j] === c) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    if (n < min) min = n;
  }
  return min;
}

describe("genSpots", () => {
  it("spots プリセットが 1 つ以上ある", () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  for (const key of KEYS) {
    describe(key, () => {
      const P = PRESETS[key];
      it("minFrag を持つ", () => {
        expect(P.minFrag).toBeGreaterThan(0);
      });
      it("layers の color は 1..colors.length-1 を重複なく覆う (0 は地色)", () => {
        const layers = P.layers as { color: number }[];
        const colors = layers.map((l) => l.color).sort((a, b) => a - b);
        expect(colors).toEqual(P.colors.map((_, i) => i).slice(1));
      });
      for (const seed of SEEDS) {
        it(`seed ${seed}: 全色が出現し、地色 (0) が最大面積`, () => {
          const r = generate(key, 512, 512, seed, 1.0);
          const cnt = new Array(P.colors.length).fill(0);
          for (const v of r.index) cnt[v]++;
          for (const c of cnt) expect(c).toBeGreaterThan(0);
          expect(Math.max(...cnt)).toBe(cnt[0]);
        });
        it(`seed ${seed}: minFrag 未満の欠片が残らない`, () => {
          const r = generate(key, 512, 512, seed, 1.0);
          expect(minComponentArea(r.index, 512, 512)).toBeGreaterThanOrEqual(P.minFrag as number);
        });
      }
      it("tileable:false でも完走し、全色が出現する", () => {
        const r = generate(key, 256, 256, 1234, 1.0, { tileable: false });
        expect(new Set(r.index).size).toBe(P.colors.length);
      });
      it("grid を返さない (SVG 出力の対象外)", () => {
        expect(generate(key, 128, 128, 1234, 1.0).grid).toBeUndefined();
      });
    });
  }
});
