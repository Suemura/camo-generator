// 進捗コールバックと多段解像度: 進捗は単調増加で 1 に達する。2048 出力は 1024 基準の多段生成になり数秒で終わる
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generate, registerSources } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";

registerSources(digsrc);
const sha = (u8: Uint8Array) => createHash("sha1").update(u8).digest("hex");
const SLOW = { timeout: 60_000 }; // 2048 級の生成は数秒かかる

describe("progress / 多段解像度", () => {
  it("woodland 2048: progress は単調増加で最後に 1", SLOW, () => {
    const seen: number[] = [];
    const r = generate("woodland", 2048, 1024, 5, 1.0, { progress: (f) => seen.push(f) });
    expect(r.w).toBe(2048);
    expect(r.h).toBe(1024);
    expect(seen.length).toBeGreaterThan(3);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(seen.at(-1)).toBe(1);
    // 拡大後も色インデックスは範囲内
    let max = 0;
    for (const v of r.index) if (v > max) max = v;
    expect(max).toBeLessThan(4);
  });
  it("marpat: progress は単調増加で最後に 1", () => {
    const seen: number[] = [];
    generate("marpat", 512, 512, 5, 1.0, { progress: (f) => seen.push(f) });
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    expect(seen.at(-1)).toBe(1);
  });
  it("baseMax 以下では多段化しない (1024 は直接生成と同一)", SLOW, () => {
    const a = generate("aor2", 1024, 768, 9, 1.0);
    const b = generate("aor2", 1024, 768, 9, 1.0, { baseMax: 99999 });
    expect(sha(a.index)).toBe(sha(b.index));
  });
});
