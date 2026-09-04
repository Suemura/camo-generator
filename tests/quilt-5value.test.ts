// クイルトの 5 値化 (Auscam) の回帰ガード。
// genQuilt と共有後処理は元々 4 色をハードコードしていた (多数決ミップ・面積比フィードバック・
// 未塗布判定・modeFilter・欠片除去)。5 色目は「エラーにならず静かに消える」壊れ方をするため、
// 目視でも見落としやすい。色数の一般化 (NC = P.frac.length) が崩れたことを検出する。
import { describe, expect, it } from "vitest";
import {
  AUSCAM_SRC_BITS,
  AUSCAM_SRC_H,
  AUSCAM_SRC_RLE,
  AUSCAM_SRC_W,
} from "../src/core/auscamsrc.js";
import { generate, PRESETS, type PresetKey } from "../src/core/camo.js";

describe("クイルトの 5 値化 (Auscam)", () => {
  it("5 色すべてが平滑化・欠片除去を生き残る", () => {
    for (const seed of [1234, 777]) {
      for (const scale of [0.7, 1.0, 2.0]) {
        const res = generate("auscam", 256, 256, seed, scale);
        const counts = new Array(5).fill(0);
        for (const v of res.index) counts[v]++;
        expect(
          counts.every((c) => c > 0),
          `seed=${seed} scale=${scale}: ${counts.join(",")}`,
        ).toBe(true);
      }
    }
  });

  it("5 値の図案を持つのは auscam だけ (他は 4 値のまま = 従来経路)", () => {
    for (const [key, P] of Object.entries(PRESETS)) {
      if (P.kind !== "quilt") continue;
      const frac = P.frac as number[];
      expect(frac.length, key).toBe(key === "auscam" ? 5 : 4);
    }
  });

  it("3bit RLE がソース図案の全画素をちょうど埋め、値が 0..4 に収まる", () => {
    expect(AUSCAM_SRC_BITS).toBe(3);
    const shift = 8 - AUSCAM_SRC_BITS;
    const runMask = (1 << shift) - 1;
    const bin = Buffer.from(AUSCAM_SRC_RLE, "base64");
    let filled = 0;
    let maxValue = 0;
    for (const b of bin) {
      const len = b & runMask;
      expect(len).toBeGreaterThan(0); // ラン長 0 は decodeSrc が進まなくなる
      maxValue = Math.max(maxValue, b >> shift);
      filled += len;
    }
    expect(filled).toBe(AUSCAM_SRC_W * AUSCAM_SRC_H);
    expect(maxValue).toBe(4);
  });

  it("PRESETS.auscam の colors は frac と同じ色数", () => {
    const P = PRESETS["auscam" as PresetKey];
    expect(P.colors.length).toBe((P.frac as number[]).length);
  });
});
