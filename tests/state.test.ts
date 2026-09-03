// URL ⇄ 状態: 往復で情報が失われない / 不正値は既定値に戻る / 既定値は URL に出ない
import { describe, expect, it } from "vitest";
import { DEFAULT_STATE, parseState, serializeState } from "../src/lib/state";
import { outputPx } from "../src/lib/units";

describe("URL 状態", () => {
  it("既定状態は空クエリ", () => {
    expect(serializeState(DEFAULT_STATE)).toBe("");
    expect(parseState("")).toEqual(DEFAULT_STATE);
  });
  it("往復で一致する", () => {
    const s = {
      ...DEFAULT_STATE,
      preset: "marpat" as const,
      seed: 42,
      scale: 1.35,
      palette: ["#112233", "#445566", "#778899", "#aabbcc"],
      w: 2048,
      h: 1024,
      tileable: false,
    };
    expect(parseState(serializeState(s))).toEqual(s);
  });
  it("実寸モードの往復", () => {
    const s = { ...DEFAULT_STATE, unit: "mm" as const, w: 210, h: 297, dpi: 150 };
    const q = serializeState(s);
    expect(q).toContain("u=mm");
    expect(parseState(q)).toEqual(s);
    expect(outputPx(s)).toEqual({ w: 1240, h: 1754, over: false });
  });
  it("不正値は既定値にフォールバック", () => {
    const s = parseState("?p=nope&s=abc&k=99&c=zz,1,2,3&w=-5&d=1");
    expect(s.preset).toBe("woodland");
    expect(s.seed).toBe(DEFAULT_STATE.seed);
    expect(s.scale).toBe(2.5);
    expect(s.palette).toBeNull();
    expect(s.w).toBe(512);
  });
  it("パレット色数がプリセットと合わなければ無視", () => {
    expect(parseState("?p=ucp&c=111111,222222,333333,444444").palette).toBeNull();
    expect(parseState("?p=ucp&c=111111,222222,333333").palette).toEqual([
      "#111111",
      "#222222",
      "#333333",
    ]);
  });
});
