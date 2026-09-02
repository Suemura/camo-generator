// シームレスタイリング: 継ぎ目 (右端→左端 / 下端→上端) の色変化率が内部の隣接変化率と同程度なら
// タイルを並べても境界が見えない。tileable:false では継ぎ目が明確に高くなることも確認する。
// - 成長系はセルグリッド単位で測る (ピクセル単位だとセル境界にしか変化がなく cellPx 倍に膨れる)
// - 1 列の指標は分散が大きいので 3 シード平均で判定する
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey } from "../src/core/camo.js";

const keys = Object.keys(PRESETS) as PresetKey[];
const SEEDS = [1234, 777, 211025];

function seamRatio(index: Uint8Array, w: number, h: number) {
  let seamX = 0;
  let seamY = 0;
  let inner = 0;
  let innerN = 0;
  for (let y = 0; y < h; y++) {
    if (index[y * w + (w - 1)] !== index[y * w]) seamX++;
    for (let x = 0; x < w - 1; x++) {
      if (index[y * w + x] !== index[y * w + x + 1]) inner++;
      innerN++;
    }
  }
  for (let x = 0; x < w; x++) if (index[(h - 1) * w + x] !== index[x]) seamY++;
  const innerRate = inner / innerN;
  return { x: seamX / h / innerRate, y: seamY / w / innerRate };
}

function measure(key: PresetKey, seed: number, opt?: { tileable: boolean }) {
  const r = generate(key, 512, 512, seed, 1.0, opt);
  if (r.grid) return seamRatio(r.grid.cellColor, r.grid.gw, r.grid.gh);
  return seamRatio(r.index, r.w, r.h);
}

describe("tileable 生成の継ぎ目", () => {
  for (const key of keys) {
    it(`${key}: 継ぎ目の変化率 (3 シード平均) が内部の 1.8 倍以内`, () => {
      let sx = 0;
      let sy = 0;
      for (const seed of SEEDS) {
        const s = measure(key, seed);
        sx += s.x / SEEDS.length;
        sy += s.y / SEEDS.length;
      }
      expect(sx, "横継ぎ目").toBeLessThan(1.8);
      expect(sy, "縦継ぎ目").toBeLessThan(1.8);
    });
  }
  it("tileable:false では継ぎ目が明確に不連続 (指標の妥当性確認)", () => {
    const s = measure("woodland", 1234, { tileable: false });
    expect(Math.max(s.x, s.y)).toBeGreaterThan(3);
  });
});
