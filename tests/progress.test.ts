// 進捗コールバックと多段解像度: 進捗は単調増加で 1 に達する。2048 出力は 1024 基準の多段生成になり数秒で終わる
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generate, registerSources } from "../src/core/camo.js";
import * as digsrc from "../src/core/digsrc.js";

registerSources(digsrc);
const sha = (u8: Uint8Array) => createHash("sha1").update(u8).digest("hex");
const SLOW = { timeout: 60_000 }; // 2048 級の生成は数秒かかる

describe("progress / 多段解像度", () => {
  it("aor2 1536×768 (多段化経路 f=1.5): progress は単調増加で最後に 1", SLOW, () => {
    const seen: number[] = [];
    const r = generate("aor2", 1536, 768, 5, 1.0, { progress: (f) => seen.push(f) });
    expect(r.w).toBe(1536);
    expect(r.h).toBe(768);
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
  it("多段化する側 (f > 1) の回帰スナップショット", SLOW, () => {
    // 256 スナップショットは f = 1 なので、拡大ループ・kFull の回帰はここで検知する
    const snap = {
      aor2_1536x768: sha(generate("aor2", 1536, 768, 9, 1.0).index),
      woodland_1280x1280_s07: sha(generate("woodland", 1280, 1280, 9, 0.7).index),
    };
    expect(snap).toMatchSnapshot();
  });
  it("極端なアスペクト (4096×48) でも短辺は実寸を超えず正常終了", SLOW, () => {
    const r = generate("aor2", 4096, 48, 1, 1.0);
    expect(r.w).toBe(4096);
    expect(r.h).toBe(48);
    expect(r.index.length).toBe(4096 * 48);
  });
  it("baseMax 以下では多段化しない (1024 は直接生成と同一)", SLOW, () => {
    const a = generate("aor2", 1024, 768, 9, 1.0);
    const b = generate("aor2", 1024, 768, 9, 1.0, { baseMax: 99999 });
    expect(sha(a.index)).toBe(sha(b.index));
  });
});
