// 幾何ハードエッジ (genSplinter、スプリンター / M90 系) の構造不変条件。
// 決定性スナップショットは「変わったか」しか見ないので、この手法が守るべき性質をここで固定する:
//   - 面積比が P.frac に追従する (色割当の面積目標フィードバックの回帰ガード)
//   - 雨線は splinter だけが持ち、色数を増やさない (M90 に波及していない)
//   - 雨線は欠片除去より後に描かれ、1px 幅のまま残る (描画順の回帰ガード)
//   - opt.baseMax を参照しない (常に実寸生成。ハードエッジが拡大で階段化しないことの前提)
//   - tileable:false でも完走する (トーラス前提のコードが非タイル時に落ちない)
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey } from "../src/core/camo.js";

const SEEDS = [1234, 777, 211025];
const KEYS = (Object.keys(PRESETS) as PresetKey[]).filter((k) => PRESETS[k].kind === "splinter");

function fractions(index: Uint8Array, nc: number): number[] {
  const cnt = new Array(nc).fill(0);
  for (const v of index) cnt[v]++;
  return cnt.map((c) => c / index.length);
}

describe("genSplinter", () => {
  it("splinter プリセットが 1 つ以上ある", () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  it("雨線を持つのは splinter だけ (M90 系は雨線なしが実物との識別点)", () => {
    expect(PRESETS.splinter.rain).toBeDefined();
    for (const key of ["m90", "m90desert", "m90winter"] as const) {
      expect(PRESETS[key].rain).toBeUndefined();
    }
  });

  it("雨線の色は既存のインデックス内 (色数を増やさない)", () => {
    const R = PRESETS.splinter.rain as { color: number };
    expect(R.color).toBeGreaterThanOrEqual(0);
    expect(R.color).toBeLessThan(PRESETS.splinter.colors.length);
  });

  for (const key of KEYS) {
    describe(key, () => {
      const P = PRESETS[key];
      const frac = P.frac as number[];

      it("frac の長さが colors の数と一致する", () => {
        expect(frac.length).toBe(P.colors.length);
      });

      for (const seed of SEEDS) {
        it(`seed ${seed}: 面積比が frac に ±0.08 で追従する`, () => {
          const r = generate(key, 512, 512, seed, 1.0);
          const got = fractions(r.index, frac.length);
          for (let c = 0; c < frac.length; c++) {
            expect(Math.abs(got[c] - frac[c])).toBeLessThan(0.08);
          }
        });
      }

      it("opt.baseMax を渡しても出力が変わらない (常に実寸生成)", () => {
        const a = generate(key, 512, 512, 1234, 1.0);
        const b = generate(key, 512, 512, 1234, 1.0, { baseMax: 256 });
        expect(b.index).toEqual(a.index);
      });

      it("tileable:false でも完走し、全色が出現する", () => {
        const r = generate(key, 256, 256, 1234, 1.0, { tileable: false });
        expect(new Set(r.index).size).toBe(P.colors.length);
      });

      it("grid を返さない (SVG 出力の対象外)", () => {
        expect(generate(key, 128, 128, 1234, 1.0).grid).toBeUndefined();
      });
    });
  }

  // 雨線は幅 1px なので、欠片除去 (cleanupFragments) より前に描くと丸ごと併合されて消える。
  // 「雨線あり」の出力には、雨線なしの出力より雨線色の 1px 幅の縦連結成分が多いことで順序を固定する
  it("雨線が欠片除去に消されずに残る", () => {
    const r = generate("splinter", 512, 512, 1234, 1.0);
    const w = 512;
    const R = PRESETS.splinter.rain as { color: number };
    // 左右の画素が雨線色以外で、自分だけが雨線色 = 1px 幅の縦線として残っている画素
    let thin = 0;
    for (let y = 0; y < 512; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (r.index[i] === R.color && r.index[i - 1] !== R.color && r.index[i + 1] !== R.color)
          thin++;
      }
    }
    expect(thin).toBeGreaterThan(1000);
  });
});
