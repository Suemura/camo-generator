// pHYs チャンク: 正しい長さ・型・ppm・CRC
import { describe, expect, it } from "vitest";
import { physChunk } from "../src/lib/png";

describe("pHYs", () => {
  it("300dpi → 11811 ppm、unit=1、CRC 付き 21 バイト", () => {
    const c = physChunk(300);
    expect(c.length).toBe(4 + 4 + 9 + 4);
    const dv = new DataView(c.buffer);
    expect(dv.getUint32(0)).toBe(9);
    expect(String.fromCharCode(c[4], c[5], c[6], c[7])).toBe("pHYs");
    expect(dv.getUint32(8)).toBe(11811);
    expect(dv.getUint32(12)).toBe(11811);
    expect(c[16]).toBe(1);
    // 既知値: pHYs 11811x11811 unit 1 の CRC32
    expect(dv.getUint32(17).toString(16)).toBe("78a53f76"); // Python zlib.crc32 で検証済
  });
});
