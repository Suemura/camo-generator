// Node 用レンダリングハーネス: 各プリセットを PNG 出力して目視確認する
import { PRESETS, generate, toRGBA } from './camo.js';
import zlib from 'node:zlib';
import fs from 'node:fs';

function crc32(buf){
  let c, table = crc32.table;
  if(!table){
    table = crc32.table = new Int32Array(256);
    for(let n=0;n<256;n++){
      c = n;
      for(let k=0;k<8;k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  c = 0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function writePng(path, rgba, w, h){
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=6; // 8bit RGBA
  const raw = Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){
    raw[y*(w*4+1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y*w*4, w*4).copy(raw, y*(w*4+1)+1);
  }
  const png = Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, {level:6})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path, png);
}

const outDir = process.argv[2] || './out';
fs.mkdirSync(outDir, {recursive:true});
const seed = parseInt(process.argv[3] || '1234');
const size = 512;
for(const [key, P] of Object.entries(PRESETS)){
  const t0 = Date.now();
  const res = generate(key, size, size, seed, 1.0);
  const rgba = toRGBA(res, P.colors.map(c=>c.hex));
  writePng(`${outDir}/${key}.png`, rgba, size, size);
  console.log(`${key}: ${Date.now()-t0}ms`);
}
