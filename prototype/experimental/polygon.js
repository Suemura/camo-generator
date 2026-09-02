// 候補A: camogen 方式 (ポリゴン再帰分割 + 隣接カラーブリード) の JS 移植・改良
// 出力: {w, h, index: Uint8Array} — camo.js 互換
'use strict';
import { mulberry32, randInt } from './rng.js';

/* ---------- ポリゴン再帰分割 ---------- */
function circumference(poly){
  let s = 0;
  for(let i=0;i<poly.length;i++){
    const a = poly[i], b = poly[(i+1)%poly.length];
    s += Math.hypot(b.x-a.x, b.y-a.y);
  }
  return s;
}
function splitEdgePoint(v1, v2, frac){
  return {x: v1.x + (v2.x-v1.x)*frac, y: v1.y + (v2.y-v1.y)*frac};
}
// 最長2辺を分割して結ぶ → 2ポリゴンに割る (camogen 同等)
function generatePolygons(rng, poly, minCircum, depth, out){
  if(circumference(poly) < minCircum || depth <= 0){ out.push(poly); return; }
  const n = poly.length;
  const lens = [];
  for(let i=0;i<n;i++){
    const a = poly[i], b = poly[(i+1)%n];
    lens.push({i, l: Math.hypot(b.x-a.x, b.y-a.y)});
  }
  lens.sort((p,q)=>q.l-p.l);
  const ia = Math.min(lens[0].i, lens[1].i);
  const ib = Math.max(lens[0].i, lens[1].i);
  const fracA = 0.4 + randInt(rng, 0, 3)/10;
  const fracB = 0.4 + randInt(rng, 0, 3)/10;
  const na = splitEdgePoint(poly[ia], poly[(ia+1)%n], fracA);
  const nb = splitEdgePoint(poly[ib], poly[(ib+1)%n], fracB);
  const pa = [], pb = [];
  for(let i=0;i<=ia;i++) pa.push(poly[i]);
  pa.push(na, nb);
  for(let i=ib+1;i<n;i++) pa.push(poly[i]);
  for(let i=ia+1;i<=ib;i++) pb.push(poly[i]);
  pb.push(nb, na);
  generatePolygons(rng, pb, minCircum, depth-1, out);
  generatePolygons(rng, pa, minCircum, depth-1, out);
}

/* ---------- ラスタライズ (凸ポリゴン スキャンライン) ---------- */
function rasterize(polys, w, h){
  const map = new Int32Array(w*h).fill(-1);
  for(let pi=0;pi<polys.length;pi++){
    const poly = polys[pi];
    let ymin = Infinity, ymax = -Infinity;
    for(const v of poly){ ymin = Math.min(ymin, v.y); ymax = Math.max(ymax, v.y); }
    ymin = Math.max(0, Math.ceil(ymin)); ymax = Math.min(h-1, Math.floor(ymax));
    for(let y=ymin;y<=ymax;y++){
      const xs = [];
      const cy = y + 0.5;
      for(let i=0;i<poly.length;i++){
        const a = poly[i], b = poly[(i+1)%poly.length];
        if((a.y <= cy && b.y > cy) || (b.y <= cy && a.y > cy)){
          xs.push(a.x + (cy - a.y) / (b.y - a.y) * (b.x - a.x));
        }
      }
      xs.sort((p,q)=>p-q);
      for(let k=0;k+1<xs.length;k+=2){
        const x0 = Math.max(0, Math.round(xs[k])), x1 = Math.min(w-1, Math.round(xs[k+1]));
        for(let x=x0;x<=x1;x++) map[y*w+x] = pi;
      }
    }
  }
  // 取りこぼし(-1)を左/上からコピー
  for(let i=0;i<w*h;i++){
    if(map[i] < 0) map[i] = i%w>0 && map[i-1]>=0 ? map[i-1] : (i>=w ? map[i-w] : 0);
  }
  return map;
}

/* ---------- 隣接グラフ ---------- */
function findNeighbours(map, w, h, nPoly){
  const nb = Array.from({length:nPoly}, ()=>new Set());
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i = y*w+x, a = map[i];
      if(x+1<w){ const b = map[i+1]; if(a!==b){ nb[a].add(b); nb[b].add(a); } }
      if(y+1<h){ const b = map[i+w]; if(a!==b){ nb[a].add(b); nb[b].add(a); } }
    }
  }
  return nb.map(s=>[...s]);
}

/* ---------- カラーブリード (面積比率制御つき) ---------- */
// ratios 指定時: 各色の残り面積予算に比例した重みで色を選ぶ → 面積比を統制
function colorPolygons(rng, nPoly, neighbours, nColors, bleed, order, areas, ratios){
  const color = new Int32Array(nPoly).fill(-1);
  let budget = null;
  if(ratios){
    const total = areas.reduce((a,b)=>a+b, 0);
    budget = ratios.map(r=>r*total);
  }
  function countSame(idx, c){
    let cnt = 0;
    for(const j of neighbours[idx]) if(color[j]===c) cnt++;
    return cnt;
  }
  function bleedFrom(idx, c, rest){
    color[idx] = c;
    if(budget) budget[c] -= areas[idx];
    if(rest<=0) return;
    let best = -1, bestCnt = -1;
    for(const j of neighbours[idx]){
      if(color[j]===-1){
        const cnt = countSame(j, c);
        if(cnt > bestCnt){ bestCnt = cnt; best = j; }
      }
    }
    if(best>=0) bleedFrom(best, c, rest-1);
  }
  function pickColor(){
    if(!budget) return randInt(rng, 0, nColors);
    let sum = 0;
    for(const b of budget) sum += Math.max(0, b);
    if(sum <= 0) return randInt(rng, 0, nColors);
    let r = rng() * sum;
    for(let c=0;c<nColors;c++){
      r -= Math.max(0, budget[c]);
      if(r <= 0) return c;
    }
    return nColors-1;
  }
  for(const i of order){
    if(color[i]===-1) bleedFrom(i, pickColor(), bleed);
  }
  return color;
}

/* ---------- 平滑化: 多数決フィルタ (角を丸め有機的輪郭に) ---------- */
export function modeFilter(index, w, h, radius, passes, nColors){
  let cur = index;
  const offs = [];
  for(let dy=-radius;dy<=radius;dy++)
    for(let dx=-radius;dx<=radius;dx++)
      if(dx*dx+dy*dy <= radius*radius) offs.push(dy*w+dx, dx, dy);
  const counts = new Int32Array(nColors);
  for(let p=0;p<passes;p++){
    const next = new Uint8Array(cur.length);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        counts.fill(0);
        for(let k=0;k<offs.length;k+=3){
          const nx = x+offs[k+1], ny = y+offs[k+2];
          if(nx<0||nx>=w||ny<0||ny>=h) continue;
          counts[cur[y*w+x + offs[k]]]++;
        }
        let best = 0;
        for(let c=1;c<nColors;c++) if(counts[c]>counts[best]) best = c;
        next[y*w+x] = best;
      }
    }
    cur = next;
  }
  return cur;
}

/* ---------- ピクセル化 (デジタル変換) ---------- */
export function pixelate(index, w, h, cellPx){
  const gw = Math.ceil(w/cellPx), gh = Math.ceil(h/cellPx);
  const out = new Uint8Array(w*h);
  for(let gy=0;gy<gh;gy++){
    for(let gx=0;gx<gw;gx++){
      // セル中央サンプル
      const sx = Math.min(w-1, gx*cellPx + (cellPx>>1));
      const sy = Math.min(h-1, gy*cellPx + (cellPx>>1));
      const c = index[sy*w+sx];
      for(let y=gy*cellPx;y<Math.min(h,(gy+1)*cellPx);y++)
        for(let x=gx*cellPx;x<Math.min(w,(gx+1)*cellPx);x++)
          out[y*w+x] = c;
    }
  }
  return out;
}

/* ---------- 生成入口 ---------- */
// opts: {polygonSize, maxDepth, colorBleed, nColors, smoothRadius, smoothPasses, cellPx, distortion}
export function genPolygonCamo(w, h, seed, opts={}){
  const {
    polygonSize = 100,   // これ未満の外周で分割停止
    maxDepth = 22,
    colorBleed = 6,
    nColors = 4,
    smoothRadius = 0,
    smoothPasses = 1,
    cellPx = 0,
    margin = 0.15,       // 端の切れ防止に外側へ拡張
    ratios = null,       // 色面積比 (例 [0.35,0.3,0.25,0.1])
  } = opts;
  const rng = mulberry32(seed);
  const mx = w*margin, my = h*margin;
  const start = [
    {x: w+mx, y: -my}, {x: -mx, y: -my}, {x: -mx, y: h+my}, {x: w+mx, y: h+my},
  ];
  const polys = [];
  generatePolygons(rng, start, polygonSize, maxDepth, polys);
  // シャッフル (彩色順のランダム化)
  const order = polys.map((_,i)=>i);
  for(let i=order.length-1;i>0;i--){
    const j = randInt(rng, 0, i+1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const map = rasterize(polys, w, h);
  const neighbours = findNeighbours(map, w, h, polys.length);
  const areas = new Float64Array(polys.length);
  for(let i=0;i<w*h;i++) areas[map[i]]++;
  const color = colorPolygons(rng, polys.length, neighbours, nColors, colorBleed, order, areas, ratios);
  let index = new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) index[i] = color[map[i]];
  if(smoothRadius > 0) index = modeFilter(index, w, h, smoothRadius, smoothPasses, nColors);
  if(cellPx > 1) index = pixelate(index, w, h, cellPx);
  return {type:'polygon', w, h, index};
}
