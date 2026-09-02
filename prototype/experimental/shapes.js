// 候補B: シェイプ配置方式 (形状文法)
// - 大斑: ランダムウォーク沿いに楕円スタンプの合併 → 指状突起のある有機ブロブ
// - 黒枝: 慣性つきランダムウォーク + 分岐 + 可変太さ → M81 の「デザインされた黒枝」
// 出力: {w, h, index: Uint8Array} — camo.js 互換
'use strict';
import { mulberry32, randRange, randInt, noise1d } from './rng.js';
import { modeFilter } from './polygon.js';

/* ---------- 楕円スタンプ ---------- */
function stampEllipse(index, w, h, cx, cy, rx, ry, color){
  const x0 = Math.max(0, Math.floor(cx-rx)), x1 = Math.min(w-1, Math.ceil(cx+rx));
  const y0 = Math.max(0, Math.floor(cy-ry)), y1 = Math.min(h-1, Math.ceil(cy+ry));
  const irx2 = 1/(rx*rx), iry2 = 1/(ry*ry);
  for(let y=y0;y<=y1;y++){
    const dy = y-cy;
    for(let x=x0;x<=x1;x++){
      const dx = x-cx;
      if(dx*dx*irx2 + dy*dy*iry2 <= 1) index[y*w+x] = color;
    }
  }
}

/* ---------- ブロブ: ウォーク沿い楕円合併 (指状ローブ) ---------- */
// opts: {steps, r0, r1, elongX, turn, branchP, branchScale}
function stampBlob(index, w, h, rng, cx, cy, color, o){
  let heading = randRange(rng, 0, Math.PI*2);
  let x = cx, y = cy;
  const n1 = noise1d(rng);
  for(let s=0;s<o.steps;s++){
    const t = s/(o.steps-1 || 1);
    // 端は細く(テーパー) → 指状先端
    const taper = 0.55 + 0.45*Math.sin(Math.PI*Math.min(1, t*1.4));
    const r = (o.r0 + (o.r1-o.r0)*n1(s*0.35)) * taper;
    stampEllipse(index, w, h, x, y, r*o.elongX, r, color);
    heading += (n1(s*0.5+40) - 0.5) * o.turn;
    // 横方向優先の移動
    x += Math.cos(heading) * r * 0.75 * o.elongX;
    y += Math.sin(heading) * r * 0.55;
    // 分岐 → 指
    if(rng() < o.branchP && o.branchScale > 0.25){
      const sub = {...o, steps: Math.max(2, (o.steps*0.35)|0),
        r0: o.r0*o.branchScale, r1: o.r1*o.branchScale,
        branchP: o.branchP*0.5, branchScale: o.branchScale*0.7};
      stampBlob(index, w, h, rng, x, y, color, sub);
    }
  }
}

/* ---------- 黒枝: 慣性ウォーク + 分岐 + 可変太さ ---------- */
// opts: {len, step, w0, w1, turn, branchP, minW}
function drawBranch(index, w, h, rng, x, y, heading, color, o, depth=0){
  const n1 = noise1d(rng);
  let width = randRange(rng, o.w0, o.w1);
  for(let s=0;s<o.len;s++){
    const t = s/o.len;
    // 端テーパー + 途中の瘤 (0.55〜1.6 倍・緩やか) → 太細のリズム
    const bump = 0.65 + 0.85 * n1(s*0.10);
    const taperEnd = Math.min(1, (o.len-s)/ (o.len*0.25));
    const rw = Math.max(o.minW, width * bump * taperEnd);
    stampEllipse(index, w, h, x, y, rw, rw, color);
    heading += (n1(s*0.3+77) - 0.5) * o.turn;
    // ステップは太さに追従 → 点線化防止・細部で滑らか
    const st = Math.min(o.step, rw*0.8);
    x += Math.cos(heading) * st;
    y += Math.sin(heading) * st;
    if(x<-20||x>w+20||y<-20||y>h+20) break;
    // 分岐: 60〜110° 逸れる子枝 (1段のみ・控えめ → もつれ防止)
    if(depth < 1 && rng() < o.branchP){
      const side = rng() < 0.5 ? 1 : -1;
      const child = {...o, len: Math.max(8, (o.len*randRange(rng,0.25,0.4))|0),
        w0: o.w0*0.8, w1: o.w1*0.8, branchP: 0};
      drawBranch(index, w, h, rng, x, y, heading + side*randRange(rng, 1.0, 1.9), color, child, depth+1);
    }
  }
}

function coverage(index, color){
  let c = 0;
  for(let i=0;i<index.length;i++) if(index[i]===color) c++;
  return c / index.length;
}

/* ---------- M81 ウッドランド ---------- */
export function genShapeWoodland(w, h, seed, scale=1){
  const rng = mulberry32(seed ^ 0x5bd1);
  const S = (w/512) / scale;   // サイズ係数
  const index = new Uint8Array(w*h);  // 0 = サンド
  // 1. 緑ブロブ: 大型・横伸長。カバレッジ ~55% まで追加
  let guard = 0;
  while(coverage(index, 1) < 0.55 && guard++ < 60){
    stampBlob(index, w, h, rng, randRange(rng,-w*0.05,w*1.05), randRange(rng,-h*0.05,h*1.05), 1, {
      steps: randInt(rng, 6, 12), r0: 40*S, r1: 66*S, elongX: 1.45,
      turn: 1.0, branchP: 0.3, branchScale: 0.5,
    });
  }
  // 2. 茶ブロブ: 中型、緑に食い込む → インターロック
  guard = 0;
  while(coverage(index, 2) < 0.27 && guard++ < 60){
    stampBlob(index, w, h, rng, randRange(rng,-w*0.05,w*1.05), randRange(rng,-h*0.05,h*1.05), 2, {
      steps: randInt(rng, 5, 9), r0: 26*S, r1: 44*S, elongX: 1.6,
      turn: 1.2, branchP: 0.35, branchScale: 0.5,
    });
  }
  // 3. 輪郭平滑化 (黒枝の前 — 黒のディテールは保持)
  let sm = modeFilter(index, w, h, Math.max(2, Math.round(5*S)), 2, 3);
  // 4. 黒枝: 長く流れる連結枝 (横方向基調) + まれな分岐。層化配置
  const cells = 3;   // 3x3、確率 0.65 → 平均 ~6本の中長枝が分散
  for(let gy=0; gy<cells; gy++){
    for(let gx=0; gx<cells; gx++){
      if(rng() > 0.65) continue;
      const x = (gx + randRange(rng, 0.15, 0.85)) * w/cells;
      const y = (gy + randRange(rng, 0.15, 0.85)) * h/cells;
      // 横方向 ±40° を基調に (実物は横に流れる)
      const base = (rng()<0.5 ? 0 : Math.PI) + randRange(rng, -0.7, 0.7);
      drawBranch(sm, w, h, rng, x, y, base, 3, {
        len: randInt(rng, 45, 85), step: 4.0*S,
        w0: 6.5*S, w1: 10.0*S, minW: 2.6*S,
        turn: 0.22, branchP: 0.045,
      });
    }
  }
  return {type:'shape', w, h, index: sm};
}
