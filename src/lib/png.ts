// PNG に pHYs チャンク (物理解像度) を挿入する。Photoshop 等で開いたとき指定 DPI の実寸として扱われる。
// canvas.toBlob の PNG は pHYs を持たないので IHDR 直後に差し込む。

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** dpi → pHYs チャンク (pixels per metre, unit=1) */
export function physChunk(dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const d = new Uint8Array(9);
  const dv = new DataView(d.buffer);
  dv.setUint32(0, ppm);
  dv.setUint32(4, ppm);
  d[8] = 1;
  return chunk("pHYs", d);
}

export async function withDpi(png: Blob, dpi: number): Promise<Blob> {
  const src = new Uint8Array(await png.arrayBuffer());
  // 8 byte signature + IHDR (4 len + 4 type + 13 data + 4 crc = 25)
  const ihdrEnd = 8 + 25;
  if (src.length < ihdrEnd || src[12] !== 0x49 /* I */) return png;
  // 既存 pHYs があれば除去
  const parts: Uint8Array[] = [src.subarray(0, ihdrEnd), physChunk(dpi)];
  let p = ihdrEnd;
  while (p + 8 <= src.length) {
    const len = new DataView(src.buffer, src.byteOffset + p).getUint32(0);
    const type = String.fromCharCode(src[p + 4], src[p + 5], src[p + 6], src[p + 7]);
    const end = p + 12 + len;
    if (type !== "pHYs") parts.push(src.subarray(p, end));
    p = end;
  }
  return new Blob(parts as BlobPart[], { type: "image/png" });
}
