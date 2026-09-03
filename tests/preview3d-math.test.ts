import { describe, expect, it } from "vitest";
import {
  boxFaceSizes,
  clothWave,
  fabricRepeat,
  scaleBoxUv,
  textureRepeat,
  tileSizeMm,
  toMm,
} from "../src/lib/preview3d-math";

describe("toMm", () => {
  it("単位換算", () => {
    expect(toMm(300, "mm", 300)).toBe(300);
    expect(toMm(12, "in", 300)).toBeCloseTo(304.8);
    expect(toMm(1024, "px", 300)).toBeCloseTo(86.7, 1);
  });
});

describe("tileSizeMm", () => {
  it("px は長辺 300mm で比率維持", () => {
    expect(tileSizeMm({ w: 1024, h: 1024, unit: "px", dpi: 300 })).toEqual({ w: 300, h: 300 });
    expect(tileSizeMm({ w: 2048, h: 1024, unit: "px", dpi: 300 })).toEqual({ w: 300, h: 150 });
  });
  it("mm / in は物理寸法そのまま", () => {
    expect(tileSizeMm({ w: 210, h: 297, unit: "mm", dpi: 300 })).toEqual({ w: 210, h: 297 });
    const r = tileSizeMm({ w: 10, h: 5, unit: "in", dpi: 72 });
    expect(r.w).toBeCloseTo(254);
    expect(r.h).toBeCloseTo(127);
  });
});

describe("textureRepeat", () => {
  it("球: 円周 / タイル幅、半円周 / タイル高さ", () => {
    const r = textureRepeat("sphere", { w: 300, h: 300 });
    expect(r.x).toBeCloseTo(Math.PI);
    expect(r.y).toBeCloseTo(Math.PI / 2);
  });
  it("布 600mm × タイル 300mm → 2×2", () => {
    expect(textureRepeat("cloth", { w: 300, h: 300 })).toEqual({ x: 2, y: 2 });
  });
  it("ポーチは 200mm 基準", () => {
    const r = textureRepeat("pouch", { w: 200, h: 150 });
    expect(r.x).toBe(1);
    expect(r.y).toBeCloseTo(4 / 3);
  });
  it("生地幅 1100×1000 の大タイルは 1 未満", () => {
    const r = textureRepeat("cloth", { w: 1100, h: 1000 });
    expect(r.x).toBeCloseTo(600 / 1100);
    expect(r.y).toBeCloseTo(0.6);
  });
  it("タイル 0 / NaN でも有限値", () => {
    expect(textureRepeat("cloth", { w: 0, h: Number.NaN })).toEqual({ x: 1, y: 1 });
  });
  it("極端値は clamp", () => {
    const r = textureRepeat("sphere", { w: 0.001, h: 1e9 });
    expect(r.x).toBe(200);
    expect(r.y).toBe(0.05);
  });
});

describe("fabricRepeat", () => {
  it("布 600mm / 60mm → 10", () => {
    expect(fabricRepeat("cloth")).toEqual({ x: 10, y: 10 });
  });
});

describe("clothWave", () => {
  it("決定的で振幅 20mm 以下", () => {
    expect(clothWave(123, 45)).toBe(clothWave(123, 45));
    expect(clothWave(0, 0)).not.toBe(clothWave(100, 50));
    for (let x = -300; x <= 300; x += 7) {
      for (let y = -300; y <= 300; y += 11) {
        expect(Math.abs(clothWave(x, y))).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe("scaleBoxUv", () => {
  it("面ごとに実寸 / 基準でスケール", () => {
    // 2 面 × 4 頂点、全 UV = 1
    const uv = new Float32Array(16).fill(1);
    scaleBoxUv(
      uv,
      [
        [80, 150],
        [200, 150],
      ],
      200,
    );
    expect(uv[0]).toBeCloseTo(0.4);
    expect(uv[1]).toBeCloseTo(0.75);
    expect(uv[8]).toBeCloseTo(1);
    expect(uv[9]).toBeCloseTo(0.75);
  });
  it("boxFaceSizes は +x,-x,+y,-y,+z,-z 順", () => {
    expect(boxFaceSizes(200, 150, 80)).toEqual([
      [80, 150],
      [80, 150],
      [200, 80],
      [200, 80],
      [200, 150],
      [200, 150],
    ]);
  });
});
