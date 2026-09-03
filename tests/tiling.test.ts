// シームレスタイリング: 継ぎ目 (右端→左端 / 下端→上端) の色変化率が内部の隣接変化率と同程度なら
// タイルを並べても境界が見えない。tileable:false では継ぎ目が明確に高くなることも確認する。
// - 成長系はセルグリッド単位で測る (ピクセル単位だとセル境界にしか変化がなく cellPx 倍に膨れる)
// - 1 列の指標は分散が大きいので 3 シード平均で判定する
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey, registerSources } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";

registerSources(digsrc);

const keys = Object.keys(PRESETS) as PresetKey[];
const SEEDS = [1234, 777, 211025];

// 継ぎ目は「同じ向きの隣接」で正規化する: x ラップの継ぎ目は横隣接、y ラップの継ぎ目は縦隣接。
// 軸を混ぜると異方パターン (CCE の横伸長など) で分母が縮み、継ぎ目が無くても指標が伸長率だけ悪化する
function seamRatio(index: Uint8Array, w: number, h: number) {
  let seamX = 0;
  let seamY = 0;
  let innerX = 0;
  let innerY = 0;
  for (let y = 0; y < h; y++) {
    if (index[y * w + (w - 1)] !== index[y * w]) seamX++;
    for (let x = 0; x < w - 1; x++) if (index[y * w + x] !== index[y * w + x + 1]) innerX++;
  }
  for (let x = 0; x < w; x++) {
    if (index[(h - 1) * w + x] !== index[x]) seamY++;
    for (let y = 0; y < h - 1; y++) if (index[y * w + x] !== index[(y + 1) * w + x]) innerY++;
  }
  const rateX = innerX / (h * (w - 1));
  const rateY = innerY / (w * (h - 1));
  return { x: seamX / h / rateX, y: seamY / w / rateY };
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
