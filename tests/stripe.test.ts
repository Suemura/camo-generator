// ストローク系 (genStripe) と、その下地である周期ノイズ (pnoise / pfbm) のテスト。
// タイリングそのものは tests/tiling.test.ts が全プリセット横断で継ぎ目比を測るので、
// ここでは「周期が厳密に一致するか」というノイズ側の性質と、面積比の安定性を見る。
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generate, genWoodland, pfbm, pnoise } from "../src/core/camo.js";

const sha = (u8: Uint8Array) => createHash("sha1").update(u8).digest("hex");

describe("周期ノイズ", () => {
  // 一致は倍精度の丸め (x + nx で小数部が 1 ULP ずれる) を除いた範囲で見る。
  // 格子点の値そのものは wrapI で完全に同一になるので、差は補間係数の丸めだけ
  it("pnoise は格子数 nx / ny の周期で一致する", () => {
    const nx = 5;
    const ny = 3;
    for (let i = 0; i < 40; i++) {
      const x = (i * 0.37) % nx;
      const y = (i * 0.61) % ny;
      expect(pnoise(x + nx, y, 42, nx, ny)).toBeCloseTo(pnoise(x, y, 42, nx, ny), 12);
      expect(pnoise(x, y + ny, 42, nx, ny)).toBeCloseTo(pnoise(x, y, 42, nx, ny), 12);
    }
  });
  it("pfbm も同じ周期で一致する (lac=2・整数格子なら全オクターブが整数格子に保たれる)", () => {
    const nx = 4;
    const ny = 6;
    for (let i = 0; i < 40; i++) {
      const x = (i * 0.29) % nx;
      const y = (i * 0.53) % ny;
      expect(pfbm(x + nx, y, 7, 3, nx, ny)).toBeCloseTo(pfbm(x, y, 7, 3, nx, ny), 12);
      expect(pfbm(x, y + ny, 7, 3, nx, ny)).toBeCloseTo(pfbm(x, y, 7, 3, nx, ny), 12);
    }
  });
  it("nx / ny に 0 を渡すと巻かない (非タイル生成の経路)", () => {
    expect(pnoise(1.5, 2.5, 9, 0, 0)).not.toBe(pnoise(1.5 + 4, 2.5, 9, 0, 0));
  });
  it("周期ノイズの追加で既存のノイズ閾値手法の出力は変わっていない", () => {
    // genWoodland / genDigital は vnoise / fbm / genField を使う旧経路。
    // 周期化を genPField として別に足したのはこの不変性を守るためで、
    // 将来 genField を触ったときにここが落ちる
    expect(sha(genWoodland(128, 128, 1234, 1.0).index)).toBe(
      "9edad15fb4e2bb7229b387c5ea33cb0474e63e77",
    );
  });
});

describe("tigerstripe (genStripe)", () => {
  const SEEDS = [1234, 777, 211025];

  it("4 値の index マップを返す", () => {
    const r = generate("tigerstripe", 256, 256, 1234, 1.0);
    expect(r.index.length).toBe(256 * 256);
    expect(Math.max(...r.index)).toBeLessThan(4);
  });

  it("色の面積比が 3 シードで目標の ±5pt 以内 (面積キャリブレーションの回帰検知)", () => {
    // 目標は refs/tigerstripe.jpg の実測 (カーキ 0.17 / 緑 0.22+0.22 / 黒 0.39)。
    // 黒はカーキの細縞に一部上書きされるので実測より低く出る
    const target = [0.17, 0.28, 0.27, 0.28];
    for (const seed of SEEDS) {
      const r = generate("tigerstripe", 512, 512, seed, 1.0);
      const cnt = [0, 0, 0, 0];
      for (const v of r.index) cnt[v]++;
      for (let c = 0; c < 4; c++) {
        expect(cnt[c] / r.index.length, `seed ${seed} / color ${c}`).toBeCloseTo(target[c], 1);
      }
    }
  });

  it("縞は横方向に伸びている (異方性の回帰検知)", () => {
    // 横に流れる縞なら、縦に走査したときの色変化数のほうが横に走査したときより多い
    const r = generate("tigerstripe", 512, 512, 1234, 1.0);
    let acrossX = 0;
    let acrossY = 0;
    for (let y = 0; y < 512; y++)
      for (let x = 0; x < 511; x++)
        if (r.index[y * 512 + x] !== r.index[y * 512 + x + 1]) acrossX++;
    for (let y = 0; y < 511; y++)
      for (let x = 0; x < 512; x++)
        if (r.index[y * 512 + x] !== r.index[(y + 1) * 512 + x]) acrossY++;
    expect(acrossY / acrossX).toBeGreaterThan(1.5);
  });

  it("tileable:false では別の出力になる (周期モードの切替が効いている)", () => {
    expect(sha(generate("tigerstripe", 256, 256, 1234, 1.0).index)).not.toBe(
      sha(generate("tigerstripe", 256, 256, 1234, 1.0, { tileable: false }).index),
    );
  });
});
