// 候補C: ランダム化クラスタ成長方式 (MARPAT 等デジタル迷彩向け)
// セルグリッド上で色ごとに「面積予算つきシード成長」。
// 成長選択の recency バイアスで蛇行クラスタ、random バイアスで塊状クラスタを作り分け。
// 出力: {w, h, index: Uint8Array} — camo.js 互換
'use strict';
import { mulberry32, randInt, randRange } from './rng.js';

/* ---------- 単一クラスタ成長 ----------
   grid: Uint8Array(gw*gh), 現色 map
   opts:
     color        塗る色
     target       セル数予算
     canEat       上書き可能な色の Set
     meander      0..1  高いほど蛇行 (recency バイアス)
     elongX/Y     方向バイアス (>1 でその軸に伸びやすい)
*/
function growCluster(grid, gw, gh, rng, sx, sy, o){
  const eat = o.canEat;
  if(!eat.has(grid[sy*gw+sx])) return 0;
  const frontier = [];  // {x, y}
  const inFront = new Set();
  const push = (x,y)=>{
    if(x<0||x>=gw||y<0||y>=gh) return;
    const i = y*gw+x;
    if(grid[i]===o.color || !eat.has(grid[i]) || inFront.has(i)) return;
    frontier.push({x,y}); inFront.add(i);
  };
  const sameNbr = (x,y)=>{
    let c = 0;
    if(x>0    && grid[y*gw+x-1]===o.color) c++;
    if(x<gw-1 && grid[y*gw+x+1]===o.color) c++;
    if(y>0    && grid[(y-1)*gw+x]===o.color) c++;
    if(y<gh-1 && grid[(y+1)*gw+x]===o.color) c++;
    return c;
  };
  grid[sy*gw+sx] = o.color;
  let placed = 1;
  push(sx+1,sy); push(sx-1,sy); push(sx,sy+1); push(sx,sy-1);
  // ドリフト方向: 緩やかに回転 → クラスタが蛇行しながら伸びる
  let drift = randRange(rng, 0, Math.PI*2);
  let cx = sx, cy = sy;   // 成長重心 (近似)
  while(placed < o.target && frontier.length){
    drift += (rng()-0.5) * (o.wander ?? 0.35);
    const dxu = Math.cos(drift), dyu = Math.sin(drift);
    // トーナメント選択: ランダム候補から最良スコアを取る
    const k = Math.min(frontier.length, 6);
    let bestIdx = -1, bestScore = -Infinity;
    for(let t=0;t<k;t++){
      const idx = randInt(rng, 0, frontier.length);
      const f = frontier[idx];
      // コンパクト性 (同色隣接) + ドリフト方向 + 伸長軸 + ノイズ
      const score = (o.compact ?? 1.0) * sameNbr(f.x, f.y)
        + (o.drift ?? 0) * ((f.x-cx)*dxu + (f.y-cy)*dyu) / Math.max(1, Math.hypot(f.x-cx, f.y-cy))
        + (o.elongX ?? 0) * Math.abs(f.x-cx) / Math.max(1, Math.hypot(f.x-cx, f.y-cy))
        + rng() * (o.jitter ?? 1.0);
      if(score > bestScore){ bestScore = score; bestIdx = idx; }
    }
    const {x, y} = frontier[bestIdx];
    frontier[bestIdx] = frontier[frontier.length-1];
    frontier.pop();
    const i = y*gw+x;
    inFront.delete(i);
    if(!eat.has(grid[i])) continue;
    grid[i] = o.color;
    placed++;
    cx += (x-cx)/Math.min(placed, 30);   // 移動平均重心 → 先端追従
    cy += (y-cy)/Math.min(placed, 30);
    push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1);
  }
  return placed;
}

/* ---------- 色レイヤ: 予算を複数クラスタに配分して成長 ----------
   sizes: [大クラスタ比率...] 例 [0.3,0.2,0.1,...] 残りは小クラスタ
*/
function growLayer(grid, gw, gh, rng, o){
  let budget = Math.round(gw*gh*o.ratio);
  // 層化シード: ジッタつきグリッドで全域に配る (偏在防止)
  let strat = null, si = 0;
  if(o.stratify){
    const n = o.stratify;
    strat = [];
    for(let gy=0;gy<n;gy++)
      for(let gx=0;gx<n;gx++)
        strat.push({x: Math.min(gw-1, Math.floor((gx+rng())*gw/n)),
                    y: Math.min(gh-1, Math.floor((gy+rng())*gh/n))});
    for(let i=strat.length-1;i>0;i--){
      const j = randInt(rng, 0, i+1);
      [strat[i], strat[j]] = [strat[j], strat[i]];
    }
  }
  let guard = 0;
  while(budget > 0 && guard++ < 4000){
    // シード位置: 層化グリッド → seedNear 指定色近傍 → 全域ランダム
    let sx, sy;
    if(strat && si < strat.length){
      ({x: sx, y: sy} = strat[si++]);
    }else{
      sx = randInt(rng, 0, gw); sy = randInt(rng, 0, gh);
    }
    if(o.seedNear !== undefined && !strat){
      let ok = false;
      for(let t=0;t<60 && !ok;t++){
        sx = randInt(rng, 0, gw); sy = randInt(rng, 0, gh);
        ok = grid[sy*gw+sx] === o.seedNear ||
             (sx>0 && grid[sy*gw+sx-1]===o.seedNear) ||
             (sy>0 && grid[(sy-1)*gw+sx]===o.seedNear);
      }
    }
    if(!o.canEat.has(grid[sy*gw+sx])) continue;
    const size = Math.min(budget, Math.round(randRange(rng, o.minSize, o.maxSize)));
    budget -= growCluster(grid, gw, gh, rng, sx, sy, {
      color: o.color, target: size, canEat: o.canEat,
      compact: o.compact, drift: o.drift, jitter: o.jitter,
      wander: o.wander, elongX: o.elongX,
    });
  }
}

/* ---------- スペックル: 境界近傍に 1セル飛び地 ---------- */
function speckle(grid, gw, gh, rng, {on, dot, density}){
  for(let y=1;y<gh-1;y++){
    for(let x=1;x<gw-1;x++){
      const i = y*gw+x;
      if(grid[i]!==on) continue;
      const nb = [grid[i-1], grid[i+1], grid[i-gw], grid[i+gw]];
      let edge = false;
      for(const q of nb) if(q!==on) edge = true;
      if(edge && rng() < density) grid[i] = dot;
    }
  }
}

/* ---------- MARPAT ウッドランド ---------- */
// 色: 0=タン 1=ライトグリーン 2=ダークグリーン 3=ブラウンブラック
export function genGrowthMarpat(w, h, seed, scale=1){
  const cellPx = Math.max(1, Math.round(4 * (w/512)));
  const gw = Math.ceil(w/cellPx), gh = Math.ceil(h/cellPx);
  const rng = mulberry32(seed ^ 0x9e37);
  const grid = new Uint8Array(gw*gh); // 0 = タン
  const A = gw*gh, k = scale*scale;
  // ライトグリーン: 大きめ蛇行クラスタ 群
  growLayer(grid, gw, gh, rng, {
    color: 1, ratio: 0.44, canEat: new Set([0]),
    minSize: A*0.006/k, maxSize: A*0.028/k,
    compact: 1.2, drift: 2.2, jitter: 1.3, wander: 0.4,
    stratify: 5,
  });
  // ダークグリーン: ライトグリーン近傍にシード、中型
  growLayer(grid, gw, gh, rng, {
    color: 2, ratio: 0.28, canEat: new Set([0,1]), seedNear: 1,
    minSize: A*0.003/k, maxSize: A*0.02/k,
    compact: 1.6, drift: 1.2, jitter: 1.2, wander: 0.35,
  });
  // ブラウンブラック: 緑近傍にシード、太い蛇行チェーン (タンにも食い込む)
  growLayer(grid, gw, gh, rng, {
    color: 3, ratio: 0.14, canEat: new Set([0,1,2]), seedNear: 2,
    minSize: A*0.003/k, maxSize: A*0.013/k,
    compact: 1.5, drift: 2.0, jitter: 1.0, wander: 0.45,
  });
  // 境界ディザ: 異色隣接セルを確率スワップ → 実物のギザギザ食い込み
  {
    const next = new Uint8Array(grid);
    for(let y=1;y<gh-1;y++){
      for(let x=1;x<gw-1;x++){
        const i = y*gw+x, c = grid[i];
        const nb = [grid[i-1], grid[i+1], grid[i-gw], grid[i+gw]];
        let diff = 0; for(const q of nb) if(q!==c) diff++;
        if(diff>0 && rng() < 0.35*diff/4) next[i] = nb[(rng()*4)|0];
      }
    }
    grid.set(next);
  }
  // スペックル (実物: 境界沿い 1セル飛び)
  speckle(grid, gw, gh, rng, {on: 1, dot: 0, density: 0.06});
  speckle(grid, gw, gh, rng, {on: 0, dot: 1, density: 0.05});
  speckle(grid, gw, gh, rng, {on: 2, dot: 3, density: 0.05});
  speckle(grid, gw, gh, rng, {on: 3, dot: 2, density: 0.04});
  // アップスケール
  const index = new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    const gy = Math.min(gh-1, (y/cellPx)|0);
    for(let x=0;x<w;x++){
      index[y*w+x] = grid[Math.min(gw-1,(x/cellPx)|0) + gy*gw];
    }
  }
  return {type:'growth', w, h, index, grid:{gw, gh, cellPx}};
}
