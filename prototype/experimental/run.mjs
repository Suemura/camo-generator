// experimental レンダハーネス: node run.mjs <outdir> <seed>
import { writePng } from '../render.mjs';
import { toRGBA, PRESETS } from '../camo.js';
import { genPolygonCamo } from './polygon.js';
import { genShapeWoodland } from './shapes.js';
import { genGrowthMarpat } from './growth.js';
import fs from 'node:fs';

const outDir = process.argv[2] || './exp';
const seed = parseInt(process.argv[3] || '1234');
fs.mkdirSync(outDir, {recursive:true});
const size = 512;

const M81 = PRESETS.woodland.colors.map(c=>c.hex);
const MARPAT = PRESETS.marpat.colors.map(c=>c.hex);

const jobs = {
  // 候補A: ポリゴン分割
  'a_poly_m81': () => [genPolygonCamo(size, size, seed, {
    polygonSize: 140, maxDepth: 24, colorBleed: 7, nColors: 4,
    smoothRadius: 8, smoothPasses: 2,
    ratios: [0.30, 0.32, 0.26, 0.12],
  }), M81],
  'a_poly_marpat': () => [genPolygonCamo(size, size, seed+1, {
    polygonSize: 70, maxDepth: 26, colorBleed: 4, nColors: 4,
    smoothRadius: 3, smoothPasses: 1, cellPx: 4,
    ratios: [0.27, 0.33, 0.27, 0.13],
  }), MARPAT],
  // 候補B: シェイプ配置
  'b_shape_m81': () => [genShapeWoodland(size, size, seed), M81],
  // 候補C: クラスタ成長
  'c_growth_marpat': () => [genGrowthMarpat(size, size, seed), MARPAT],
};

for(const [name, fn] of Object.entries(jobs)){
  const t0 = Date.now();
  const [res, pal] = fn();
  writePng(`${outDir}/${name}.png`, toRGBA(res, pal), res.w, res.h);
  console.log(`${name}: ${Date.now()-t0}ms`);
}
