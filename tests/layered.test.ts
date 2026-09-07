import { describe, expect, it } from "vitest";
import { generate, genLayered, PRESETS, type PresetKey } from "../src/core/camo.js";

const KEYS = ["multicam", "ocp"] as const satisfies readonly PresetKey[];
const SEEDS = [1234, 777, 211025];

function fractions(index: Uint8Array, count: number) {
  const bins = new Array(count).fill(0) as number[];
  for (const value of index) bins[value]++;
  return bins.map((value) => value / index.length);
}

function changedAdjacency(a: Uint8Array, b: Uint8Array, w: number, h: number) {
  let horizontal = 0;
  let vertical = 0;
  const changed = (i: number) => a[i] !== b[i];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!changed(i)) continue;
      if (changed(y * w + ((x + 1) % w))) horizontal++;
      if (changed(((y + 1) % h) * w + x)) vertical++;
    }
  }
  return { horizontal, vertical };
}

describe("genLayered", () => {
  for (const key of KEYS) {
    it(`${key}: 決定的、全 7 色、index 範囲内、SVG grid なし`, () => {
      const a = generate(key, 320, 256, 1234, 1);
      const b = generate(key, 320, 256, 1234, 1);
      expect(b.index).toEqual(a.index);
      expect(a.grid).toBeUndefined();
      expect(new Set(a.index)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
      expect(Math.max(...a.index)).toBeLessThan(PRESETS[key].colors.length);
    });

    it(`${key}: progress は単調増加し最後に 1`, () => {
      const seen: number[] = [];
      generate(key, 192, 160, 777, 1.5, { progress: (value) => seen.push(value) });
      expect(seen.length).toBeGreaterThan(3);
      expect(seen[0]).toBe(0);
      expect(seen.at(-1)).toBe(1);
      for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    });

    it(`${key}: tileable:false / scale / baseMax 経路で完走`, () => {
      const coarse = generate(key, 256, 192, 5, 0.7, { tileable: false, baseMax: 64 });
      const fine = generate(key, 256, 192, 5, 2, { baseMax: 128 });
      expect(coarse.index).toHaveLength(256 * 192);
      expect(fine.index).toHaveLength(256 * 192);
      expect(coarse.index).not.toEqual(fine.index);
    });

    it(`${key}: 背景と前景は独立層`, () => {
      const preset = PRESETS[key];
      const background = genLayered(256, 256, 1234, 1, { ...preset, layers: [] });
      const complete = generate(key, 256, 256, 1234, 1);
      const bgColors = new Set((preset.background as { colors: number[] }).colors);
      expect([...new Set(background.index)].every((color) => bgColors.has(color))).toBe(true);
      expect([...new Set(complete.index)].some((color) => !bgColors.has(color))).toBe(true);
      let changed = 0;
      for (let i = 0; i < complete.index.length; i++)
        if (complete.index[i] !== background.index[i]) changed++;
      expect(changed / complete.index.length).toBeGreaterThan(0.12);
    });

    it(`${key}: 3 seed すべてで各版が統計的面積を持つ`, () => {
      for (const seed of SEEDS) {
        const got = fractions(generate(key, 384, 384, seed, 1).index, 7);
        for (const fraction of got) expect(fraction).toBeGreaterThan(0.012);
        expect(got.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 8);
      }
    });
  }

  it("MultiCam の疎な縦要素と OCP の水平群生 micro を識別できる", () => {
    for (const seed of SEEDS) {
      const mcPreset = PRESETS.multicam;
      const ocpPreset = PRESETS.ocp;
      const mcFull = generate("multicam", 512, 512, seed, 1).index;
      const mcBase = genLayered(512, 512, seed, 1, {
        ...mcPreset,
        layers: (mcPreset.layers as { role?: string }[]).filter(
          (layer) => layer.role !== "vertical",
        ),
      }).index;
      const ocpFull = generate("ocp", 512, 512, seed, 1).index;
      const ocpBase = genLayered(512, 512, seed, 1, {
        ...ocpPreset,
        layers: (ocpPreset.layers as { role?: string }[]).filter((layer) => layer.role !== "micro"),
      }).index;
      const multicam = changedAdjacency(mcFull, mcBase, 512, 512);
      const ocp = changedAdjacency(ocpFull, ocpBase, 512, 512);
      expect(multicam.vertical / multicam.horizontal).toBeGreaterThan(1.04);
      expect(ocp.horizontal / ocp.vertical).toBeGreaterThan(1.12);
      expect(ocp.horizontal / ocp.vertical).toBeGreaterThan(
        multicam.horizontal / multicam.vertical + 0.2,
      );
    }
  });
});
