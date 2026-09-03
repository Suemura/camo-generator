import { describe, expect, it } from "vitest";
import { kmeans, rgbToHex } from "../src/core/kmeans.js";

// 3 色を等量混ぜた合成画像 (決定的)
function synth(): Uint8ClampedArray {
  const cols = [
    [30, 40, 20],
    [120, 100, 60],
    [200, 190, 150],
  ];
  const n = 300;
  const px = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const c = cols[i % 3];
    // 少量の決定的ノイズ (クラスタ内のばらつき)
    const j = (i * 7) % 5;
    px[i * 4] = c[0] + j;
    px[i * 4 + 1] = c[1] + j;
    px[i * 4 + 2] = c[2] + j;
    px[i * 4 + 3] = 255;
  }
  return px;
}

describe("kmeans", () => {
  it("同じ入力 → 同じ結果 (決定的)", () => {
    const a = kmeans(synth(), 3).map(rgbToHex);
    const b = kmeans(synth(), 3).map(rgbToHex);
    expect(a).toEqual(b);
  });
  it("k 個を明度順 (暗→明) で返し、各クラスタ中心が元の色に近い", () => {
    const res = kmeans(synth(), 3);
    expect(res).toHaveLength(3);
    const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    expect(lum(res[0])).toBeLessThan(lum(res[1]));
    expect(lum(res[1])).toBeLessThan(lum(res[2]));
    expect(Math.abs(res[0][0] - 32)).toBeLessThan(4);
    expect(Math.abs(res[2][2] - 152)).toBeLessThan(4);
  });
  it("rgbToHex は 2 桁ゼロ埋め", () => {
    expect(rgbToHex([0, 15, 255])).toBe("#000fff");
  });
});
