// 格子図案 (genGrid、デザートナイト系) の構造不変条件。
// 決定性スナップショットは「変わったか」しか見ないので、この手法が守るべき性質をここで固定する:
//   - 2 色のみ (index 0 = 地色 = 格子線 + 暗斑、1 = 明の正方形)
//   - grid を返し、index は grid の最近傍展開と全画素一致する (PNG と SVG が同じ図形になる契約)
//   - 格子線の位置のセルは常に地色 (正方形は格子からはみ出さない)
//   - 明比が参照の実測 (0.257) の近傍に収まる
//   - 暗斑に 1〜2 ピッチの小欠落と数ピッチ以上の大斑が共存する (fbm のオクターブが効いている)
//   - SVG 出力の矩形数 (水平ラン数) が過大にならない
//   - サブピクセル下限: 極端な scale でもセル幅 ≥ 1px で両色が出る
//   - opt.baseMax を参照しない (常に実寸生成)。tileable:false でも完走する
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey } from "../src/core/camo.js";

const SEEDS = [1234, 777, 211025];
const KEYS = (Object.keys(PRESETS) as PresetKey[]).filter((k) => PRESETS[k].kind === "grid");

function fraction(index: Uint8Array): number {
  let n = 0;
  for (const v of index) if (v === 1) n++;
  return n / index.length;
}

// gridToSvg (src/lib/export.ts) が出す rect 数 = セル行ごとの水平ラン数の合計
function runCount(cell: Uint8Array, gw: number, gh: number): number {
  let n = 0;
  for (let y = 0; y < gh; y++) {
    let x = 0;
    while (x < gw) {
      let x2 = x + 1;
      while (x2 < gw && cell[y * gw + x2] === cell[y * gw + x]) x2++;
      n++;
      x = x2;
    }
  }
  return n;
}

// 正方形単位の「欠落」マスク (正方形の中心セルが地色) の 4 近傍連結成分の面積 (正方形数) 一覧
function blotchAreas(cell: Uint8Array, gw: number, gh: number, sub: number, sq: number): number[] {
  const nx = gw / sub;
  const ny = gh / sub;
  const miss = new Uint8Array(nx * ny);
  const c = sq >> 1;
  for (let sy = 0; sy < ny; sy++)
    for (let sx = 0; sx < nx; sx++)
      miss[sy * nx + sx] = cell[(sy * sub + c) * gw + sx * sub + c] === 0 ? 1 : 0;
  const seen = new Uint8Array(nx * ny);
  const areas: number[] = [];
  for (let s = 0; s < nx * ny; s++) {
    if (!miss[s] || seen[s]) continue;
    let a = 0;
    const st = [s];
    seen[s] = 1;
    while (st.length) {
      const i = st.pop() as number;
      a++;
      const x = i % nx;
      const y = (i - x) / nx;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
        const j = yy * nx + xx;
        if (miss[j] && !seen[j]) {
          seen[j] = 1;
          st.push(j);
        }
      }
    }
    areas.push(a);
  }
  return areas;
}

describe("genGrid", () => {
  it("grid プリセットが 1 つ以上ある", () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  for (const key of KEYS) {
    describe(key, () => {
      const P = PRESETS[key];
      const sub = (P.sub as number | undefined) ?? 5;
      const sq = (P.sq as number | undefined) ?? 3;

      it("2 色で、colors の長さと一致する", () => {
        expect(P.colors.length).toBe(2);
        const r = generate(key, 256, 256, 1234, 1.0);
        expect(new Set(r.index)).toEqual(new Set([0, 1]));
      });

      it("grid を返し、index は grid の最近傍展開と全画素一致する (SVG と PNG の同一性)", () => {
        const r = generate(key, 512, 512, 1234, 1.0);
        const g = r.grid;
        expect(g).toBeDefined();
        if (!g) return;
        expect(g.gw * g.gh).toBe(g.cellColor.length);
        expect(g.gw % sub).toBe(0);
        expect(g.gh % sub).toBe(0);
        expect(g.cellPx).toBeCloseTo(512 / g.gw, 10);
        for (let y = 0; y < 512; y++) {
          const gy = Math.min(g.gh - 1, Math.floor((y * g.gh) / 512));
          for (let x = 0; x < 512; x++) {
            const gx = Math.min(g.gw - 1, Math.floor((x * g.gw) / 512));
            if (r.index[y * 512 + x] !== g.cellColor[gy * g.gw + gx]) {
              throw new Error(`index/grid mismatch at (${x}, ${y})`);
            }
          }
        }
      });

      it("格子線のセルは全て地色 (正方形は格子からはみ出さない)", () => {
        const r = generate(key, 512, 512, 777, 1.0);
        const g = r.grid;
        if (!g) throw new Error("grid missing");
        for (let y = 0; y < g.gh; y++)
          for (let x = 0; x < g.gw; x++)
            if ((x % sub >= sq || y % sub >= sq) && g.cellColor[y * g.gw + x] !== 0) {
              throw new Error(`light cell on grid line at (${x}, ${y})`);
            }
      });

      for (const seed of SEEDS) {
        it(`seed ${seed}: 明比が参照実測 (0.257) の近傍 [0.20, 0.32]`, () => {
          const f = fraction(generate(key, 512, 512, seed, 1.0).index);
          expect(f).toBeGreaterThan(0.2);
          expect(f).toBeLessThan(0.32);
        });
      }

      it("暗斑は 1〜2 ピッチの小欠落と 4 ピッチ以上の大斑が共存する", () => {
        for (const seed of SEEDS) {
          const g = generate(key, 512, 512, seed, 1.0).grid;
          if (!g) throw new Error("grid missing");
          const areas = blotchAreas(g.cellColor, g.gw, g.gh, sub, sq);
          const small = areas.filter((a) => a <= 4).length;
          const maxDiam = 2 * Math.sqrt(Math.max(...areas) / Math.PI);
          expect(small, `seed ${seed} small blotches`).toBeGreaterThan(3);
          expect(maxDiam, `seed ${seed} largest blotch diameter (pitch)`).toBeGreaterThan(4);
          expect(maxDiam, `seed ${seed} largest blotch diameter (pitch)`).toBeLessThan(24);
        }
      });

      it("SVG 矩形数 (水平ラン数) が過大にならない (512px: scale 1.0 < 12000、scale 0.7 < 8000、scale 2.0 < 40000)", () => {
        for (const [scale, limit] of [
          [1.0, 12000],
          [0.7, 8000],
          [2.0, 40000],
        ] as const) {
          const g = generate(key, 512, 512, 1234, scale).grid;
          if (!g) throw new Error("grid missing");
          expect(runCount(g.cellColor, g.gw, g.gh), `scale ${scale}`).toBeLessThan(limit);
        }
      });

      it("grid のセル数は出力寸法に依存せず scale に追従する (2048px と 512px で同じ gw、scale 2 で約 2 倍)", () => {
        const a = generate(key, 512, 512, 1234, 1.0).grid;
        const b = generate(key, 2048, 2048, 1234, 1.0).grid;
        const c = generate(key, 512, 512, 1234, 2.0).grid;
        if (!a || !b || !c) throw new Error("grid missing");
        expect(b.gw).toBe(a.gw);
        expect(Math.abs(c.gw - 2 * a.gw)).toBeLessThanOrEqual(sub);
      });

      it("極端な scale でもセル幅 ≥ 1px で両色が出る (scale 10)", () => {
        const r = generate(key, 512, 512, 1234, 10);
        if (!r.grid) throw new Error("grid missing");
        expect(r.grid.gw).toBeLessThanOrEqual(512);
        expect(new Set(r.index).size).toBe(2);
      });

      it("opt.baseMax を渡しても出力が変わらない (常に実寸生成)", () => {
        const a = generate(key, 512, 512, 1234, 1.0);
        const b = generate(key, 512, 512, 1234, 1.0, { baseMax: 256 });
        expect(b.index).toEqual(a.index);
      });

      it("tileable:false でも完走し、両色と grid が出る", () => {
        const r = generate(key, 256, 256, 1234, 1.0, { tileable: false });
        expect(new Set(r.index).size).toBe(2);
        expect(r.grid).toBeDefined();
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
