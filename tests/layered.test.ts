// 多層グラデーション (genLayered、マルチカム系) の構造不変条件。
// 決定性スナップショットは「変わったか」しか見ないので、この手法が守るべき性質をここで固定する:
//   - 全色が出現し、背景帯 + 前景層の面積比が P に追従する (量子化閾値と面積目標の回帰ガード)
//   - 層は独立に外せる (bg だけ / layers だけ で完走し、外した層の色が出ない)
//   - late の筆線層 (縦棒) は欠片除去より後に描かれ、細いまま残る (描画順の回帰ガード)
//   - opt.baseMax を参照しない (常に実寸生成)
//   - tileable:false でも完走する
import { describe, expect, it } from "vitest";
import { generate, genLayered, PRESETS, type PresetKey } from "../src/core/camo.js";

const SEEDS = [1234, 777, 211025];
const KEYS = (Object.keys(PRESETS) as PresetKey[]).filter((k) => PRESETS[k].kind === "layered");

type Layer = {
  type?: string;
  late?: boolean;
  color: number;
  frac?: number;
  count?: number;
  thick?: number | number[];
};
type Bg = { colors: number[]; frac: number[] };

function fractions(index: Uint8Array, nc: number): number[] {
  const cnt = new Array(nc).fill(0);
  for (const v of index) cnt[v]++;
  return cnt.map((c) => c / index.length);
}

describe("genLayered", () => {
  it("layered プリセットが 1 つ以上ある", () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  for (const key of KEYS) {
    describe(key, () => {
      const P = PRESETS[key];
      const bg = P.bg as Bg;
      const layers = P.layers as Layer[];
      const nc = P.colors.length;

      it("bg.colors / bg.frac と layers の色が colors の範囲内", () => {
        expect(bg.colors.length).toBe(bg.frac.length);
        expect(Math.abs(bg.frac.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-6);
        for (const c of bg.colors) expect(c).toBeLessThan(nc);
        for (const L of layers) expect(L.color).toBeLessThan(nc);
      });

      for (const seed of SEEDS) {
        it(`seed ${seed}: 全 ${nc} 色が出現し、前景色の面積が層の frac に追従する`, () => {
          const r = generate(key, 512, 512, seed, 1.0);
          const got = fractions(r.index, nc);
          expect(got.filter((f) => f > 0).length).toBe(nc);
          // 前景だけの色 (背景帯に含まれず、本数指定 count の層も持たない index) は、その層の frac
          // (塗る面積比。後の層に覆われる分を含む) を上回らず、半分以上は見えている
          for (const L of layers) {
            if (L.frac === undefined || bg.colors.includes(L.color)) continue;
            const same = layers.filter((M) => M.color === L.color);
            if (same.some((M) => M.count !== undefined)) continue;
            const own = same.reduce((a, M) => a + (M.frac ?? 0), 0);
            expect(got[L.color]).toBeLessThan(own + 0.02);
            expect(got[L.color]).toBeGreaterThan(own * 0.5);
          }
        });
      }

      it("背景帯だけ (layers を外す) で完走し、前景専用の色が出ない", () => {
        const r = genLayered(256, 256, 1234, 1.0, { ...P, layers: [] }, {});
        const got = fractions(r.index, nc);
        for (let c = 0; c < nc; c++) {
          if (bg.colors.includes(c)) expect(got[c]).toBeGreaterThan(0);
          else expect(got[c]).toBe(0);
        }
        // 帯の面積比は bg.frac に追従する (quantile 量子化。前景に覆われないので直接比べられる)
        for (let i = 0; i < bg.colors.length; i++) {
          expect(Math.abs(got[bg.colors[i]] - bg.frac[i])).toBeLessThan(0.03);
        }
      });

      it("前景だけ (bg を外す) で完走し、index 0 が地色になる", () => {
        const { bg: _bg, ...rest } = P;
        const r = genLayered(256, 256, 1234, 1.0, rest, {});
        const got = fractions(r.index, nc);
        expect(got[0]).toBeGreaterThan(0.3);
      });

      it("opt.baseMax を渡しても出力が変わらない (常に実寸生成)", () => {
        const a = generate(key, 512, 512, 1234, 1.0);
        const b = generate(key, 512, 512, 1234, 1.0, { baseMax: 256 });
        expect(b.index).toEqual(a.index);
      });

      it("tileable:false でも完走し、全色が出現する", () => {
        const r = generate(key, 256, 256, 1234, 1.0, { tileable: false });
        expect(new Set(r.index).size).toBe(nc);
      });

      it("grid を返さない (SVG 出力の対象外)", () => {
        expect(generate(key, 128, 128, 1234, 1.0).grid).toBeUndefined();
      });
    });
  }

  // 縦棒 (late の筆線層) は太さ 3px なので、欠片除去より前に描くと minFrag 未満の欠片として併合されて消える。
  // 「縦棒あり」の出力には、縦棒なしの出力より「左右が別色の細い縦画素」が明確に多いことで描画順を固定する
  it("multicam: 縦棒が欠片除去に消されずに残る", () => {
    const P = PRESETS.multicam;
    const layers = P.layers as Layer[];
    const count = (index: Uint8Array, color: number) => {
      let n = 0;
      for (const v of index) if (v === color) n++;
      return n;
    };
    const stems = layers.filter((L) => L.type === "stroke" && L.late) as {
      color: number;
      count: number;
      len: number[];
      thick: number;
    }[];
    expect(stems.length).toBeGreaterThan(0);
    const withStems = generate("multicam", 512, 512, 1234, 1.0).index;
    const noStems = genLayered(
      512,
      512,
      1234,
      1.0,
      { ...P, layers: layers.filter((L) => !L.late) },
      {},
    ).index;
    // 縦棒が描かれていれば、その色の画素は「本数 × 最短長 × 太さ」の半分以上は増える
    // (欠片除去に食われていれば増分はほぼ 0)
    for (const S of stems) {
      const minArea = S.count * S.len[0] * S.thick * 0.5;
      expect(count(withStems, S.color) - count(noStems, S.color)).toBeGreaterThan(minArea);
    }
  });
});
