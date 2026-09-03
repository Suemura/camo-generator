// DBDU の小石層 (チョコレートチップ) の回帰ガード。
// 小石は genQuilt の平滑化・欠片除去の「後」に置くことで初めて成立する
// (先に置くと多数決ミップ・領域成長シーム・minFrag の欠片除去に消される)。
// この位置関係が崩れたことを検出するのが目的。
import { describe, expect, it } from "vitest";
import { generate, PRESETS, type PresetKey, registerSources } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";

registerSources(digsrc);

const CHIP = 3; // 小石ホワイト
const RIM = 4; // 黒縁

/** 値 v の 4 連結成分の面積一覧 */
function components(index: Uint8Array, w: number, h: number, v: number): number[] {
  const seen = new Uint8Array(w * h);
  const out: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || index[start] !== v) continue;
    const stack = [start];
    seen[start] = 1;
    let n = 0;
    while (stack.length) {
      const i = stack.pop() as number;
      n++;
      const x = i % w;
      const y = (i / w) | 0;
      const nb: number[] = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      for (const j of nb) {
        if (!seen[j] && index[j] === v) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    out.push(n);
  }
  return out;
}

describe("DBDU の小石層", () => {
  it("chips を持つのは dbdu だけ (他プリセットの出力に影響しない)", () => {
    const withChips = (Object.keys(PRESETS) as PresetKey[]).filter(
      (k) => (PRESETS[k] as { chips?: unknown }).chips,
    );
    expect(withChips).toEqual(["dbdu"]);
  });

  for (const seed of [1234, 777]) {
    for (const scale of [0.7, 1.0, 2.0]) {
      it(`seed ${seed} / scale ${scale}: 小石が残り黒縁が付く`, () => {
        const r = generate("dbdu", 512, 512, seed, scale);
        const comps = components(r.index, r.w, r.h, CHIP);
        // 平滑化・欠片除去の後に描いている証拠: minFrag (512px scale 1.0 で 110px) を
        // 下回る面積の小石が残っている
        expect(comps.length).toBeGreaterThanOrEqual(15);
        expect(Math.min(...comps)).toBeLessThan(110);
        // 黒縁が存在する
        expect(components(r.index, r.w, r.h, RIM).length).toBeGreaterThanOrEqual(15);
        // index は 5 値に収まる
        let max = 0;
        for (const v of r.index) if (v > max) max = v;
        expect(max).toBeLessThan(PRESETS.dbdu.colors.length);
      });
    }
  }

  it("小石はタイル境界をまたいで連続する (左右端の同じ行に小石が現れる)", () => {
    const r = generate("dbdu", 512, 512, 1234, 1.0);
    const w = r.w;
    let straddle = 0;
    for (let y = 0; y < r.h; y++) {
      const l = r.index[y * w];
      const right = r.index[y * w + w - 1];
      if (l >= CHIP && right >= CHIP) straddle++;
    }
    expect(straddle).toBeGreaterThan(0);
  });

  it("tileable:false でも例外なく完走する", () => {
    const r = generate("dbdu", 256, 256, 1234, 1.0, { tileable: false });
    expect(components(r.index, r.w, r.h, CHIP).length).toBeGreaterThan(0);
  });
});
