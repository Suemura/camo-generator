// 雨線図案 (genRain、シュトリヒタルン系) の構造不変条件。
// 決定性スナップショットは「変わったか」しか見ないので、この手法が守るべき性質をここで固定する:
//   - 2 色のみ (index 0 = 地色、1 = ダッシュ)。grid を返さない (SVG 出力の対象外)
//   - ダッシュの面積比が参照の実測 (0.19〜0.20) の近傍に収まる
//   - 同一列のダッシュが接触しない構造 → 連結成分数がダッシュ数 (格子セル数 × density) の近傍に収まる
//   - 太さがスケールに追従し、1px 幅に潰れた画素が僅少 (細線化 / 塗り潰しの回帰ガード)
//   - opt.baseMax を参照しない (常に実寸生成)。tileable:false でも完走する
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey } from "../src/core/camo.js";

const SEEDS = [1234, 777, 211025];
const KEYS = (Object.keys(PRESETS) as PresetKey[]).filter((k) => PRESETS[k].kind === "rain");

function fraction(index: Uint8Array): number {
  let n = 0;
  for (const v of index) if (v === 1) n++;
  return n / index.length;
}

// 4 近傍の連結成分数 (index === 1 の画素)
function components(index: Uint8Array, w: number, h: number): number {
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  let n = 0;
  for (let s = 0; s < w * h; s++) {
    if (index[s] !== 1 || seen[s]) continue;
    n++;
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const i = stack.pop() as number;
      const x = i % w;
      const y = (i - x) / w;
      const nb = [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ];
      for (const j of nb) {
        if (j >= 0 && index[j] === 1 && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return n;
}

// 左右の隣が地色でその画素だけダッシュ色 = 幅 1px に潰れた画素の、ダッシュ画素全体に対する比
function thinRatio(index: Uint8Array, w: number, h: number): number {
  let thin = 0;
  let all = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (index[i] !== 1) continue;
      all++;
      if (index[i - 1] !== 1 && index[i + 1] !== 1) thin++;
    }
  }
  return all ? thin / all : 0;
}

describe("genRain", () => {
  it("rain プリセットが 1 つ以上ある", () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  for (const key of KEYS) {
    describe(key, () => {
      const P = PRESETS[key];

      it("2 色で、colors の長さと一致する", () => {
        expect(P.colors.length).toBe(2);
        const r = generate(key, 256, 256, 1234, 1.0);
        expect(new Set(r.index)).toEqual(new Set([0, 1]));
      });

      for (const seed of SEEDS) {
        it(`seed ${seed}: ダッシュの面積比が参照実測 (0.19〜0.20) の近傍 [0.15, 0.25]`, () => {
          const r = generate(key, 512, 512, seed, 1.0);
          const f = fraction(r.index);
          expect(f).toBeGreaterThan(0.15);
          expect(f).toBeLessThan(0.25);
        });
      }

      it("同一列のダッシュが接触しない (連結成分数がセル数 × density の近傍)", () => {
        // 512px・scale 1.0 の格子は nx = round(512 / spacing)、ny = round(512 / (len + gap))。
        // 列内非重複なら成分数 ≈ nx·ny·density。隣列との接触で多少減り、皺状の分断で多少増える
        const spacing = P.spacing as number;
        const cells =
          Math.round(512 / spacing) * Math.round(512 / ((P.len as number) + (P.gap as number)));
        const expected = cells * (P.density as number);
        for (const seed of SEEDS) {
          const r = generate(key, 512, 512, seed, 1.0);
          const n = components(r.index, 512, 512);
          expect(n).toBeGreaterThan(expected * 0.6);
          expect(n).toBeLessThan(expected * 1.4);
        }
      });

      it("太さがスケールに追従し、1px 幅に潰れた画素は 5% 未満 (scale 0.7 / 1.0 / 2.0)", () => {
        for (const scale of [0.7, 1.0, 2.0]) {
          const r = generate(key, 512, 512, 1234, scale);
          expect(thinRatio(r.index, 512, 512)).toBeLessThan(0.05);
        }
      });

      it("opt.baseMax を渡しても出力が変わらない (常に実寸生成)", () => {
        const a = generate(key, 512, 512, 1234, 1.0);
        const b = generate(key, 512, 512, 1234, 1.0, { baseMax: 256 });
        expect(b.index).toEqual(a.index);
      });

      it("tileable:false でも完走し、両色が出現する", () => {
        const r = generate(key, 256, 256, 1234, 1.0, { tileable: false });
        expect(new Set(r.index).size).toBe(2);
      });

      it("grid を返さない (SVG 出力の対象外)", () => {
        expect(generate(key, 128, 128, 1234, 1.0).grid).toBeUndefined();
      });

      it("progress は単調増加で最後に 1", () => {
        const seen: number[] = [];
        generate(key, 256, 256, 1234, 1.0, { progress: (p) => seen.push(p) });
        expect(seen.length).toBeGreaterThan(0);
        for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
        expect(seen[seen.length - 1]).toBe(1);
      });
    });
  }
});
