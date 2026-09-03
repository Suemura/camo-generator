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

// 継ぎ目の指標は「ラップ行 (列) の色変化数 ÷ 内部の行 (列) の 90 パーセンタイル」。
// - 軸を揃える: x ラップの継ぎ目は横隣接、y ラップは縦隣接で比べる。混ぜると異方パターン
//   (CCE の横伸長) で分母が伸長率のぶん縮み、継ぎ目が無くても悪化して見える
// - 平均ではなく p90: 横縞状のパターンでは行あたりの変化数の分布に重い尾があり
//   (黒枝の帯を横切る行は中央値の 5 倍以上)、平均を分母にすると健全なラップ行が過大評価される。
//   p90 なら「よくある境界の行」と比較できる。非タイル生成 (tileable:false) では 10 倍以上に出るので判別力は落ちない
function lineCounts(index: Uint8Array, w: number, h: number) {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let y = 0; y < h - 1; y++) {
    let d = 0;
    for (let x = 0; x < w; x++) if (index[y * w + x] !== index[(y + 1) * w + x]) d++;
    rows.push(d);
  }
  for (let x = 0; x < w - 1; x++) {
    let d = 0;
    for (let y = 0; y < h; y++) if (index[y * w + x] !== index[y * w + x + 1]) d++;
    cols.push(d);
  }
  return { rows, cols };
}

function p90(a: number[]) {
  const s = [...a].sort((p, q) => p - q);
  return s[Math.floor(0.9 * s.length)] || 1;
}

function seamRatio(index: Uint8Array, w: number, h: number) {
  let seamX = 0;
  let seamY = 0;
  for (let y = 0; y < h; y++) if (index[y * w + (w - 1)] !== index[y * w]) seamX++;
  for (let x = 0; x < w; x++) if (index[(h - 1) * w + x] !== index[x]) seamY++;
  const { rows, cols } = lineCounts(index, w, h);
  return { x: seamX / p90(cols), y: seamY / p90(rows) };
}

function measure(key: PresetKey, seed: number, opt?: { tileable: boolean }) {
  const r = generate(key, 512, 512, seed, 1.0, opt);
  if (r.grid) return seamRatio(r.grid.cellColor, r.grid.gw, r.grid.gh);
  return seamRatio(r.index, r.w, r.h);
}

describe("tileable 生成の継ぎ目", () => {
  for (const key of keys) {
    it(`${key}: 継ぎ目の変化数 (3 シード平均) が内部行の p90 の 2.5 倍以内`, () => {
      let sx = 0;
      let sy = 0;
      for (const seed of SEEDS) {
        const s = measure(key, seed);
        sx += s.x / SEEDS.length;
        sy += s.y / SEEDS.length;
      }
      expect(sx, "横継ぎ目").toBeLessThan(2.5);
      expect(sy, "縦継ぎ目").toBeLessThan(2.5);
    });
  }
  it("tileable:false では継ぎ目が明確に不連続 (指標の妥当性確認)", () => {
    const s = measure("woodland", 1234, { tileable: false });
    expect(Math.max(s.x, s.y)).toBeGreaterThan(5);
  });
});
