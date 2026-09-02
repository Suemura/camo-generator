// 迷彩生成コア (browser / node 共用, 依存なし)
// すべて座標ハッシュベースの決定的生成。同一シード → 同一結果。
'use strict';
import { M81_SRC_W, M81_SRC_H, M81_SRC_RLE } from './m81src.js';

/* ================= 決定的乱数・ノイズ ================= */
export function hash2(ix, iy, seed){
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed|0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function fade(t){ return t*t*t*(t*(t*6-15)+10); }
export function vnoise(x, y, seed){
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = hash2(ix, iy, seed),   b = hash2(ix+1, iy, seed);
  const c = hash2(ix, iy+1, seed), d = hash2(ix+1, iy+1, seed);
  const u = fade(fx), v = fade(fy);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
export function fbm(x, y, seed, oct, lac=2, gain=0.5){
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for(let i=0;i<oct;i++){
    sum += amp * vnoise(x*f, y*f, seed + i*101);
    norm += amp; amp *= gain; f *= lac;
  }
  return sum / norm;
}
export function quantile(field, q){
  const n = field.length, step = Math.max(1, Math.floor(n/20000));
  const s = [];
  for(let i=0;i<n;i+=step) s.push(field[i]);
  s.sort((a,b)=>a-b);
  return s[Math.min(s.length-1, Math.max(0, Math.floor(q*s.length)))];
}
export function hexToRgb(hex){
  const v = parseInt(hex.slice(1), 16);
  return [(v>>16)&255, (v>>8)&255, v&255];
}

function genField(w, h, seed, opt){
  const {freqX, freqY, warp=0, oct=4, warpFreq=0.006, warpOct=3, gain=0.5,
         warp2=0, warpFreq2=0.02} = opt;
  const out = new Float32Array(w*h);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      let sx = x, sy = y;
      if(warp){
        sx += (fbm(x*warpFreq, y*warpFreq, seed+31, warpOct, 2, .5) - .5) * warp;
        sy += (fbm(x*warpFreq, y*warpFreq, seed+57, warpOct, 2, .5) - .5) * warp;
      }
      if(warp2){ // 細かい第2ワープ: 輪郭に指状の揺らぎを与える
        sx += (fbm(x*warpFreq2, y*warpFreq2, seed+73, 2, 2, .5) - .5) * warp2;
        sy += (fbm(x*warpFreq2, y*warpFreq2, seed+89, 2, 2, .5) - .5) * warp2;
      }
      out[y*w+x] = fbm(sx*freqX, sy*freqY, seed, oct, 2, gain);
    }
  }
  return out;
}

/* ================= ウッドランド (M81) =================
   実物特徴:
   - 滑らかで丸みのある大型斑。横方向に伸長し、指状の突起・湾曲
   - 緑/茶/サンドが相互に入り組む(インターロック)
   - 黒は「可変太さの枝」: 細く走り、所々で瘤状に太る。等幅の縞ではない */
export function genWoodland(w, h, seed, scale){
  const base = (3.0 * scale) / w;
  // 少オクターブ + 強ワープ = 滑らかで有機的な輪郭
  const o = {freqX: base*0.7, freqY: base*1.25, warp: w*0.28, warpFreq: 2.6/w, oct: 3, gain: 0.55, warp2: w*0.045, warpFreq2: 9/w};
  const g = genField(w, h, seed+11, o);
  const b = genField(w, h, seed+23, o);
  // 黒の芯線フィールド(伸長強め)と太さ変調フィールド
  const k  = genField(w, h, seed+47, {freqX: base*0.75, freqY: base*1.8, warp: w*0.12, warpFreq: 2.2/w, oct: 3, gain: 0.42});
  const kw = genField(w, h, seed+71, {freqX: base*3.2,  freqY: base*2.6, oct: 2});
  const qg = quantile(g, 0.47);   // 広範囲ソース実測: サンド~24% 緑~27%
  const qb = quantile(b, 0.60);   // 茶 ~33%
  const kc1 = quantile(k, 0.30), kc2 = quantile(k, 0.70);
  // 勾配場: 極値近傍(勾配小)を除外して閉ループ発生を防ぐ
  const gm = new Float32Array(w*h);
  for(let y=1;y<h-1;y++)
    for(let x=1;x<w-1;x++){
      const i=y*w+x;
      gm[i] = Math.hypot(k[i+1]-k[i-1], k[i+w]-k[i-w])*0.5;
    }
  const qgm = quantile(gm, 0.22);
  const out = new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const i = y*w+x;
      let c = 0;
      if(g[i] > qg) c = 1;
      if(b[i] > qb) c = 2;
      // 枝状の黒: 等高線バンドを勾配で正規化し、太さをピクセル単位で制御。
      // 幅は別ノイズで 0〜14px に変調 → テーパー・瘤・途切れ
      const gmag = gm[i] + 1e-6;
      const widthPx = Math.min(13*(w/512), Math.max(0, (kw[i] - 0.37)) * 48 * (w/512));
      if(gm[i] > qgm && (Math.abs(k[i] - kc1) < gmag*widthPx || Math.abs(k[i] - kc2) < gmag*widthPx)) c = 3;
      out[i] = c;
    }
  }
  return {type:'organic', w, h, index: out};
}

/* ================= デジタル系 共通エンジン =================
   実系譜どおり CADPAT→MARPAT→AOR/UCP は同族。共通基盤 + パターン別パラメータと後処理。
   実物特徴の再現:
   - マクロ(大きな島) + メソ(中斑) の2スケール構造
   - 境界のギザギザ: セル単位の境界ディザ(隣接色への確率的スワップ)
   - スペックル: 境界付近に散る 1セルの飛び地
*/
export function genDigital(w, h, seed, scale, P){
  const cellPx = Math.max(1, Math.round(P.cell * (w/512)));
  const gw = Math.ceil(w/cellPx), gh = Math.ceil(h/cellPx);
  const n = P.ratios.length;
  const ax = P.aspectX ?? 1, ay = P.aspectY ?? 1; // >1 でその軸方向に細かく(=直交方向に伸長)
  const fLo = (P.macroFreq ?? 3.2) * scale / gw;
  const fMi = (P.mesoFreq  ?? 8.0) * scale / gw;
  // マクロ(緩い密度ムラ) + メソ(主テクスチャ)
  const macro = genField(gw, gh, seed+7,  {freqX: fLo*ax, freqY: fLo*ay, warp: gw*0.20, warpFreq: 2.8/gw, oct: 3, gain: 0.55});
  const meso  = genField(gw, gh, seed+13, {freqX: fMi*ax, freqY: fMi*ay, warp: gw*0.08, warpFreq: 6/gw,   oct: 3});
  const field = new Float32Array(gw*gh);
  const wMacro = P.macroWeight ?? 0.55;
  const sc = P.superCell ?? 1;  // >1: 粗ブロック単位でサンプル → 角張った階段輪郭
  for(let y=0;y<gh;y++){
    const sy = sc>1 ? Math.min(gh-1, ((y/sc)|0)*sc) : y;
    for(let x=0;x<gw;x++){
      const sx = sc>1 ? Math.min(gw-1, ((x/sc)|0)*sc) : x;
      field[y*gw+x] = wMacro*macro[sy*gw+sx] + (1-wMacro)*meso[sy*gw+sx];
    }
  }
  // 面積比どおり量子化
  const th = []; let acc = 0;
  for(let i=0;i<n-1;i++){ acc += P.ratios[i]; th.push(quantile(field, acc)); }
  let cc = new Uint8Array(gw*gh);
  for(let i=0;i<gw*gh;i++){
    const v = field[i]; let ci = n-1;
    for(let j=0;j<n-1;j++){ if(v <= th[j]){ ci = j; break; } }
    cc[i] = ci;
  }
  // 境界ディザ: 隣接セルと色が違う所で確率スワップ → ギザギザ + 食い込み
  const ditherP = P.dither ?? 0.45;
  for(let pass=0; pass<(P.ditherPasses ?? 2); pass++){
    const next = new Uint8Array(cc);
    for(let y=1;y<gh-1;y++){
      for(let x=1;x<gw-1;x++){
        const i = y*gw+x, c = cc[i];
        const nb = [cc[i-1], cc[i+1], cc[i-gw], cc[i+gw]];
        let diff = 0; for(const q of nb) if(q!==c) diff++;
        if(diff>0 && hash2(x, y, seed+900+pass) < ditherP*diff/4){
          next[i] = nb[(hash2(x, y, seed+950+pass)*4)|0];
        }
      }
    }
    cc = next;
  }
  // ツイッグ: 蛇行する細枝(AOR2/MARPAT の黒系要素)。等高線バンドをセル量子化
  for(const tw of (P.twigs ?? [])){
    const tf = genField(gw, gh, seed+400+tw.color*31, {
      freqX: (tw.freq ?? 10)*scale/gw*(tw.aspectX ?? 1),
      freqY: (tw.freq ?? 10)*scale/gw*(tw.aspectY ?? 1),
      warp: gw*0.12, warpFreq: 5/gw, oct: 3,
    });
    const wf = genField(gw, gh, seed+460+tw.color*17, {freqX: 14*scale/gw, freqY: 14*scale/gw, oct: 2});
    const c0 = quantile(tf, 0.5);
    // 勾配マスクで極値近傍の閉ループを防ぐ
    const gmT = new Float32Array(gw*gh);
    for(let y=1;y<gh-1;y++)
      for(let x=1;x<gw-1;x++){
        const i=y*gw+x;
        gmT[i] = Math.hypot(tf[i+1]-tf[i-1], tf[i+gw]-tf[i-gw])*0.5;
      }
    const qgmT = quantile(gmT, tw.maskQ ?? 0.15);
    for(let y=0;y<gh;y++){
      const sy = sc>1 ? Math.min(gh-1, ((y/sc)|0)*sc) : y;
      for(let x=0;x<gw;x++){
        // superCell ブロックでサンプル → 枝も角張った階段状に
        const j = sy*gw + (sc>1 ? Math.min(gw-1, ((x/sc)|0)*sc) : x);
        const thick = Math.max(0, wf[j] - (tw.gate ?? 0.42)) * (tw.width ?? 0.10);
        if(gmT[j] > qgmT && Math.abs(tf[j] - c0) < thick) cc[y*gw+x] = tw.color;
      }
    }
  }
  // スペックル: 境界近傍に散る1セル飛び地(実物は境界沿いに群れる)。
  // 低周波マスクで密度ムラも付与
  const speckles = P.speckle ?? [];
  if(speckles.length){
    // 各セルの「境界からの近さ」: 半径2以内に異色があるか
    const nearEdge = new Uint8Array(gw*gh);
    for(let y=2;y<gh-2;y++){
      for(let x=2;x<gw-2;x++){
        const i = y*gw+x, c = cc[i];
        let e = 0;
        for(let dy=-2;dy<=2 && !e;dy++)
          for(let dx=-2;dx<=2;dx++)
            if(cc[i+dy*gw+dx]!==c){ e=1; break; }
        nearEdge[i] = e;
      }
    }
    for(const sp of speckles){
      for(let y=2;y<gh-2;y++){
        for(let x=2;x<gw-2;x++){
          const i = y*gw+x;
          if(cc[i]!==sp.on || !nearEdge[i]) continue;
          const clump = 0.25 + 1.6*fbm(x*0.06, y*0.06, seed+1200+sp.dot*13, 2, 2, .5);
          if(hash2(x, y, seed+1300+sp.dot*7) < sp.density*clump*3){
            cc[i] = sp.dot;
          }
        }
      }
    }
  }
  // 孤立ノイズ除去はしない(実物も1セル飛びが多数)
  const out = new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    const gy = Math.min(gh-1, (y/cellPx)|0);
    for(let x=0;x<w;x++){
      out[y*w+x] = cc[Math.min(gw-1,(x/cellPx)|0) + gy*gw];
    }
  }
  return {type:'digital', w, h, index: out, grid:{gw, gh, cellPx, cellColor: cc}};
}


/* ================= 新手法: 形状文法 / クラスタ成長 =================
   experimental/ (shapes.js, growth.js) からの統合移植。 */
export function mulberry32(seed){
  let a = seed | 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, lo, hi){ return lo + Math.floor(rng() * (hi - lo)); }
function randRange(rng, lo, hi){ return lo + rng() * (hi - lo); }
function noise1d(rng){
  const g = [];
  for(let i=0;i<256;i++) g.push(rng());
  return function(x){
    const ix = Math.floor(x) & 255, fx = x - Math.floor(x);
    const u = fx*fx*(3-2*fx);
    return g[ix] + (g[(ix+1)&255] - g[ix]) * u;
  };
}
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
// 黒枝: 慣性ランダムウォーク + 分岐 + 可変太さ(瘤/テーパー)
function drawBranch(index, w, h, rng, x, y, heading, color, o, depth=0){
  const n1 = noise1d(rng);
  let width = randRange(rng, o.w0, o.w1);
  for(let s=0;s<o.len;s++){
    const bump = 0.65 + 0.85 * n1(s*0.10);
    const taperEnd = Math.min(1, (o.len-s) / (o.len*0.25));
    const rw = Math.max(o.minW, width * bump * taperEnd);
    stampEllipse(index, w, h, x, y, rw, rw, color);
    heading += (n1(s*0.3+77) - 0.5) * o.turn;
    const st = Math.min(o.step, rw*0.8);
    x += Math.cos(heading) * st;
    y += Math.sin(heading) * st;
    if(x<-20||x>w+20||y<-20||y>h+20) break;
    if(depth < 1 && rng() < o.branchP){
      const side = rng() < 0.5 ? 1 : -1;
      const child = {...o, len: Math.max(8, (o.len*randRange(rng,0.25,0.4))|0),
        w0: o.w0*0.8, w1: o.w1*0.8, branchP: 0};
      drawBranch(index, w, h, rng, x, y, heading + side*randRange(rng, 1.0, 1.9), color, child, depth+1);
    }
  }
}

/* ---- M81 新手法 v2: 形状文法地形 + 改良黒枝 ----
   実物構造: 緑/茶の巨大領域 + 横に蛇行するサンド帯 + 鹿角状の太い黒枝 */
// 多数決フィルタ: 輪郭の融合・平滑化
function modeFilter(index, w, h, radius, passes, nColors){
  let cur = index;
  const offs = [];
  for(let dy=-radius;dy<=radius;dy++)
    for(let dx=-radius;dx<=radius;dx++)
      if(dx*dx+dy*dy <= radius*radius) offs.push(dx, dy);
  const counts = new Int32Array(nColors);
  for(let p=0;p<passes;p++){
    const next = new Uint8Array(cur.length);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        counts.fill(0);
        for(let k=0;k<offs.length;k+=2){
          const nx = x+offs[k], ny = y+offs[k+1];
          if(nx<0||nx>=w||ny<0||ny>=h) continue;
          counts[cur[ny*w+nx]]++;
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
// サンド帯: 横方向に蛇行する太い川ストローク
function drawRiver(index, w, h, rng, y0, color, S){
  const n1 = noise1d(rng);
  let x = -20, y = y0;
  let heading = randRange(rng, -0.3, 0.3);
  const wBase = randRange(rng, 20, 34) * S;
  for(let s2=0; x < w+20; s2++){
    const rw = wBase * (0.45 + 1.0 * n1(s2*0.045));
    stampEllipse(index, w, h, x, y, rw*1.8, rw, color);
    heading += (n1(s2*0.09+50) - 0.5) * 0.55;
    heading *= 0.975;  // 緩い横方向復元 (蛇行を許す)
    x += Math.cos(heading) * rw * 0.8;
    y += Math.sin(heading) * rw * 0.8;
    if(rng() < 0.09){  // 支流: 短い斜めの張り出し
      const side = rng()<0.5?1:-1;
      let bx = x, by = y, bh = heading + side*randRange(rng,0.7,1.3);
      for(let t=0;t<randInt(rng,3,7);t++){
        const brw = rw*randRange(rng,0.45,0.8);
        stampEllipse(index, w, h, bx, by, brw*1.4, brw, color);
        bh += (rng()-0.5)*0.3;
        bx += Math.cos(bh)*brw; by += Math.sin(bh)*brw;
      }
    }
  }
}
// 黒枝 v2: 低周波の太さリズム + 丸い先端 + 瘤 + まれな急カーブ
function drawBranch2(index, w, h, rng, x, y, heading, color, o, depth=0){
  const n1 = noise1d(rng);
  const width = randRange(rng, o.w0, o.w1);
  const baseAng = heading;
  for(let s2=0;s2<o.len;s2++){
    const t = s2/o.len;
    const rhythm = 0.75 + 0.5 * n1(s2*0.06);            // 長い太細リズム
    const tip = t > 0.75 ? Math.max(0.2, (1-t)/0.25) : 1; // 先端: 尖って収束
    const rw = Math.max(o.minW, width * rhythm * tip);
    stampEllipse(index, w, h, x, y, rw, rw, color);
    if(rng() < 0.02) stampEllipse(index, w, h, x, y, rw*1.45, rw*1.2, color); // 瘤
    heading += (n1(s2*0.28+77) - 0.5) * o.turn;
    // 基準方位 ±maxDev に緩くクランプ → 絡み防止・横流れ維持
    const dev = heading - baseAng;
    const maxDev = o.maxDev ?? 0.8;
    if(dev >  maxDev) heading = baseAng + maxDev;
    if(dev < -maxDev) heading = baseAng - maxDev;
    const st = Math.min(o.step, rw*0.75);
    x += Math.cos(heading) * st;
    y += Math.sin(heading) * st;
    if(x<-20||x>w+20||y<-20||y>h+20) break;
    if(depth < 1 && (o._kids ?? 0) < 2 && rng() < o.branchP){
      o._kids = (o._kids ?? 0) + 1;
      const side = rng() < 0.5 ? 1 : -1;
      const child = {...o, len: Math.max(10, (o.len*randRange(rng,0.3,0.5))|0),
        w0: o.w0*0.85, w1: o.w1*0.85, branchP: 0, _kids: 0};
      drawBranch2(index, w, h, rng, x, y, heading + side*randRange(rng, 0.9, 1.7), color, child, depth+1);
    }
  }
}
export function genWoodlandHybrid(w, h, seed, scale){
  const S = (w/512) / scale;
  const base = (2.7 * scale) / w;
  // 地形: fbm 3層 + 平滑化。横伸長強め (実物のサンド帯の流れ)
  const o = {freqX: base*0.62, freqY: base*1.35, warp: w*0.28, warpFreq: 2.6/w, oct: 3, gain: 0.55, warp2: w*0.045, warpFreq2: 9/w};
  const g = genField(w, h, seed+11, o);
  const b = genField(w, h, seed+23, o);
  const qg = quantile(g, 0.47);
  const qb = quantile(b, 0.60);
  const index = new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){
    let c = 0;
    if(g[i] > qg) c = 1;
    if(b[i] > qb) c = 2;
    index[i] = c;
  }
  // 平滑化: ベクタ的な丸い輪郭に
  const sm = modeFilter(index, w, h, Math.max(2, Math.round(3*S)), 2, 3);
  // 黒枝: 鹿角状 (drawBranch2)
  const rng = mulberry32(seed ^ 0x5bd1);
  const cells = Math.max(2, Math.min(8, Math.round(4*scale)));
  const wantBranches = Math.max(2, Math.round(cells*cells*0.5));
  let drawn = 0;
  for(let pass=0; pass<3 && drawn<wantBranches; pass++){
    for(let gy=0; gy<cells && drawn<wantBranches; gy++){
      for(let gx=0; gx<cells && drawn<wantBranches; gx++){
        if(pass===0 && rng() > 0.55) continue;
        if(pass>0 && rng() > 0.35) continue;
        const x = (gx + randRange(rng, 0.15, 0.85)) * w/cells;
        const y = (gy + randRange(rng, 0.2, 0.8)) * h/cells;
        const baseAng = (rng()<0.5 ? 0 : Math.PI) + randRange(rng, -0.45, 0.45);
        drawBranch2(sm, w, h, rng, x, y, baseAng, 3, {
          len: randInt(rng, 30, 56), step: 4.0*S,
          w0: 9*S, w1: 16*S, minW: 2.2*S,
          turn: 0.16, branchP: 0.07, maxDev: 0.7,
        });
        drawn++;
      }
    }
  }
  // 単独の黒ブロブ (実物: 枝と独立した塊が少数)
  const nBlob = Math.max(1, Math.round(randInt(rng, 2, 4) * scale));
  for(let r=0;r<nBlob;r++){
    const bx = randRange(rng, 0, w), by = randRange(rng, 0, h);
    let hx = bx, hy = by, hh = randRange(rng, 0, Math.PI*2);
    for(let t=0;t<randInt(rng,3,6);t++){
      const rw = randRange(rng, 8, 14)*S;
      stampEllipse(sm, w, h, hx, hy, rw*1.3, rw, 3);
      hh += (rng()-0.5)*0.8;
      hx += Math.cos(hh)*rw; hy += Math.sin(hh)*rw*0.7;
    }
  }
  return {type:'organic', w, h, index: sm};
}

/* ---- クラスタ成長エンジン (デジタル系 新手法) ---- */
function growCluster(grid, gw, gh, rng, sx, sy, o){
  const eat = o.canEat;
  if(!eat.has(grid[sy*gw+sx])) return 0;
  const frontier = [];
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
  let drift = randRange(rng, 0, Math.PI*2);
  let cx = sx, cy = sy;
  while(placed < o.target && frontier.length){
    drift += (rng()-0.5) * (o.wander ?? 0.35);
    const dxu = Math.cos(drift), dyu = Math.sin(drift);
    const k = Math.min(frontier.length, 6);
    let bestIdx = -1, bestScore = -Infinity;
    for(let t=0;t<k;t++){
      const idx = randInt(rng, 0, frontier.length);
      const f = frontier[idx];
      const score = (o.compact ?? 1.0) * sameNbr(f.x, f.y)
        + (o.drift ?? 0) * ((f.x-cx)*dxu + (f.y-cy)*dyu) / Math.max(1, Math.hypot(f.x-cx, f.y-cy))
        + (o.elongX ?? 0) * Math.abs(f.x-cx) / Math.max(1, Math.hypot(f.x-cx, f.y-cy))
        + (o.elongY ?? 0) * Math.abs(f.y-cy) / Math.max(1, Math.hypot(f.x-cx, f.y-cy))
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
    cx += (x-cx)/Math.min(placed, 30);
    cy += (y-cy)/Math.min(placed, 30);
    push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1);
  }
  return placed;
}
function growLayer(grid, gw, gh, rng, o){
  let budget = Math.round(gw*gh*o.ratio);
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
      wander: o.wander, elongX: o.elongX, elongY: o.elongY,
    });
  }
}
function speckleGrow(grid, gw, gh, rng, {on, dot, density}){
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
/* ---- 汎用 成長エンジン: P.layers でパターン別に構成 ---- */
export function genGrowth(w, h, seed, scale, P){
  const cellPx = Math.max(1, Math.round((P.cell ?? 4) * (w/512)));
  const gw = Math.ceil(w/cellPx), gh = Math.ceil(h/cellPx);
  const rng = mulberry32(seed ^ 0x9e37);
  const grid = new Uint8Array(gw*gh); // 0 = 最明色
  const A = gw*gh, k = scale*scale;
  for(const L of P.layers){
    growLayer(grid, gw, gh, rng, {
      color: L.color, ratio: L.ratio, canEat: new Set(L.eat),
      seedNear: L.seedNear, stratify: L.stratify,
      minSize: A*L.min/k, maxSize: A*L.max/k,
      compact: L.compact, drift: L.drift, jitter: L.jitter,
      wander: L.wander, elongX: L.elongX, elongY: L.elongY,
    });
  }
  for(let p=0; p<(P.growDither ?? 1); p++){
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
  for(const sp of (P.growSpeckle ?? [])) speckleGrow(grid, gw, gh, rng, sp);
  const index = new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    const gy = Math.min(gh-1, (y/cellPx)|0);
    for(let x=0;x<w;x++){
      index[y*w+x] = grid[Math.min(gw-1,(x/cellPx)|0) + gy*gw];
    }
  }
  return {type:'digital', w, h, index, grid:{gw, gh, cellPx, cellColor: grid}};
}


/* ================= Image Quilting (Efros-Freeman 2001) =================
   実物図案(パブリックドメイン)のインデックスマップからブロックを
   最小誤差シームで継ぎ合わせる。局所=実物図案そのもの、大域=シード配置。 */
let _m81map = null;
function m81Map(){
  if(_m81map) return _m81map;
  const bin = atob(M81_SRC_RLE);
  const out = new Uint8Array(M81_SRC_W * M81_SRC_H);
  let p = 0;
  for(let i=0;i<bin.length;i++){
    const b = bin.charCodeAt(i), v = b>>6, len = b&63;
    out.fill(v, p, p+len); p += len;
  }
  _m81map = out;
  return out;
}
function pasteBlob(out, w, h, p, cx, cy, bb, rad, srcGet){
  const bw2 = 2*bb+1;
  const state = new Uint8Array(bw2*bw2);   // 0=未訪問 1=キュー済/塗布済
  const queue = new Int32Array(bw2*bw2);
  let qh = 0, qt = 0;
  const push = (dx, dy) => {
    const li = (dy+bb)*bw2 + (dx+bb);
    if(state[li]) return;
    state[li] = 1;
    queue[qt++] = li;
  };
  // コア: 無条件塗布してシード化
  const coreR = 0.55;
  for(let dy=-bb;dy<=bb;dy++){
    const y = cy+dy | 0;
    if(y<0||y>=h) continue;
    for(let dx=-bb;dx<=bb;dx++){
      const x = cx+dx | 0;
      if(x<0||x>=w) continue;
      if(Math.hypot(dx,dy) < rad(dx,dy)*coreR){
        out[y*w+x] = srcGet(p, x, y);
        push(dx, dy);
      }
    }
  }
  // 成長: 一致 or 新値の連続のみ拡張
  while(qh < qt){
    const li = queue[qh++];
    const dx = (li % bw2) - bb, dy = ((li / bw2)|0) - bb;
    const x = cx+dx | 0, y = cy+dy | 0;
    if(x<0||x>=w||y<0||y>=h) continue;
    const v = srcGet(p, x, y);   // このピクセルの新値 (塗布済)
    for(const [ex,ey] of [[dx-1,dy],[dx+1,dy],[dx,dy-1],[dx,dy+1]]){
      if(ex<-bb||ex>bb||ey<-bb||ey>bb) continue;
      const li2 = (ey+bb)*bw2 + (ex+bb);
      if(state[li2]) continue;
      const x2 = cx+ex | 0, y2 = cy+ey | 0;
      if(x2<0||x2>=w||y2<0||y2>=h) continue;
      if(Math.hypot(ex,ey) >= rad(ex,ey)) continue;
      const nv = srcGet(p, x2, y2);
      const ov = out[y2*w+x2];
      // 塗れる条件: 旧と一致(継ぎ目不可視) / 隣接塗布済み新値と同色(新シェイプの続き) / 未塗布
      if(nv === ov || nv === v || ov === 255){
        out[y2*w+x2] = nv;
        state[li2] = 1;
        queue[qt++] = li2;
      }
    }
  }
}
export function genQuilt(w, h, seed, scale, srcMap, SW, SH){
  // ブロブマスク・パッチ合成: 有機輪郭のパッチを実物ソースから貼り重ねる。
  // 矩形グリッド/直線シームが構造的に存在しない (Graphcut Textures の簡略版)
  const src = srcMap, rng = mulberry32(seed ^ 0x77a1);
  const k = 0.95 * (512/w) * scale;           // target px → src px
  // 多数決ミップマップ: 縮小サンプリング時のエイリアス(市松ノイズ)防止
  let srcM = src, SWm = SW, SHm = SH, km = k;
  while(km > 1.4 && SWm > 64){
    const nw = SWm>>1, nh = SHm>>1;
    const d = new Uint8Array(nw*nh);
    const cnt4 = [0,0,0,0];
    for(let y=0;y<nh;y++){
      for(let x=0;x<nw;x++){
        cnt4[0]=cnt4[1]=cnt4[2]=cnt4[3]=0;
        cnt4[srcM[(2*y)*SWm+2*x]]++; cnt4[srcM[(2*y)*SWm+2*x+1]]++;
        cnt4[srcM[(2*y+1)*SWm+2*x]]++; cnt4[srcM[(2*y+1)*SWm+2*x+1]]++;
        let v = srcM[(2*y)*SWm+2*x];   // 同数タイは左上優先
        for(let c=0;c<4;c++) if(cnt4[c] > cnt4[v]) v = c;
        d[y*nw+x] = v;
      }
    }
    srcM = d; SWm = nw; SHm = nh; km /= 2;
  }
  const out = new Uint8Array(w*h);
  const TARGET_FRAC = [0.24, 0.27, 0.333, 0.157];  // 広範囲ソース実測
  const DIVW = [1, 1, 1, 2.4];
  // ソース参照: パッチ中心相対 + 折返し不要な範囲選択 (鏡映対称アーティファクト防止)
  // span: パッチが参照するソース半径。範囲内に収まる sx,sy を選ぶ
  const pick = (rng2, spanX, spanY) => {
    const fx = Math.min(spanX, (SWm-2)/2), fy = Math.min(spanY, (SHm-2)/2);
    return {
      sx: randRange(rng2, fx, SWm-1-fx), sy: randRange(rng2, fy, SHm-1-fy),
      mx: rng2()<0.5 ? -1 : 1, my: rng2()<0.35 ? -1 : 1,
      cx: 0, cy: 0,
    };
  };
  const srcGet = (p, x, y) => {
    // x,y: canvas 座標。パッチ中心 (p.cx,p.cy) からの相対でソース参照
    let u = p.sx + p.mx * (x - p.cx) * km, v = p.sy + p.my * (y - p.cy) * km;
    // 安全折返し (通常は範囲内)
    if(u < 0) u = -u; if(u > SWm-1) u = 2*(SWm-1) - u;
    if(v < 0) v = -v; if(v > SHm-1) v = 2*(SHm-1) - v;
    return srcM[(v|0)*SWm + (u|0)];
  };
  // ベースは敷かない: 全面をパッチのみで被覆 (未塗布=255)。
  // 高スケール時にベースの折返し鏡映が出る問題を根絶
  out.fill(255);
  // 2. ブロブパッチ: 有機輪郭 (半径を角度ノイズで変調した星型領域)
  const R = 185 / k;                           // パッチ基準半径 (target px)
  const nPatch = Math.ceil(2.2 * (w*h) / (Math.PI*R*R));
  for(let pi=0; pi<nPatch; pi++){
    // キャンバス現況の色比 → 不足色をパッチ選択で補う (未塗布は除外)
    const cur = [0,0,0,0]; let cn = 0;
    for(let i=0;i<w*h;i+=997){ if(out[i]<4){ cur[out[i]]++; cn++; } }
    const deficit = cn ? TARGET_FRAC.map((t,ci)=> t - cur[ci]/cn) : [0,0,0,0];
    const bSeed = (seed ^ 0x3d1) + pi*37;
    // 25% は「マクロパッチ」: 大径 + 多様性緩和 → 実物にある大判の平坦掃引領域
    const isMacro = rng() < 0.25;
    const bR = R * (isMacro ? randRange(rng, 1.6, 2.1) : randRange(rng, 0.7, 1.3));
    const divWeight = isMacro ? 0.35 : 1.2;
    // パッチ中心は最大3回抽選: 境界リング誤差が低い(=貼っても境界線が出ない)場所を探す
    let cx = 0, cy = 0;
    // 境界半径 r(θ) = bR * (0.62 + 0.55 * fbm(周期θ))
    const rad = (dx, dy) => {
      const th = Math.atan2(dy, dx);
      return bR * (0.62 + 0.55 * fbm(Math.cos(th)*1.4+7, Math.sin(th)*1.4+7, bSeed, 2, 2, .5));
    };
    const bb = Math.ceil(bR * 1.2);
    // 候補: 境界リング上の不一致(重み大) + 内部の色多様性。
    // リング誤差が高止まりなら中心を再抽選 (境界線の露出防止)
    let best = null, bestScore = Infinity, bestRing = Infinity;
    for(let attempt=0; attempt<3; attempt++){
      const tx = randRange(rng, 0, w), ty = randRange(rng, 0, h);
      let aBest = null, aScore = Infinity, aRing = Infinity;
      for(let c=0;c<60;c++){
        const p = pick(rng, bb*km, bb*km);
        p.cx = tx; p.cy = ty;
        let err = 0, cnt = 0;
        const hist = [0,0,0,0]; let hn = 0;
        const es = Math.max(2, (bb/32)|0);
        for(let dy=-bb;dy<=bb;dy+=es){
          for(let dx=-bb;dx<=bb;dx+=es){
            const x = (tx+dx)|0, y = (ty+dy)|0;
            if(x<0||x>=w||y<0||y>=h) continue;
            const rr = Math.hypot(dx,dy), rb = rad(dx,dy);
            if(rr >= rb) continue;
            const v = srcGet(p, x, y);
            if(rr > rb*0.72 && out[y*w+x] < 4){ if(out[y*w+x] !== v) err++; cnt++; }  // 境界リング(塗布済のみ)
            hist[v]++; hn++;
          }
        }
        const ring = cnt ? err/cnt : 0;
        let div = 0;
        for(let ci=0;ci<4;ci++){
          const want = Math.max(0, TARGET_FRAC[ci]*0.55 + deficit[ci]*1.5);
          div += DIVW[ci] * Math.max(0, want - hist[ci]/Math.max(1,hn));
        }
        const score = ring * 2.6 + div * divWeight;
        if(score < aScore){ aScore = score; aBest = p; aRing = ring; }
      }
      if(aScore < bestScore){ bestScore = aScore; best = aBest; bestRing = aRing; cx = best.cx; cy = best.cy; }
      if(bestRing < 0.30) break;
    }
    // 貼り付け: 領域成長型シーム。コア(0.55R)は無条件、
    // 外側は「旧と一致」or「新シェイプ自身の連続」だけ塗り広げる →
    // 遷移が必ず実シェイプの輪郭上に乗り、切断面が出ない
    pasteBlob(out, w, h, best, cx, cy, bb, rad, srcGet);
  }
  // 未塗布セルが残っていれば、その位置を中心に追加パッチで埋める
  let guard = 0;
  while(guard++ < 300){
    let hole = -1;
    for(let i=0;i<w*h;i+=331){ if(out[i]===255){ hole = i; break; } }
    if(hole < 0){
      hole = out.indexOf(255);
      if(hole < 0) break;
    }
    const hx = hole % w, hy = (hole / w) | 0;
    const bSeed = (seed ^ 0x7f3) + guard*53;
    const bR = R * randRange(rng, 0.9, 1.3);
    const rad2 = (dx, dy) => {
      const th = Math.atan2(dy, dx);
      return bR * (0.7 + 0.5 * fbm(Math.cos(th)*1.4+7, Math.sin(th)*1.4+7, bSeed, 2, 2, .5));
    };
    const bb = Math.ceil(bR * 1.3);
    // 通常パッチ同様: 境界リング一致で候補選択 → 領域成長型で貼付
    let hp = null, hs = Infinity;
    for(let c=0;c<30;c++){
      const p = pick(rng, bb*km, bb*km);
      p.cx = hx; p.cy = hy;
      let err = 0, cnt = 0;
      const es = Math.max(2, (bb/24)|0);
      for(let dy=-bb;dy<=bb;dy+=es){
        for(let dx=-bb;dx<=bb;dx+=es){
          const x = (hx+dx)|0, y = (hy+dy)|0;
          if(x<0||x>=w||y<0||y>=h) continue;
          if(Math.hypot(dx,dy) >= rad2(dx,dy)) continue;
          const ov = out[y*w+x];
          if(ov < 4){ if(ov !== srcGet(p, x, y)) err++; cnt++; }
        }
      }
      const sc = cnt ? err/cnt : rng()*0.01;
      if(sc < hs){ hs = sc; hp = p; }
    }
    pasteBlob(out, w, h, hp, hx, hy, bb, rad2, srcGet);
    // 成長で埋まらなかった未塗布セルは無条件で充填 (取り残し防止)
    for(let dy=-bb;dy<=bb;dy++){
      const y = (hy+dy)|0;
      if(y<0||y>=h) continue;
      for(let dx=-bb;dx<=bb;dx++){
        const x = (hx+dx)|0;
        if(x<0||x>=w) continue;
        if(out[y*w+x]===255 && Math.hypot(dx,dy) < rad2(dx,dy)) out[y*w+x] = srcGet(hp, x, y);
      }
    }
  }
  // nearest サンプリング起因のギザ除去 (必要最小限: ソース輪郭の微細ディテールを保持)
  let smoothR = 0;
  if(k > 1.05) smoothR = Math.max(1, Math.round(1.2*(w/512)));       // 縮小: エイリアス除去
  else if(k < 0.95) smoothR = Math.max(1, Math.round(0.8/k*(w/512))); // 拡大: 階段除去
  const sm = smoothR ? modeFilter(out, w, h, smoothR, 1, 4) : out;
  // 微小フラグメント除去: パッチ境界が生む実物に無い小欠片を周囲色に併合
  // 閾値: スケール比例だが、画面上で点に見えるサイズ(絶対下限)を下回らせない
  const minFrag = Math.round(Math.max(70 * (w/512)*(w/512),
                                      110 * (w/512)*(w/512) / (scale*scale)));
  cleanupFragments(sm, w, h, minFrag);
  return {type:'organic', w, h, index: sm};
}
// 面積 < minArea の連結成分を近傍多数色へ併合
function cleanupFragments(index, w, h, minArea){
  const seen = new Uint8Array(w*h);
  for(let start=0; start<w*h; start++){
    if(seen[start]) continue;
    const col = index[start];
    const stack = [start];
    seen[start] = 1;
    const cells = [];
    while(stack.length){
      const i = stack.pop();
      cells.push(i);
      const x = i % w, y = (i / w) | 0;
      if(x>0   && !seen[i-1] && index[i-1]===col){ seen[i-1]=1; stack.push(i-1); }
      if(x<w-1 && !seen[i+1] && index[i+1]===col){ seen[i+1]=1; stack.push(i+1); }
      if(y>0   && !seen[i-w] && index[i-w]===col){ seen[i-w]=1; stack.push(i-w); }
      if(y<h-1 && !seen[i+w] && index[i+w]===col){ seen[i+w]=1; stack.push(i+w); }
    }
    if(cells.length >= minArea) continue;
    const cnt = [0,0,0,0];
    for(const i of cells){
      const x = i % w, y = (i / w) | 0;
      if(x>0   && index[i-1]!==col) cnt[index[i-1]]++;
      if(x<w-1 && index[i+1]!==col) cnt[index[i+1]]++;
      if(y>0   && index[i-w]!==col) cnt[index[i-w]]++;
      if(y<h-1 && index[i+w]!==col) cnt[index[i+w]]++;
    }
    let best = 0;
    for(let c2=1;c2<4;c2++) if(cnt[c2]>cnt[best]) best = c2;
    if(cnt[best]===0) continue;
    for(const i of cells) index[i] = best;
  }
}

/* ================= プリセット ================= */
export const PRESETS = {
  woodland: {
    name: 'ウッドランド (M81) — 従来手法', kind: 'woodland', ref: 'm81',
    colors: [
      {name:'サンド',  hex:'#9c8f6f'},
      {name:'グリーン', hex:'#4c5f49'},
      {name:'ブラウン', hex:'#5f5345'},
      {name:'ブラック', hex:'#3a3e3d'},
    ],
  },
  woodland2: {
    name: 'ウッドランド (M81) — 新手法(形状文法)', kind: 'woodland2', ref: 'm81',
    colors: [
      {name:'サンド',  hex:'#9c8f6f'},
      {name:'グリーン', hex:'#4c5f49'},
      {name:'ブラウン', hex:'#5f5345'},
      {name:'ブラック', hex:'#3a3e3d'},
    ],
  },
  woodland3: {
    name: 'ウッドランド (M81) — 新手法(クイルト)', kind: 'quilt_m81', ref: 'm81',
    colors: [
      {name:'サンド',  hex:'#9c8f6f'},
      {name:'グリーン', hex:'#4c5f49'},
      {name:'ブラウン', hex:'#5f5345'},
      {name:'ブラック', hex:'#3a3e3d'},
    ],
  },
  marpat: {
    name: 'MARPAT ウッドランド — 従来手法', kind: 'digital', ref: 'marpat',
    cell: 4, ratios: [0.27, 0.33, 0.27, 0.13],
    macroFreq: 2.4, mesoFreq: 11.0, macroWeight: 0.46, superCell: 2,
    aspectX: 0.85, aspectY: 1.0,
    dither: 0.4, ditherPasses: 1,
    twigs: [
      {color: 3, freq: 5.5, aspectX: 1.0, aspectY: 0.8, gate: 0.30, width: 0.13, maskQ: 0.30},  // 黒枝
    ],
    speckle: [
      {on: 1, dot: 0, density: 0.02},
      {on: 2, dot: 3, density: 0.02},
      {on: 0, dot: 2, density: 0.035},
      {on: 0, dot: 1, density: 0.02},
    ],
    colors: [
      {name:'タン',       hex:'#7e6a58'},
      {name:'ライトグリーン', hex:'#5d6656'},
      {name:'ダークグリーン', hex:'#454c40'},
      {name:'ブラウンブラック', hex:'#32323a'},
    ],
  },
  marpat2: {
    name: 'MARPAT ウッドランド — 新手法', kind: 'growth', ref: 'marpat',
    cell: 4, growDither: 1,
    layers: [
      {color: 1, ratio: 0.44, eat: [0], min: 0.006, max: 0.028, compact: 1.2, drift: 2.2, jitter: 1.3, wander: 0.4, stratify: 5},
      {color: 2, ratio: 0.24, eat: [0,1], seedNear: 1, min: 0.002, max: 0.016, compact: 1.6, drift: 1.2, jitter: 1.2, wander: 0.35},
      {color: 3, ratio: 0.17, eat: [0,1,2], seedNear: 2, min: 0.004, max: 0.022, compact: 1.2, drift: 2.7, jitter: 0.9, wander: 0.32},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.06}, {on: 0, dot: 1, density: 0.05},
      {on: 2, dot: 3, density: 0.05}, {on: 3, dot: 2, density: 0.04},
    ],
    colors: [
      {name:'タン',       hex:'#7e6a58'},
      {name:'ライトグリーン', hex:'#5d6656'},
      {name:'ダークグリーン', hex:'#454c40'},
      {name:'ブラウンブラック', hex:'#32323a'},
    ],
  },
  marpat_desert: {
    name: 'MARPAT デザート — 新手法', kind: 'growth', ref: 'marpat_desert',
    cell: 4, growDither: 1,
    layers: [
      {color: 1, ratio: 0.40, eat: [0], min: 0.004, max: 0.02, compact: 1.2, drift: 2.0, jitter: 1.3, wander: 0.4, stratify: 6},
      {color: 2, ratio: 0.20, eat: [0,1], seedNear: 1, min: 0.0015, max: 0.01, compact: 1.5, drift: 1.3, jitter: 1.2, wander: 0.35},
      {color: 3, ratio: 0.08, eat: [0,1,2], seedNear: 2, min: 0.001, max: 0.006, compact: 1.3, drift: 2.0, jitter: 1.0, wander: 0.4},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.06}, {on: 0, dot: 1, density: 0.05},
      {on: 2, dot: 3, density: 0.05}, {on: 3, dot: 2, density: 0.05},
    ],
    colors: [
      {name:'ライトサンド', hex:'#9e9e8d'},
      {name:'サンド',     hex:'#8c8873'},
      {name:'ブラウン',    hex:'#7a6749'},
      {name:'ダークブラウン', hex:'#63462d'},
    ],
  },
  aor1: {
    name: 'AOR1 (デザート)', kind: 'digital', ref: 'aor1',
    cell: 3, ratios: [0.44, 0.33, 0.19, 0.04],
    macroFreq: 3.0, mesoFreq: 28.0, macroWeight: 0.08,
    aspectX: 0.5, aspectY: 1.3,   // 横方向に伸長した細かい流れ
    dither: 0.4, ditherPasses: 1,
    speckle: [
      {on: 1, dot: 3, density: 0.012},   // 中間タンに焦茶点
      {on: 2, dot: 0, density: 0.03},
      {on: 0, dot: 2, density: 0.02},
    ],
    colors: [
      {name:'ライトタン',  hex:'#b3a489'},
      {name:'タン',       hex:'#a19075'},
      {name:'ブラウン',    hex:'#917e62'},
      {name:'ダークブラウン', hex:'#766041'},
    ],
  },
  aor1_2: {
    name: 'AOR1 (デザート) — 新手法', kind: 'growth', ref: 'aor1',
    cell: 3, growDither: 1,
    layers: [
      {color: 1, ratio: 0.36, eat: [0], min: 0.0012, max: 0.009, compact: 1.15, drift: 1.9, jitter: 1.3, wander: 0.45, elongX: 1.8, stratify: 7},
      {color: 2, ratio: 0.21, eat: [0,1], seedNear: 1, min: 0.0008, max: 0.006, compact: 1.3, drift: 1.6, jitter: 1.1, wander: 0.4, elongX: 1.6},
      {color: 3, ratio: 0.045, eat: [0,1,2], seedNear: 2, min: 0.0004, max: 0.002, compact: 1.4, drift: 1.2, jitter: 1.0, wander: 0.5, elongX: 0.8},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.06}, {on: 0, dot: 1, density: 0.04},
      {on: 2, dot: 3, density: 0.04},
    ],
    colors: [
      {name:'ライトタン',  hex:'#b3a489'},
      {name:'タン',       hex:'#a19075'},
      {name:'ブラウン',    hex:'#917e62'},
      {name:'ダークブラウン', hex:'#766041'},
    ],
  },
  aor2: {
    name: 'AOR2 (ウッドランド)', kind: 'digital', ref: 'aor2',
    cell: 4, ratios: [0.12, 0.30, 0.40, 0.18],
    macroFreq: 3.5, mesoFreq: 13.0, macroWeight: 0.28,
    aspectX: 1.3, aspectY: 0.55,   // 縦方向に伸長
    dither: 0.4, ditherPasses: 1,
    twigs: [
      {color: 3, freq: 9, aspectX: 1.6, aspectY: 0.55, gate: 0.26, width: 0.13}, // 縦蛇行の黒枝
      {color: 3, freq: 15, aspectX: 1.5, aspectY: 0.6, gate: 0.33, width: 0.08}, // 細枝
    ],
    speckle: [
      {on: 1, dot: 0, density: 0.015},  // 緑地にタン点
      {on: 2, dot: 3, density: 0.015},
    ],
    colors: [
      {name:'タン',       hex:'#8a8460'},
      {name:'ライトグリーン', hex:'#6d6f4b'},
      {name:'グリーン',    hex:'#596141'},
      {name:'ブラック',    hex:'#332e26'},
    ],
  },
  aor2_2: {
    name: 'AOR2 (ウッドランド) — 新手法', kind: 'growth', ref: 'aor2',
    cell: 3, growDither: 1,
    layers: [
      {color: 1, ratio: 0.26, eat: [0], min: 0.001, max: 0.006, compact: 1.1, drift: 1.8, jitter: 1.3, wander: 0.45, elongY: 1.6, stratify: 8},
      {color: 2, ratio: 0.45, eat: [0,1], seedNear: 1, min: 0.001, max: 0.008, compact: 1.3, drift: 1.6, jitter: 1.2, wander: 0.4, elongY: 1.6},
      {color: 3, ratio: 0.18, eat: [0,1,2], seedNear: 2, min: 0.0015, max: 0.009, compact: 1.1, drift: 2.8, jitter: 0.8, wander: 0.3, elongY: 2.6},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.04}, {on: 2, dot: 3, density: 0.05},
      {on: 3, dot: 2, density: 0.04}, {on: 2, dot: 1, density: 0.04},
    ],
    colors: [
      {name:'タン',       hex:'#8a8460'},
      {name:'ライトグリーン', hex:'#6d6f4b'},
      {name:'グリーン',    hex:'#596141'},
      {name:'ブラック',    hex:'#332e26'},
    ],
  },
  ucp: {
    name: 'UCP (ACU)', kind: 'digital', ref: 'ucp',
    cell: 5, ratios: [0.36, 0.28, 0.36],
    macroFreq: 3.0, mesoFreq: 9.5, macroWeight: 0.18, superCell: 2,
    aspectX: 0.5, aspectY: 1.15,   // 横方向に強く伸長
    dither: 0.55, ditherPasses: 2,
    speckle: [
      {on: 0, dot: 2, density: 0.006},
      {on: 2, dot: 0, density: 0.006},
    ],
    colors: [
      {name:'デザートサンド', hex:'#d1cfab'},
      {name:'アーバングレー', hex:'#9ca88b'},
      {name:'フォリッジグリーン', hex:'#798d72'},
    ],
  },
  ucp_2: {
    name: 'UCP (ACU) — 新手法', kind: 'growth', ref: 'ucp',
    cell: 5, growDither: 1,
    layers: [
      {color: 1, ratio: 0.30, eat: [0], min: 0.004, max: 0.02, compact: 1.4, drift: 1.6, jitter: 1.1, wander: 0.3, elongX: 2.0, stratify: 5},
      {color: 2, ratio: 0.36, eat: [0,1], min: 0.004, max: 0.022, compact: 1.4, drift: 1.6, jitter: 1.1, wander: 0.3, elongX: 2.0, stratify: 5},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.05}, {on: 2, dot: 1, density: 0.05},
      {on: 0, dot: 2, density: 0.03},
    ],
    colors: [
      {name:'デザートサンド', hex:'#d1cfab'},
      {name:'アーバングレー', hex:'#9ca88b'},
      {name:'フォリッジグリーン', hex:'#798d72'},
    ],
  },
};

/* ================= 生成入口 ================= */
export function generate(key, w, h, seed, scale){
  const P = PRESETS[key];
  switch(P.kind){
    case 'woodland':  return genWoodland(w, h, seed, scale);
    case 'woodland2': return genWoodlandHybrid(w, h, seed, scale);
    case 'growth':    return genGrowth(w, h, seed, scale, P);
    case 'quilt_m81': return genQuilt(w, h, seed, scale, m81Map(), M81_SRC_W, M81_SRC_H);
    default:          return genDigital(w, h, seed, scale, P);
  }
}
export function toRGBA(res, palette){
  const rgb = palette.map(hexToRgb);
  const img = new Uint8ClampedArray(res.w*res.h*4);
  for(let i=0;i<res.index.length;i++){
    const c = rgb[res.index[i]];
    img[i*4]=c[0]; img[i*4+1]=c[1]; img[i*4+2]=c[2]; img[i*4+3]=255;
  }
  return img;
}
