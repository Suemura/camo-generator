// 迷彩生成コア (browser / node 共用, 依存なし)
// すべて座標ハッシュベースの決定的生成。同一シード → 同一結果。
'use strict';
import { M81_SRC_W, M81_SRC_H, M81_SRC_RLE } from './m81src.js';
import { DCU_SRC_W, DCU_SRC_H, DCU_SRC_RLE } from './dcusrc.js';
import { JGSDF2_SRC_W, JGSDF2_SRC_H, JGSDF2_SRC_RLE } from './jgsdf2src.js';
import { DPM_SRC_W, DPM_SRC_H, DPM_SRC_RLE } from './dpmsrc.js';
import { AUSCAM_SRC_W, AUSCAM_SRC_H, AUSCAM_SRC_BITS, AUSCAM_SRC_RLE } from './auscamsrc.js';
import { TIGERSTRIPE_SRC_W, TIGERSTRIPE_SRC_H, TIGERSTRIPE_SRC_RLE } from './tigerstripesrc.js';
import { BRUSHSTROKE_SRC_W, BRUSHSTROKE_SRC_H, BRUSHSTROKE_SRC_RLE } from './brushstrokesrc.js';
import { LIZARD_SRC_W, LIZARD_SRC_H, LIZARD_SRC_RLE } from './lizardsrc.js';
// 静的 import の目安: m81src (24KB) / dcusrc (18KB) / jgsdf2src (24KB) / dpmsrc (22KB) /
// auscamsrc (20KB) / tigerstripesrc (45KB) / brushstrokesrc (46KB) / lizardsrc (47KB) は
// 数十 KB オーダーで初期バンドルへの影響が小さいため静的 import する。
// AOR1/AOR2 の実物マップ (digsrc.js, 約 280KB) は 1 桁大きく初期バンドルを膨らませるため、
// 利用側が動的 import して registerSources() で渡す (ブラウザ: src/lib/generate.ts、Node: tools/render.mjs)。

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
// シームレスタイリング用: 座標をトーラス上に折り返す (生地印刷・3D テクスチャで
// タイルを並べても境界が見えないよう、生成中の全近傍参照をこの座標系で行う)
function wrapI(v, n){ v %= n; return v < 0 ? v + n : v; }
// 2 点間の最短差分 (トーラス上)。ドリフト方向や重心計算の誤差防止
function wrapD(d, n){ if(d > n/2) return d - n; if(d < -n/2) return d + n; return d; }
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
// 多数決フィルタ: 輪郭の融合・平滑化 (円形カーネル)
// 実装は行スライディング: x を 1 進めるごとに各行 dy で左端 1 px を減らし右端 1 px を足す → O(r)/px。
// 素朴な O(r²)/px と結果は同一 (4096px で半径 7 なら 200 倍速い)
/* ================= 細部保護マスク (v34) =================
   実物のストローク系図案 (タイガーストライプ / ブラッシュストローク / リザード) の識別点は
   「刷毛の毛先が割れた櫛状の細線」「面の縁の掠れ割れ」「面から離れた飛沫」で、いずれも
   幅 1〜2px・長さ数十 px の構造である (実物マップの面積の 3〜6% がこのサイズ帯にある)。
   後処理 3 段 (平滑化 modeFilter / 欠片除去 cleanupFragments / 1px 筋除去 cleanupSlivers) は
   「幅」と「面積」だけで判定していたため、この細部を nearest サンプリング起因の微小点と
   区別できず、95〜98% を削除していた (計測は docs/01-tech-verification.md v34)。
   → 「細い」だけでなく「ある向きに長く伸びている」ことを条件に加えれば両者は分離できる。
      微小点は長さを持たないので従来どおり消え、線は残る。
   4 方位 (横 / 縦 / 斜め 2 方向) で判定するのは、ブラッシュストロークの筆跡が斜めに走るため
   (横縦だけの判定では斜めの細線が「幅も長さも小さい」に見えて保護されない)。 */
function thinLineMask(index, w, h, u, wrap){
  // u: 「512px・scale 1.0」を 1 とした線幅の倍率 (minFrag と同じ正規化)
  const tMax = Math.max(2, Math.round(2.5*u));   // 幅がこれ以下なら「細い」
  // 長さがこれ以上なら「線」(= 点ではない)。4 は掃引で決めた: 3 だと丸い微小点まで拾って
  // 実物に無いちらつきが出はじめ、5 以上だと毛先の短いダッシュ (実物の 110px² 未満の成分の
  // 主要部分) が保護から外れて brushstroke の再現度が 86 → 74 に落ちる
  const lMin = Math.max(3, Math.round(4*u));
  const mask = new Uint8Array(w*h);
  const at = (x, y) => {
    if(wrap) return index[wrapI(y, h)*w + wrapI(x, w)];
    if(x<0||x>=w||y<0||y>=h) return -1;
    return index[y*w + x];
  };
  // 方位と、その直交方位 (幅を測る向き)
  const DIRS = [[1,0,0,1], [0,1,1,0], [1,1,1,-1], [1,-1,1,1]];
  // (x,y) から (dx,dy) 方向へ同色が続く歩数 (最大 lim)
  const walk = (x, y, dx, dy, v, lim) => {
    let n = 0;
    for(let s=1;s<=lim;s++){ if(at(x+dx*s, y+dy*s) !== v) break; n++; }
    return n;
  };
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const v = index[y*w + x];
      for(let d=0;d<4;d++){
        const [dx, dy, px, py] = DIRS[d];
        // 幅を先に見る: 直交方向の広がりが tMax を超えるなら「面」なので他方位へ
        const width = 1 + walk(x, y, px, py, v, tMax) + walk(x, y, -px, -py, v, tMax);
        if(width > tMax) continue;
        if(1 + walk(x, y, dx, dy, v, lMin) + walk(x, y, -dx, -dy, v, lMin) >= lMin){ mask[y*w + x] = 1; break; }
      }
    }
  }
  return mask;
}
function modeFilter(index, w, h, radius, passes, nColors, wrap=false, protect=null){
  let cur = index;
  // 各 dy の半幅 (円内判定 dx²+dy² <= r² と同じ)
  const hw = new Int32Array(2*radius+1);
  for(let dy=-radius;dy<=radius;dy++) hw[dy+radius] = Math.floor(Math.sqrt(radius*radius - dy*dy));
  const counts = new Int32Array(nColors);
  const rows = new Int32Array(2*radius+1);   // 各 dy の行ポインタ (境界外は -1)。行ごとに再利用
  const rowAt = (y) => {
    if(wrap) return wrapI(y, h);
    return (y<0||y>=h) ? -1 : y;
  };
  for(let p=0;p<passes;p++){
    const next = new Uint8Array(cur.length);
    for(let y=0;y<h;y++){
      for(let dy=-radius;dy<=radius;dy++) rows[dy+radius] = rowAt(y+dy);
      // x=0 の窓を初期化
      counts.fill(0);
      for(let k=0;k<=2*radius;k++){
        const ry = rows[k]; if(ry<0) continue;
        const half = hw[k], base = ry*w;
        for(let dx=-half;dx<=half;dx++){
          const nx = wrap ? wrapI(dx, w) : dx;
          if(nx<0||nx>=w) continue;
          counts[cur[base+nx]]++;
        }
      }
      for(let x=0;x<w;x++){
        if(x>0){
          // 窓を右に 1: 各行で左端 (x-1-half) を除去、右端 (x+half) を追加
          for(let k=0;k<=2*radius;k++){
            const ry = rows[k]; if(ry<0) continue;
            const half = hw[k], base = ry*w;
            let xl = x-1-half, xr = x+half;
            if(wrap){ xl = wrapI(xl, w); xr = wrapI(xr, w); counts[cur[base+xl]]--; counts[cur[base+xr]]++; }
            else{
              if(xl>=0 && xl<w) counts[cur[base+xl]]--;
              if(xr>=0 && xr<w) counts[cur[base+xr]]++;
            }
          }
        }
        let best = 0;
        for(let c=1;c<nColors;c++) if(counts[c]>counts[best]) best = c;
        // 細部保護 (v34): 細く長い構造は多数決に潰させない (protect=null なら従来どおり)
        next[y*w+x] = (protect && protect[y*w+x]) ? cur[y*w+x] : best;
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
  const wrap = !!o.wrap;
  const push = (x,y)=>{
    if(wrap){ x = wrapI(x, gw); y = wrapI(y, gh); }
    else if(x<0||x>=gw||y<0||y>=gh) return;
    const i = y*gw+x;
    if(grid[i]===o.color || !eat.has(grid[i]) || inFront.has(i)) return;
    frontier.push({x,y}); inFront.add(i);
  };
  const at = (x,y)=> grid[wrapI(y,gh)*gw + wrapI(x,gw)];
  const sameNbr = (x,y)=>{
    let c = 0;
    if(wrap){
      if(at(x-1,y)===o.color) c++; if(at(x+1,y)===o.color) c++;
      if(at(x,y-1)===o.color) c++; if(at(x,y+1)===o.color) c++;
      return c;
    }
    if(x>0    && grid[y*gw+x-1]===o.color) c++;
    if(x<gw-1 && grid[y*gw+x+1]===o.color) c++;
    if(y>0    && grid[(y-1)*gw+x]===o.color) c++;
    if(y<gh-1 && grid[(y+1)*gw+x]===o.color) c++;
    return c;
  };
  // 重心からの差分 (トーラス時は最短差分)
  const dX = (x)=> wrap ? wrapD(x-cx, gw) : x-cx;
  const dY = (y)=> wrap ? wrapD(y-cy, gh) : y-cy;
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
      const fx = dX(f.x), fy = dY(f.y), fd = Math.max(1, Math.hypot(fx, fy));
      const score = (o.compact ?? 1.0) * sameNbr(f.x, f.y)
        + (o.drift ?? 0) * (fx*dxu + fy*dyu) / fd
        + (o.elongX ?? 0) * Math.abs(fx) / fd
        + (o.elongY ?? 0) * Math.abs(fy) / fd
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
    cx += dX(x)/Math.min(placed, 30);
    cy += dY(y)/Math.min(placed, 30);
    if(wrap){ cx = ((cx % gw) + gw) % gw; cy = ((cy % gh) + gh) % gh; }
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
             grid[sy*gw+wrapI(sx-1,gw)]===o.seedNear ||
             grid[wrapI(sy-1,gh)*gw+sx]===o.seedNear;
      }
    }
    if(!o.canEat.has(grid[sy*gw+sx])) continue;
    const size = Math.min(budget, Math.round(randRange(rng, o.minSize, o.maxSize)));
    budget -= growCluster(grid, gw, gh, rng, sx, sy, {
      color: o.color, target: size, canEat: o.canEat,
      compact: o.compact, drift: o.drift, jitter: o.jitter,
      wander: o.wander, elongX: o.elongX, elongY: o.elongY, wrap: o.wrap,
    });
  }
}
// 4近傍 (wrap 時はトーラス)
function nbr4(grid, gw, gh, x, y){
  return [grid[y*gw+wrapI(x-1,gw)], grid[y*gw+wrapI(x+1,gw)],
          grid[wrapI(y-1,gh)*gw+x], grid[wrapI(y+1,gh)*gw+x]];
}
function speckleGrow(grid, gw, gh, rng, {on, dot, density}, wrap){
  const lo = wrap ? 0 : 1;
  for(let y=lo;y<gh-lo;y++){
    for(let x=lo;x<gw-lo;x++){
      const i = y*gw+x;
      if(grid[i]!==on) continue;
      const nb = nbr4(grid, gw, gh, x, y);
      let edge = false;
      for(const q of nb) if(q!==on) edge = true;
      if(edge && rng() < density) grid[i] = dot;
    }
  }
}
/* ---- 汎用 成長エンジン: P.layers でパターン別に構成 ---- */
export function genGrowth(w, h, seed, scale, P, opt={}){
  const wrap = opt.tileable !== false;
  const cellPx = Math.max(1, Math.round((P.cell ?? 4) * (w/512)));
  // タイル時: セル数を丸めて端の半端セルを排除 (セル幅は最大 ±1px 不均一になるが境界が揃う)
  const gw = wrap ? Math.max(1, Math.round(w/cellPx)) : Math.ceil(w/cellPx);
  const gh = wrap ? Math.max(1, Math.round(h/cellPx)) : Math.ceil(h/cellPx);
  const rng = mulberry32(seed ^ 0x9e37);
  const grid = new Uint8Array(gw*gh); // 0 = 最明色
  const A = gw*gh, k = scale*scale;
  const progress = typeof opt.progress === 'function' ? opt.progress : null;
  let li = 0;
  for(const L of P.layers){
    if(progress) progress(0.8 * (li++) / P.layers.length);
    growLayer(grid, gw, gh, rng, {
      color: L.color, ratio: L.ratio, canEat: new Set(L.eat),
      seedNear: L.seedNear, stratify: L.stratify,
      minSize: A*L.min/k, maxSize: A*L.max/k,
      compact: L.compact, drift: L.drift, jitter: L.jitter,
      wander: L.wander, elongX: L.elongX, elongY: L.elongY, wrap,
    });
  }
  const lo = wrap ? 0 : 1;
  for(let p=0; p<(P.growDither ?? 1); p++){
    const next = new Uint8Array(grid);
    for(let y=lo;y<gh-lo;y++){
      for(let x=lo;x<gw-lo;x++){
        const i = y*gw+x, c = grid[i];
        const nb = nbr4(grid, gw, gh, x, y);
        let diff = 0; for(const q of nb) if(q!==c) diff++;
        if(diff>0 && rng() < 0.35*diff/4) next[i] = nb[(rng()*4)|0];
      }
    }
    grid.set(next);
  }
  for(const sp of (P.growSpeckle ?? [])) speckleGrow(grid, gw, gh, rng, sp, wrap);
  const index = new Uint8Array(w*h);
  for(let y=0;y<h;y++){
    const gy = wrap ? Math.min(gh-1, (y*gh/h)|0) : Math.min(gh-1, (y/cellPx)|0);
    for(let x=0;x<w;x++){
      const gx = wrap ? Math.min(gw-1, (x*gw/w)|0) : Math.min(gw-1,(x/cellPx)|0);
      index[y*w+x] = grid[gx + gy*gw];
    }
  }
  if(progress) progress(1);
  return {type:'digital', w, h, index, grid:{gw, gh, cellPx, cellColor: grid}};
}


/* ================= Image Quilting (Efros-Freeman 2001) =================
   実物図案(パブリックドメイン)のインデックスマップからブロックを
   最小誤差シームで継ぎ合わせる。局所=実物図案そのもの、大域=シード配置。 */
const _srcCache = {};
// bits: RLE 1 バイトの値ビット数 (既定 2 = 値 0..3 / ラン最大 63)。
// 5 値以上の図案 (Auscam) は 3 bit 値 + 5 bit ラン (ラン最大 31) で符号化されており、
// ソースファイル側が <PREFIX>_SRC_BITS で申告する。既定 2 のおかげで既存ソースは無変更で動く
function decodeSrc(key, rle, W, H, bits=2){
  if(_srcCache[key]) return _srcCache[key];
  const bin = atob(rle);
  const map = new Uint8Array(W*H);
  const shift = 8 - bits, runMask = (1<<shift) - 1;
  let p = 0;
  for(let i=0;i<bin.length;i++){
    const b = bin.charCodeAt(i), v = b>>shift, len = b&runMask;
    map.fill(v, p, p+len); p += len;
  }
  return _srcCache[key] = {map, W, H};
}
const SRCS = {
  m81:  () => decodeSrc('m81',  M81_SRC_RLE,  M81_SRC_W,  M81_SRC_H),
  dcu:  () => decodeSrc('dcu',  DCU_SRC_RLE,  DCU_SRC_W,  DCU_SRC_H),   // 18KB なので静的 import で足りる
  jgsdf2: () => decodeSrc('jgsdf2', JGSDF2_SRC_RLE, JGSDF2_SRC_W, JGSDF2_SRC_H), // 30KB なので静的 import で足りる
  dpm:  () => decodeSrc('dpm',  DPM_SRC_RLE,  DPM_SRC_W,  DPM_SRC_H),   // 22KB なので静的 import で足りる
  // Auscam は 5 値なので 3bit RLE (bits を渡す)。20KB なので静的 import で足りる
  auscam: () => decodeSrc('auscam', AUSCAM_SRC_RLE, AUSCAM_SRC_W, AUSCAM_SRC_H, AUSCAM_SRC_BITS),
  tigerstripe: () => decodeSrc('tigerstripe', TIGERSTRIPE_SRC_RLE, TIGERSTRIPE_SRC_W, TIGERSTRIPE_SRC_H), // 45KB なので静的 import で足りる
  brushstroke: () => decodeSrc('brushstroke', BRUSHSTROKE_SRC_RLE, BRUSHSTROKE_SRC_W, BRUSHSTROKE_SRC_H), // 46KB
  lizard: () => decodeSrc('lizard', LIZARD_SRC_RLE, LIZARD_SRC_W, LIZARD_SRC_H), // 47KB
};
// 外部ソースマップの登録: registerSources(await import('./digsrc.js'))
export function registerSources(mod){
  if(mod.AOR1_SRC_RLE) SRCS.aor1 = () => decodeSrc('aor1', mod.AOR1_SRC_RLE, mod.AOR1_SRC_W, mod.AOR1_SRC_H);
  if(mod.AOR2_SRC_RLE) SRCS.aor2 = () => decodeSrc('aor2', mod.AOR2_SRC_RLE, mod.AOR2_SRC_W, mod.AOR2_SRC_H);
}
/** プリセットの実物マップが登録済みか (未登録なら generate() 前に registerSources が必要) */
export function hasSources(key){
  const P = PRESETS[key];
  if(!P) return false;               // 未知キーは「登録なし」扱い (事前チェック用途なので投げない)
  return P.kind !== 'quilt' || !!SRCS[P.src];
}
// ブロブパッチの貼付: 領域成長型シーム (v11) + シェイプ完走/撤回 (v18)。
// 円弧切断の根因: 成長をブロブ半径 rad(θ) で無条件に打ち切ると、半径をまたぐシェイプが
// 「続きの無い滑らかな弧」で切り落とされる (M81 の半円状の切れ目、AOR ではセル格子に沿わない曲線)。
// → 半径の内側は従来の規則 (旧と一致 / 新シェイプ自身の連続 / 未塗布) で成長し、
//   半径をまたいで続く新シェイプ (外側の旧色と不一致 = 切れ目になる箱所) は、シェイプ単位で二択にする:
//   完走: 半径の外でも同じ色 (nv === v) の続きを自然な輪郭まで塗り足す。上書きできる旧色は
//         またいだ地点で下にあった色 (複数可) と未塗布のみ → 遷移は新シェイプの実輪郭か旧シェイプの実輪郭に乗る。
//         半径比 OUT_HI (bb 箱) に達したら「続きが長すぎる」として完走を取り消し、撤回に切り替える
//   撤回: そのシェイプを内側も含めて塗る前の状態に戻す (oldBuf)。境界は新シェイプの実輪郭上に移る
//   途中で止める選択肢を持たないことが要点: 半径関数・ノイズ域のどこで止めても、その形の切れ目や帯が残る。
//   完走 / 撤回の選択は色の不足度 (allowExtend) に委ねる。完走は面積の大きい色を優遇するので、
//   過剰色は撤回・不足色は完走にすると面積比のフィードバック制御になる。
// トーラス (wrap): 訪問管理はキャンバス座標 (state: w*h)。M81 のパッチ半径はキャンバス幅の
//   最大 0.8 倍ありトーラス上で自分自身と重なるため、ローカル管理だと成長が止まり直線の切断面になる。
//   ソース参照は非ラップの相対座標で行い、キャンバス書込だけラップする。
// quant (デジタル系): マスク判定座標をキャンバス格子 (cellPx) のセル中心に丸め、
//   輪郭を階段状にする (未塗布や合流に接する部分でも実物のピクセル輪郭と同じ見え方にする)。
// state: 0 未訪問 / 1 内側塗布 (未処理) / 2 内側塗布 (処理済) / 3 完走塗布 / 4 撤回済 / 5 島判定済。呼出し後は全て 0 に戻す
// bbInX/bbInY: 内側半径を覆う箱 (コア走査範囲)、bbX0/bbY0: 完走まで含む箱 (成長の上限範囲)。
// 異方サンプリング (srcAspect) ではパッチ自体も横長の楕円になるため軸ごとに持つ (等方なら両者同値)
function pasteBlob(out, w, h, p, cx, cy, bbInX, bbInY, bbX0, bbY0, rad, outHi, allowExtend, srcGet, srcIn, wrap, state, oldBuf, quant=0){
  const fl = Math.floor;
  // トーラスでは成長範囲をキャンバスの半分に抑え、各ピクセルへ 1 つの相対位置からしか到達しないようにする
  // (自己重なりの前線同士が出会う直線の切断面を防ぐ)。完走がこの範囲に達したら撤回になる
  const bbX = wrap ? Math.min(bbX0, ((w-1)>>1)) : bbX0, bbY = wrap ? Math.min(bbY0, ((h-1)>>1)) : bbY0;
  const inBox = (ex, ey) => ex>=-bbX && ex<=bbX && ey>=-bbY && ey<=bbY;
  let cap = Math.min(w*h, (2*bbX0+1)*(2*bbY0+1));
  let qdx = new Int32Array(cap), qdy = new Int32Array(cap);
  let qt = 0;
  const grow = () => {
    cap *= 2;
    const a = new Int32Array(cap); a.set(qdx); qdx = a;
    const b = new Int32Array(cap); b.set(qdy); qdy = b;
  };
  const push = (dx, dy) => { if(qt >= cap) grow(); qdx[qt] = dx; qdy[qt] = dy; qt++; };
  const pix = (dx, dy) => {
    let x = fl(cx+dx), y = fl(cy+dy);
    if(wrap){ x = wrapI(x, w); y = wrapI(y, h); }
    else if(x<0||x>=w||y<0||y>=h) return -1;
    return y*w + x;
  };
  // マスク判定座標: デジタル系はセル中心に量子化 (キャンバス絶対格子。パッチ間で格子を共有)
  const mq = quant > 0 ? (d, c) => (fl((c+d)/quant) + 0.5) * quant - c : (d) => d;
  // 半径比 r / rad(θ)。< 1 が内側
  const ratio = (dx, dy) => {
    const qx = mq(dx, cx), qy = mq(dy, cy);
    return Math.hypot(qx, qy) / rad(qx, qy);
  };
  const paint = (i, dx, dy, nv, st) => { oldBuf[i] = out[i]; out[i] = nv; state[i] = st; push(dx, dy); };
  const N4 = [[-1,0],[1,0],[0,-1],[0,1]];

  // --- 1. コア: 無条件塗布してシード化
  const coreR = 0.55;
  for(let dy=-bbInY;dy<=bbInY;dy++){
    for(let dx=-bbInX;dx<=bbInX;dx++){
      if(Math.hypot(dx,dy) >= rad(dx,dy)*coreR) continue;
      const i = pix(dx, dy);
      if(i < 0 || state[i]) continue;          // 自己重複: 先着優先
      paint(i, dx, dy, srcGet(p, fl(cx+dx), fl(cy+dy)), 1);
    }
  }
  // --- 2. 内側の成長。半径の外に続く不一致シェイプは「またぎ点」として記録
  const cross = [];   // 内側ピクセルのキュー添字
  let qh = 0;
  while(qh < qt){
    const dx = qdx[qh], dy = qdy[qh]; qh++;
    const v = out[pix(dx, dy)];
    for(const [ox,oy] of N4){
      const ex = dx+ox, ey = dy+oy;
      if(!inBox(ex, ey)) continue;
      const i2 = pix(ex, ey);
      if(i2 < 0 || state[i2]) continue;
      const nv = srcGet(p, fl(cx+ex), fl(cy+ey));
      const ov = out[i2];
      if(ratio(ex, ey) >= 1){
        if(nv === v && ov !== v) cross.push(qh-1);   // 半径をまたいで続く新シェイプ (旧と不一致 → 切れ目候補)
        continue;
      }
      // 塗れる条件: 旧と一致(継ぎ目不可視) / 隣接塗布済み新値と同色(新シェイプの続き) / 未塗布
      if(nv === ov || nv === v || ov === 255) paint(i2, ex, ey, nv, 1);
    }
  }
  // --- 3. またぎ点ごとにシェイプ単位で 完走 or 撤回
  const shape = [], seeds = [], ext = [];
  for(const ci of cross){
    const sdx = qdx[ci], sdy = qdy[ci];
    const si = pix(sdx, sdy);
    if(state[si] !== 1) continue;             // 既に別のまたぎ点から処理済
    const v = out[si];
    // 3a. 内側シェイプ (state 1 かつ同色の連結成分) を収集。外側に続く不一致ピクセルを完走のシードに
    shape.length = 0; seeds.length = 0;
    let ocMask = 0;
    state[si] = 2; shape.push(sdx, sdy);
    for(let k=0;k<shape.length;k+=2){
      const dx = shape[k], dy = shape[k+1];
      for(const [ox,oy] of N4){
        const ex = dx+ox, ey = dy+oy;
        if(!inBox(ex, ey)) continue;
        const i2 = pix(ex, ey);
        if(i2 < 0) continue;
        if(state[i2] === 1){ if(out[i2] === v){ state[i2] = 2; shape.push(ex, ey); } continue; }
        if(state[i2] !== 0) continue;
        if(ratio(ex, ey) < 1) continue;       // 内側の未塗布 (成長条件で止まった箇所) は対象外
        const nv = srcGet(p, fl(cx+ex), fl(cy+ey));
        const ov = out[i2];
        if(nv !== v || ov === v) continue;
        if(ov !== 255) ocMask |= 1 << ov;
        seeds.push(ex, ey);
      }
    }
    // 3b. 完走を試す
    let ok = allowExtend(v);
    ext.length = 0;
    if(ok){
      for(let k=0;k<seeds.length && ok;k+=2){
        const sx = seeds[k], sy = seeds[k+1];
        const i0 = pix(sx, sy);
        if(state[i0]) continue;
        paint(i0, sx, sy, v, 3); ext.push(sx, sy);
        for(let m=ext.length-2; m<ext.length && ok; m+=2){
          const dx = ext[m], dy = ext[m+1];
          for(const [ox,oy] of N4){
            const ex = dx+ox, ey = dy+oy;
            if(!inBox(ex, ey)){ ok = false; break; }                 // 箱に到達: 続きが長すぎる (→ 撤回)
            const i2 = pix(ex, ey);
            if(i2 < 0 || state[i2]) continue;
            if(!srcIn(p, fl(cx+ex), fl(cy+ey))){ ok = false; break; } // ソース範囲外 (鏡映になる): 撤回へ
            if(srcGet(p, fl(cx+ex), fl(cy+ey)) !== v) continue;     // 新シェイプの実輪郭で終わる
            const ov = out[i2];
            if(ov === v) continue;                                   // 旧同色に合流 (継ぎ目なし)
            if(ratio(ex, ey) >= outHi){ ok = false; break; }         // 半径比の上限: 撤回へ
            if(ov !== 255 && !((ocMask >> ov) & 1)) continue;        // 旧シェイプの実輪郭で止まる
            paint(i2, ex, ey, v, 3); ext.push(ex, ey);
          }
        }
      }
    }
    if(!ok){
      // 3c. 撤回: 完走分と内側シェイプを塗る前に戻す。境界は新シェイプの実輪郭に移る
      for(let k=0;k<ext.length;k+=2){ const i = pix(ext[k], ext[k+1]); out[i] = oldBuf[i]; state[i] = 4; }
      for(let k=0;k<shape.length;k+=2){ const i = pix(shape[k], shape[k+1]); out[i] = oldBuf[i]; state[i] = 4; }
    }
  }
  // --- 4. 撤回した地の中に孤立した新シェイプ (撤回域にしか接しない島) も撤回する。
  // 残すと旧内容の上に新パッチの図柄 (黒枝など) が重なって図柄だけが蓄積し、面積比が偏る
  if(cross.length){
    for(let k=0;k<qt;k++){
      const dx0 = qdx[k], dy0 = qdy[k], i0 = pix(dx0, dy0);
      if(state[i0] === 0 || state[i0] === 4 || state[i0] === 5) continue;
      // 連結成分を辿り、撤回域以外 (旧キャンバス / 未塗布 / 箱外) に接するかを調べる
      shape.length = 0; shape.push(dx0, dy0); state[i0] = 5;   // 5: 判定中
      let open = false;
      for(let m=0;m<shape.length;m+=2){
        const dx = shape[m], dy = shape[m+1];
        for(const [ox,oy] of N4){
          const ex = dx+ox, ey = dy+oy;
          if(!inBox(ex, ey)){ open = true; continue; }
          const i2 = pix(ex, ey);
          if(i2 < 0){ open = true; continue; }
          const st = state[i2];
          if(st === 0){ open = true; continue; }
          if(st === 4 || st === 5) continue;
          state[i2] = 5; shape.push(ex, ey);
        }
      }
      if(!open) for(let m=0;m<shape.length;m+=2){ const i = pix(shape[m], shape[m+1]); out[i] = oldBuf[i]; state[i] = 4; }
    }
  }
  for(let k=0;k<qt;k++){ const i = pix(qdx[k], qdy[k]); if(i >= 0) state[i] = 0; }   // 共有バッファを掃除
}
// 最上層の版 (P.topLayer): 実物の CCE / M81 は色ごとの版を順に刷る網版印刷で、黒は最後の版なので
// 他色に切られずシェイプが丸ごと乗る。クイルトはパッチ合成なので、後から貼るパッチの輪郭が既存の
// 黒ブロブを削り「緑の領域で黒がクロップされた」ように見える (撤回で旧内容が戻る箇所で特に出る)。
// → 合成後に黒を版として刷り直す: (1) 下刷りから黒を消す (最近傍の非黒へ吸収) →
//    (2) ソース図案の黒の連結成分を丸ごと貼る。成分単位なので輪郭は実物の黒枝そのもので、途中で切れない。
// 置く位置は「ソースでその成分の周りにあった色」がキャンバス側にもある場所を優先する
// (実物では黒枝は茶や暗部の上に乗るため、無作為に置くと下地との関係が壊れる)。
// nc: 色数 (既定 4)。5 値以上の図案で topLayer を使う場合に周囲色の集計を色数へ合わせる
function applyTopLayer(out, w, h, srcM, SWm, SHm, kmX, kmY, top, targetFrac, seed, wrap, nc=4){
  const N4 = [[-1,0],[1,0],[0,-1],[0,1]];
  // --- 1. ソースの黒成分をラベリング (bbox・面積・周囲の代表色つき)
  const lab = new Int32Array(SWm*SHm).fill(-1);
  const comps = [];
  const stack = new Int32Array(SWm*SHm);
  for(let i0=0;i0<SWm*SHm;i0++){
    if(srcM[i0] !== top || lab[i0] >= 0) continue;
    const id = comps.length;
    let sp = 0; stack[sp++] = i0; lab[i0] = id;
    let u0 = SWm, u1 = -1, v0 = SHm, v1 = -1, area = 0;
    const ring = new Int32Array(nc);
    while(sp > 0){
      const i = stack[--sp];
      const u = i % SWm, v = (i / SWm) | 0;
      area++;
      if(u < u0) u0 = u; if(u > u1) u1 = u;
      if(v < v0) v0 = v; if(v > v1) v1 = v;
      for(const [ox,oy] of N4){
        const nu = u+ox, nv = v+oy;
        if(nu<0||nu>=SWm||nv<0||nv>=SHm) continue;
        const i2 = nv*SWm + nu;
        if(srcM[i2] !== top){ if(srcM[i2] < 4) ring[srcM[i2]]++; continue; }   // 周囲の色を集計
        if(lab[i2] >= 0) continue;
        lab[i2] = id; stack[sp++] = i2;
      }
    }
    let rc = 0;
    for(let c=1;c<nc;c++) if(ring[c] > ring[rc]) rc = c;
    comps.push({id, u0, u1, v0, v1, area, ring: rc});
  }
  if(!comps.length) return;
  // --- 2. 下刷り: 黒を消して周囲の色で埋める。
  // 「最近傍の色を BFS で伝播」だと細い黒枝が回廊になり、遠くの色が領域の内部へ幅 1〜2px の筋として
  // 引き込まれる (平行に走る細線として見える。実際にユーザー指摘で出た)。
  // → 8 近傍の多数決で 1 層ずつ膨張させる。回廊の壁は領域自身の色なので多数決では筋が生き残らない。
  // 各スイープの結果はまとめて反映し、走査順に依存しない (決定性の維持)
  const idx = (x, y) => {
    if(wrap) return wrapI(y, h)*w + wrapI(x, w);
    if(x<0||x>=w||y<0||y>=h) return -1;
    return y*w + x;
  };
  const N8 = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const fill = new Int32Array(w*h);
  for(let guard=0; guard<64; guard++){
    let ft = 0;
    const cnt = new Int32Array(nc);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i = y*w + x;
        if(out[i] !== top) continue;
        cnt[0]=cnt[1]=cnt[2]=cnt[3]=0;
        let n = 0;
        for(const [ox,oy] of N8){
          const i2 = idx(x+ox, y+oy);
          if(i2 < 0) continue;
          const v = out[i2];
          if(v === top || v > 3) continue;
          cnt[v]++; n++;
        }
        if(!n) continue;
        let b = 0;
        for(let c=1;c<nc;c++) if(cnt[c] > cnt[b]) b = c;   // 同数タイは小さい色番号
        fill[ft++] = i | (b << 28);                        // 反映はスイープ後 (順序依存を避ける)
      }
    }
    if(!ft) break;
    for(let k=0;k<ft;k++) out[fill[k] & 0x0fffffff] = fill[k] >>> 28;
  }
  // --- 3. 黒成分を丸ごと刷る。面積比が目標に達するまで
  const rng = mulberry32(seed ^ 0x51ed);
  // キャンバス上の footprint (半径) と、トーラスで自分自身と重ならない大きさに絞る
  const target = Math.round(targetFrac * w * h);
  const usable = [];
  let wsum = 0;
  for(const c of comps){
    // ソース画像の縁に接する成分はそこで切れている (図案ではなくスキャンの縁) ので使わない。
    // 丸ごと刷ると直線的な断面がそのまま出る
    if(c.u0 === 0 || c.v0 === 0 || c.u1 === SWm-1 || c.v1 === SHm-1) continue;
    const hx = ((c.u1 - c.u0)/2 + 1) / kmX, hy = ((c.v1 - c.v0)/2 + 1) / kmY;
    if(2*hx > 0.9*w || 2*hy > 0.9*h) continue;                 // 大きすぎる枝 (キャンバスに収まらない)
    const canvasArea = c.area / (kmX*kmY);
    if(canvasArea < 12) continue;                              // 点になる欠片は刷らない
    // 1 枚で目標面積の 6 割を超える成分は使わない (残りが素抜けになる)。
    // M81 の黒は bbox 充填率 0.25 程度の枝分かれ形状で、大きい成分ほど画面に広く散るため
    // 面積の上限は緩めでよい (固まりの抑制は密度ペナルティと使用回数の平準化が担う)
    if(canvasArea > target * 0.6) continue;
    wsum += canvasArea;
    usable.push({c, hx, hy, canvasArea, acc: wsum, used: 0});
  }
  if(!usable.length) return;
  let painted = 0;
  for(let i=0;i<w*h;i++) if(out[i] === top) painted++;
  // 黒の分布を粗い格子で数え、密な場所への重ね置きを避ける (実物の黒は画面全体に散る)
  const GC = 8, dens = new Int32Array(GC*GC);
  const densAt = (x, y) => dens[Math.min(GC-1, (y*GC/h)|0)*GC + Math.min(GC-1, (x*GC/w)|0)];
  const densAdd = (x, y) => { dens[Math.min(GC-1, (y*GC/h)|0)*GC + Math.min(GC-1, (x*GC/w)|0)]++; };
  const cellArea = (w*h)/(GC*GC);
  const stampAt = (e, cx, cy, mx, my, apply, step) => {
    const {c, hx, hy} = e;
    const uc = (c.u0 + c.u1)/2, vc = (c.v0 + c.v1)/2;
    let hit = 0, over = 0, ringN = 0, ringOk = 0;
    for(let dy=-Math.ceil(hy); dy<=Math.ceil(hy); dy+=step){
      const v = vc + my*dy*kmY;
      if(v < 0 || v > SHm-1) continue;
      for(let dx=-Math.ceil(hx); dx<=Math.ceil(hx); dx+=step){
        const u = uc + mx*dx*kmX;
        if(u < 0 || u > SWm-1) continue;
        const si = ((v|0)*SWm + (u|0));
        const i = idx(Math.round(cx+dx), Math.round(cy+dy));
        if(i < 0) continue;
        if(lab[si] === c.id){
          hit++;
          if(out[i] === top) over++;                                  // 既に黒 = 重ね置き
          if(apply && out[i] !== top){ out[i] = top; painted++; densAdd(i % w, (i / w) | 0); }
        }else if(srcM[si] !== top){
          // 成分の周囲: ソースでの周囲色とキャンバスの下地が一致するほど良い置き場所
          ringN++; if(out[i] === c.ring) ringOk++;
        }
      }
    }
    return {hit, over, ringMatch: ringN ? ringOk/ringN : 0};
  };
  // 成分は「丸ごと貼る」ので面積の粒度が粗い (最大の成分は目標面積の半分ある)。
  // 目標との差が最小成分の 4 割を切ったら打ち切る = 行き過ぎと不足のどちらにも寄らない止め方
  let minArea = Infinity, minE = usable[0];
  for(const e of usable) if(e.canvasArea < minArea){ minArea = e.canvasArea; minE = e; }
  for(let attempt=0; attempt<4000 && painted < target - minArea*0.4; attempt++){
    // 成分は面積で重み付け抽選 (ソース図案と同じ大きさ分布になる)。
    // ただし残り面積を大きく超える成分は避ける (目標比の行き過ぎ防止)。8 回引き直して駄目なら最小成分
    let e = null;
    const remain = target - painted;
    for(let t=0;t<8;t++){
      const r = rng() * wsum;
      let lo = 0, hi = usable.length-1;
      while(lo < hi){ const mid = (lo+hi)>>1; if(usable[mid].acc < r) lo = mid+1; else hi = mid; }
      const cand = usable[lo];
      if(cand.canvasArea > remain * 1.6) continue;
      // 同じ成分の反復はタイルで目立つので、収まる候補のうち使用回数が最小のものを採る
      if(e === null || cand.used < e.used) e = cand;
    }
    if(e === null) e = minE;
    e.used++;
    // 置き場所は 10 候補から選ぶ (走査は 3px 間隔の粗サンプル)。
    // 下地がソースでの周囲色と一致するほど良く、既存の黒との重なり・その区画の黒密度は減点
    // (減点が無いと下地一致の良い場所へ集中し、黒が一箇所に固まって残りが素抜けになる)
    let bx = 0, by = 0, bmx = 1, bmy = 1, bs = -Infinity;
    for(let cand=0; cand<10; cand++){
      const cx = randRange(rng, 0, w), cy = randRange(rng, 0, h);
      const mx = rng()<0.5 ? -1 : 1, my = rng()<0.5 ? -1 : 1;
      const r2 = stampAt(e, cx, cy, mx, my, false, 3);
      const s = r2.ringMatch
        - 1.6 * (r2.hit ? r2.over/r2.hit : 1)
        - 2.5 * Math.min(1.5, densAt(cx, cy) / (cellArea * targetFrac));
      if(s > bs){ bs = s; bx = cx; by = cy; bmx = mx; bmy = my; }
    }
    stampAt(e, bx, by, bmx, bmy, true, 1);
  }
}
export function genQuilt(w, h, seed, scale, P, opt={}){
  const wrap = opt.tileable !== false;   // キャンバスをトーラスとして扱う (シームレスタイル)
  const progress = typeof opt.progress === 'function' ? opt.progress : null;
  // 多段解像度 (v17): ソース図案は 800px 程度なので、長辺 baseMax を超える出力は
  // 縮小キャンバスで形状を決めてから index を拡大し、平滑化・欠片除去だけ実寸で行う。
  // 情報量は同じ (どちらも同じソース px を nearest 参照する) で、パッチ探索コストが 1/f² になる。
  const fullW = w, fullH = h;
  const baseMax = opt.baseMax ?? 1024;
  const f = Math.max(w, h) > baseMax ? Math.max(w, h) / baseMax : 1;
  // 縮小キャンバスの各辺は 64 以上、ただし実寸を超えない (極端なアスペクトで拡大ループが縮小になるのを防ぐ)
  if(f > 1){ w = Math.min(fullW, Math.max(64, Math.round(fullW / f))); h = Math.min(fullH, Math.max(64, Math.round(fullH / f))); }
  const load = SRCS[P.src];
  if(!load) throw new Error(`source map '${P.src}' not registered: call registerSources() first`);
  const SRC = load();
  const srcMap = SRC.map, SW = SRC.W, SH = SRC.H;
  // ブロブマスク・パッチ合成: 有機輪郭のパッチを実物ソースから貼り重ねる。
  // 矩形グリッド/直線シームが構造的に存在しない (Graphcut Textures の簡略版)
  const src = srcMap, rng = mulberry32(seed ^ 0x77a1);
  // 色数 (ソース図案の値域)。P.frac の要素数を正本にする。
  // 既存プリセットは全て 4 要素なので NC = 4 で従来と同じ経路を通る (出力はビット一致)。
  // Auscam のように 5 値の図案では、面積比フィードバック・多数決ミップ・平滑化・欠片除去の
  // すべてが NC 色を数えないと、値 4 が「未塗布」や「集計対象外」に落ちて静かに消える
  const NC = P.frac.length;
  const k = (P.kBase ?? 0.95) * (512/w) * scale;           // target px → src px
  // 多数決ミップマップ: 縮小サンプリング時のエイリアス(市松ノイズ)防止
  let srcM = src, SWm = SW, SHm = SH, km = k;
  while(km > 1.4 && SWm > 64){
    const nw = SWm>>1, nh = SHm>>1;
    const d = new Uint8Array(nw*nh);
    const cntC = new Int32Array(NC);
    for(let y=0;y<nh;y++){
      for(let x=0;x<nw;x++){
        cntC.fill(0);
        cntC[srcM[(2*y)*SWm+2*x]]++; cntC[srcM[(2*y)*SWm+2*x+1]]++;
        cntC[srcM[(2*y+1)*SWm+2*x]]++; cntC[srcM[(2*y+1)*SWm+2*x+1]]++;
        let v = srcM[(2*y)*SWm+2*x];   // 同数タイは左上優先
        for(let c=0;c<NC;c++) if(cntC[c] > cntC[v]) v = c;
        d[y*nw+x] = v;
      }
    }
    srcM = d; SWm = nw; SHm = nh; km /= 2;
  }
  // ソース参照の異方サンプリング (P.srcAspect、既定 1 = 等方)。
  // 意図: CCE (フランス) は M81 の図案を横方向に伸ばした派生で、ブロブが横長になる。
  // 同じソースを x 方向だけ粗く参照すれば (kmX = km/a)、キャンバス上では横に伸びた
  // シェイプになる。y は M81 と同一レートに保つ = 「M81 を横に伸ばしただけ」の関係。
  // 面積保存の √分割 (kmX=km/√a, kmY=km·√a) も試したが、縦が 1/√a に縮んで M81 より
  // 細かい別図案に見えたため採らなかった (docs/01-tech-verification.md v20)。
  // km 側は縮小方向のみエイリアスを生む (ミップマップの帯 [0.7,1.4]) ので、kmX < km は
  // 追加のエイリアス源にならない。代わりに x 方向の拡大階段が 1/kmX px に広がるため、
  // 後段の平滑化半径は軸別レートの小さい方 (aSm) で決める。
  const sA = P.srcAspect ?? 1;
  const kmX = km / sA, kmY = km;   // 以降 pick / srcIn / srcGet は軸別レートのみを使う
  const out = new Uint8Array(w*h);
  const TARGET_FRAC = P.frac;
  const DIVW = P.divw ?? Array.from({length: NC}, (_, i) => (i === NC-1 ? 2 : 1));
  // ソース参照: パッチ中心相対 + 折返し不要な範囲選択 (鏡映対称アーティファクト防止)
  // span: パッチが参照するソース半径。範囲内に収まる sx,sy を選ぶ
  // P.slopeLock: ソース参照の x 反転と y 反転を連動させる (既定 false = 従来どおり独立)。
  // 意図: タイガーストライプのような縞図案では、実物の縞は全体が同じ向きに傾いている。
  // 反転を独立に振ると mx·my = -1 のパッチだけ縞の傾きが逆転し、隣り合うパッチで縞が
  // 「く」の字に折れて長距離の流れが壊れる (ブロブ図案では傾きに意味がないので問題にならない)。
  // mx·my = +1 に固定すれば傾きの符号が保たれ、反転の多様性 (4 通り中 2 通り) は残る。
  const slopeLock = P.slopeLock === true;
  const pick = (rng2, spanX, spanY) => {
    const fx = Math.min(spanX, (SWm-2)/2), fy = Math.min(spanY, (SHm-2)/2);
    // rng2 の消費順 (sx → sy → mx → my) は変えない。順序を入れ替えると既存プリセットの出力が変わる
    const sx = randRange(rng2, fx, SWm-1-fx), sy = randRange(rng2, fy, SHm-1-fy);
    const mx = rng2()<0.5 ? -1 : 1;
    return { sx, sy, mx, my: slopeLock ? mx : (rng2()<0.35 ? -1 : 1), cx: 0, cy: 0 };
  };
  // 完走の参照がソース範囲内か (範囲外は折返し鏡映になるので完走を諦めて撤回する)
  const srcIn = (p, x, y) => {
    const u = p.sx + p.mx * (x - p.cx) * kmX, v = p.sy + p.my * (y - p.cy) * kmY;
    return u >= 0 && u <= SWm-1 && v >= 0 && v <= SHm-1;
  };
  const srcGet = (p, x, y) => {
    // x,y: canvas 座標。パッチ中心 (p.cx,p.cy) からの相対でソース参照
    let u = p.sx + p.mx * (x - p.cx) * kmX, v = p.sy + p.my * (y - p.cy) * kmY;
    // 安全折返し (通常は範囲内)
    if(u < 0) u = -u; if(u > SWm-1) u = 2*(SWm-1) - u;
    if(v < 0) v = -v; if(v > SHm-1) v = 2*(SHm-1) - v;
    return srcM[(v|0)*SWm + (u|0)];
  };
  // ベースは敷かない: 全面をパッチのみで被覆 (未塗布=255)。
  // 高スケール時にベースの折返し鏡映が出る問題を根絶
  out.fill(255);
  const tstate = new Uint8Array(w*h);   // 貼付の訪問管理 (キャンバス座標、共有)
  const oldBuf = new Uint8Array(w*h);   // 撤回用: 塗る直前の値 (共有)
  const fl = Math.floor;
  // シェイプ完走帯 (v18): ブロブ半径をまたいだ同一シェイプは半径比 OUT_HI まで伸ばしてよい。
  // 許容域は 2D fbm の閾値域: 半径比が上がるほど閾値を上げる (外へ向かって痩せる) が、
  // 輪郭はノイズ等高線なので円弧にならない。ノイズの特徴長 L はブロブ半径の 1/3 程度
  // (M81 のシェイプのローブと同じオーダー)
  // シェイプ完走 / 撤回 (v18、pasteBlob 参照)。完走は面積の大きい色 (M81 の緑/茶の地) を優遇する:
  // 塗り足す面積は「新シェイプ ∩ 旧色」で地の色ほど交差が大きく、放置するとサンド比が 0.24 → 0.17 に落ちる。
  // → 現況で目標比を上回っている色は撤回、それ以外は完走 (面積比のフィードバック制御)
  const OUT_HI = 2.2;                                  // 完走を許す半径比の上限 (超えたら撤回)
  const mkAllowExtend = (deficit) => (v) => deficit[v] >= 0.02;   // 目標比を 2% 以上下回る色だけ完走 (閾値 -0.02〜0.02 を比較し最も目標に近い)
  // デジタル系: マスク輪郭をセル格子に量子化 (ソースのセル ≈ P.cellSrc px → キャンバス px)
  // 量子化は正方セル前提なので等方 km のまま。srcAspect との併用は未検証
  // (デジタル系を伸長する場合はここも軸別セルにする必要がある)
  const quant = P.organic === false ? Math.max(1, (P.cellSrc ?? 10) / km) : 0;
  // 2. ブロブパッチ: 有機輪郭 (半径を角度ノイズで変調した星型領域)
  const R = (P.patchR ?? 185) / k;             // パッチ基準半径 (target px)
  // ブロブ半径の上限 (v18): 輪郭 rad(θ) の最大 1.17·bR がキャンバス短辺の半分を超えると、トーラス上で
  // パッチが自分自身と重なり、同じピクセルへ 2 方向から別内容の前線が到達する。両前線の出会う線は
  // パッチ中心の対蹠点を通る直線の切断面になる (旧実装から存在、撤回で旧内容が残るようになり露出が増えた)
  // 異方サンプリング時はパッチも x 方向に sA 倍の楕円になるので、上限は x 側で決まる
  const bRcap = 0.42 * Math.min(w / sA, h);
  const Rn = Math.min(R, bRcap);               // 被覆枚数の見積りに使う代表半径 (y 半径)
  // パッチ枚数は「面積被覆 2.2 倍」ではなく「枚数」を等方時と揃える: 楕円化で 1 枚の面積が sA 倍に
  // なるため面積基準だと枚数が 1/sA に減り、色比フィードバック (deficit) の反復回数が足りずシード間の
  // 面積比の振れが大きくなる (512px で 9 枚 → 6 枚)
  const nPatch = Math.ceil(2.2 * (w*h) / (Math.PI*Rn*Rn));
  for(let pi=0; pi<nPatch; pi++){
    if(progress) progress(0.75 * pi / nPatch);
    // キャンバス現況の色比 → 不足色をパッチ選択で補う (未塗布は除外)
    const cur = new Int32Array(NC); let cn = 0;
    for(let i=0;i<w*h;i+=997){ if(out[i]<NC){ cur[out[i]]++; cn++; } }
    const deficit = cn ? TARGET_FRAC.map((t,ci)=> t - cur[ci]/cn) : TARGET_FRAC.map(()=>0);
    const bSeed = (seed ^ 0x3d1) + pi*37;
    // 25% は「マクロパッチ」: 大径 + 多様性緩和 → 実物にある大判の平坦掃引領域
    const isMacro = rng() < 0.25;
    const bR = Math.min(bRcap, R * (isMacro ? randRange(rng, 1.6, 2.1) : randRange(rng, 0.7, 1.3)));
    const divWeight = isMacro ? 0.35 : 1.2;
    // パッチ中心は最大3回抽選: 境界リング誤差が低い(=貼っても境界線が出ない)場所を探す
    let cx = 0, cy = 0;
    // 境界半径 r(θ) = bR * (0.62 + 0.55 * fbm(周期θ))
    // (v18 で高周波ローブ化を試したが、隣接パッチの輪郭が小半径で交差して細い C 字帯が増えたため据え置き)
    // 異方サンプリング (srcAspect) では x を sA 倍に伸ばした楕円にする。
    // 意図: ソース図案の特徴だけが x 方向に sA 倍広くなると「特徴 / パッチ」の比が x だけ崩れ、
    // パッチがほぼ単色になる確率が上がる。単色パッチのシェイプ輪郭 = ブロブ半径そのものなので、
    // 滑らかな弧が境界としてそのまま露出する (v18 で潰した半円状の切れ目と同じ見え方)。
    // パッチも同率で伸ばせば両軸で M81 と同じ幾何比に戻り、1 パッチが参照するソース面積も M81 と同じになる
    const rad = sA === 1
      ? (dx, dy) => {
          const th = Math.atan2(dy, dx);
          return bR * (0.62 + 0.55 * fbm(Math.cos(th)*1.4+7, Math.sin(th)*1.4+7, bSeed, 2, 2, .5));
        }
      : (dx, dy) => {
          // 正規化空間 (x/sA, y) の単位円をノイズで変調し、方向 (dx,dy) 上の交点距離を返す
          const L = Math.hypot(dx, dy) || 1, ux = dx/L/sA, uy = dy/L, un = Math.hypot(ux, uy);
          const th = Math.atan2(uy, ux);
          return bR * (0.62 + 0.55 * fbm(Math.cos(th)*1.4+7, Math.sin(th)*1.4+7, bSeed, 2, 2, .5)) / un;
        };
    const bbInY = Math.ceil(bR * 1.2);              // 内側半径を覆う箱 (rad の最大値 ≈ 1.17 bR)
    const bbInX = sA === 1 ? bbInY : Math.ceil(bR * 1.2 * sA);
    const bbY = Math.ceil(bbInY * OUT_HI);          // 完走まで含む成長範囲
    const bbX = sA === 1 ? bbY : Math.ceil(bbInX * OUT_HI);
    // 候補: 境界リング上の不一致(重み大) + 内部の色多様性。
    // リング誤差が高止まりなら中心を再抽選 (境界線の露出防止)
    let best = null, bestScore = Infinity, bestRing = Infinity;
    const nAttempt = P.organic !== false ? 3 : 2;
    const nCand = P.organic !== false ? 60 : 36;
    for(let attempt=0; attempt<nAttempt; attempt++){
      const tx = randRange(rng, 0, w), ty = randRange(rng, 0, h);
      let aBest = null, aScore = Infinity, aRing = Infinity;
      for(let c=0;c<nCand;c++){
        const p = pick(rng, bbInX*kmX, bbInY*kmY);
        p.cx = tx; p.cy = ty;
        let err = 0, cnt = 0;
        const hist = new Int32Array(NC); let hn = 0;
        const es = Math.max(2, (bbInY/32)|0);   // 走査は内側半径の箱 (bb は完走帯込みで大きい)
        const esX = sA === 1 ? es : Math.max(2, (bbInX/32)|0);
        for(let dy=-bbInY;dy<=bbInY;dy+=es){
          for(let dx=-bbInX;dx<=bbInX;dx+=esX){
            const x = fl(tx+dx), y = fl(ty+dy);
            const xi = wrap ? wrapI(x, w) : x, yi = wrap ? wrapI(y, h) : y;
            if(xi<0||xi>=w||yi<0||yi>=h) continue;
            const rr = Math.hypot(dx,dy), rb = rad(dx,dy);
            if(rr >= rb) continue;
            const v = srcGet(p, x, y);
            if(rr > rb*0.72 && out[yi*w+xi] < NC){ if(out[yi*w+xi] !== v) err++; cnt++; }  // 境界リング(塗布済のみ)
            hist[v]++; hn++;
          }
        }
        const ring = cnt ? err/cnt : 0;
        let div = 0;
        for(let ci=0;ci<NC;ci++){
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
    pasteBlob(out, w, h, best, cx, cy, bbInX, bbInY, bbX, bbY, rad, OUT_HI, mkAllowExtend(deficit), srcGet, srcIn, wrap, tstate, oldBuf, quant);
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
    const bR = Math.min(bRcap, R * randRange(rng, 0.9, 1.3));
    const rad2 = sA === 1
      ? (dx, dy) => {
          const th = Math.atan2(dy, dx);
          return bR * (0.7 + 0.5 * fbm(Math.cos(th)*1.4+7, Math.sin(th)*1.4+7, bSeed, 2, 2, .5));
        }
      : (dx, dy) => {   // 通常パッチと同じ楕円 (x を sA 倍)
          const L = Math.hypot(dx, dy) || 1, ux = dx/L/sA, uy = dy/L, un = Math.hypot(ux, uy);
          const th = Math.atan2(uy, ux);
          return bR * (0.7 + 0.5 * fbm(Math.cos(th)*1.4+7, Math.sin(th)*1.4+7, bSeed, 2, 2, .5)) / un;
        };
    const cur2 = new Int32Array(NC); let cn2 = 0;
    for(let i=0;i<w*h;i+=997){ if(out[i]<NC){ cur2[out[i]]++; cn2++; } }
    const allow2 = mkAllowExtend(cn2 ? TARGET_FRAC.map((t,ci)=> t - cur2[ci]/cn2) : TARGET_FRAC.map(()=>0));
    const bbInY = Math.ceil(bR * 1.3);
    const bbInX = sA === 1 ? bbInY : Math.ceil(bR * 1.3 * sA);
    const bbY = Math.ceil(bbInY * OUT_HI);
    const bbX = sA === 1 ? bbY : Math.ceil(bbInX * OUT_HI);
    // 通常パッチ同様: 境界リング一致で候補選択 → 領域成長型で貼付
    let hp = null, hs = Infinity;
    for(let c=0;c<30;c++){
      const p = pick(rng, bbInX*kmX, bbInY*kmY);
      p.cx = hx; p.cy = hy;
      let err = 0, cnt = 0;
      const es = Math.max(2, (bbInY/24)|0);
      const esX = sA === 1 ? es : Math.max(2, (bbInX/24)|0);
      for(let dy=-bbInY;dy<=bbInY;dy+=es){
        for(let dx=-bbInX;dx<=bbInX;dx+=esX){
          const x = fl(hx+dx), y = fl(hy+dy);
          const xi = wrap ? wrapI(x, w) : x, yi = wrap ? wrapI(y, h) : y;
          if(xi<0||xi>=w||yi<0||yi>=h) continue;
          if(Math.hypot(dx,dy) >= rad2(dx,dy)) continue;
          const ov = out[yi*w+xi];
          if(ov < NC){ if(ov !== srcGet(p, x, y)) err++; cnt++; }
        }
      }
      const sc = cnt ? err/cnt : rng()*0.01;
      if(sc < hs){ hs = sc; hp = p; }
    }
    pasteBlob(out, w, h, hp, hx, hy, bbInX, bbInY, bbX, bbY, rad2, OUT_HI, allow2, srcGet, srcIn, wrap, tstate, oldBuf, quant);
    // 成長で埋まらなかった未塗布セルは無条件で充填 (取り残し防止)
    for(let dy=-bbInY;dy<=bbInY;dy++){
      const y = fl(hy+dy), yi = wrap ? wrapI(y, h) : y;
      if(yi<0||yi>=h) continue;
      for(let dx=-bbInX;dx<=bbInX;dx++){
        const x = fl(hx+dx), xi = wrap ? wrapI(x, w) : x;
        if(xi<0||xi>=w) continue;
        if(out[yi*w+xi]===255 && Math.hypot(dx,dy) < rad2(dx,dy)) out[yi*w+xi] = srcGet(hp, x, y);
      }
    }
  }
  // 最上層の版を刷り直す (黒がパッチ輪郭に切られる問題。applyTopLayer のコメント参照)
  if(P.topLayer != null){
    applyTopLayer(out, w, h, srcM, SWm, SHm, kmX, kmY, P.topLayer, TARGET_FRAC[P.topLayer], seed, wrap, NC);
  }
  if(progress) progress(0.8);
  let sm = out;
  // 細部保護マスク (v34) は「実寸への拡大より前」に作る。拡大は nearest なので、
  // 拡大後に作ると輪郭に生じた階段 (幅数 px・長さ十数 px の凸部) まで「細長い構造」と
  // 誤認して保護してしまい、後段の階段除去が効かなくなる (2048px で輪郭が総ギザになった)。
  // ベースキャンバスには階段が存在しないので、ここで作れば実物由来の細部だけが残る
  // P.fineDetail: 実物図案が幅 1〜2px の線を持つ図案 (ストローク系) でだけ有効にする。
  // ブロブ図案 (M81 / DCU / DPM など) には守るべき細線が無く、代わりにパッチ継ぎ目の削れカス
  // (幅 2〜3px・長さ 10〜30px の筋) が「細くて長い構造」に一致してしまうため、保護すると
  // 実物に無い線状の点々が散る (2048px の M81 で 0 個 → 9 個。ユーザー報告で判明)
  let protect = (P.organic !== false && P.fineDetail === true)
    ? thinLineMask(out, w, h, (w/512)/scale, wrap) : null;
  // 実寸への拡大 (nearest)。拡大後の階段幅は 1/kFull px
  let kFull = k;
  if(f > 1){
    const big = new Uint8Array(fullW * fullH);
    const bigP = protect ? new Uint8Array(fullW * fullH) : null;
    for(let y=0;y<fullH;y++){
      const sy = Math.min(h-1, (y * h / fullH) | 0) * w;
      for(let x=0;x<fullW;x++){
        const si = sy + Math.min(w-1, (x * w / fullW) | 0);
        big[y*fullW + x] = out[si];
        if(bigP) bigP[y*fullW + x] = protect[si];   // マスクも index と同じ nearest で拡大する
      }
    }
    sm = big; protect = bigP; w = fullW; h = fullH; kFull = k / f;
  }
  if(P.organic !== false){
    // 有機系: nearest サンプリング起因のギザ除去 (必要最小限)
    let smoothR = 0;
    // 異方サンプリング時の階段幅は軸別レートの小さい方で決まる (srcAspect=1 なら kFull と同値)
    const kFullMin = kFull / sA;
    // 縮小側は kFull（正規化しない）で判定: srcAspect>1 で軸別レートが分岐しても
    // 大きい方 (kmY=km=kFullと同スケール) がエイリアス発生源のため、正規化すると閾値が甘くなる
    if(kFull > 1.05) smoothR = Math.max(1, Math.round(1.2*(w/512)));       // 縮小: エイリアス除去
    // 拡大: 階段除去。階段幅は 1/k px なので半径は 1/k に比例させる
    // (v16 以前は ×(w/512) が掛かり二重スケールで 4096px で半径 54 → 数分かかった)
    else if(kFullMin < 0.95) smoothR = Math.max(1, Math.round(1.2/kFullMin));
    // 平滑化での細部保護は「縮小サンプリング (kFull > 1.05)」のときだけ効かせる。
    //   縮小域: 実物の細部は canvas 上で 1px 前後まで痩せており、多数決に潰される → 保護が要る
    //   拡大域 (kFull < 0.95): ソース 1px が canvas 1/k px に広がるため、階段の畝も
    //     「細くて長い構造」と同じ形になり、マスクでは細部と区別できない。この域では細部の幅も
    //     1/k px あって多数決では消えない (半径 1.2/k の窓に対し帯幅 2/k) ので、保護しないほうが
    //     正しい。保護すると階段除去が止まり、2048px 出力の輪郭が総ギザになる
    // 欠片除去と 1px 筋除去は両域でマスクを尊重する (どちらもサイズだけで判定する段なので、
    // 階段の畝は大きな成分の一部として扱われ、誤保護の害が出ない)
    if(smoothR) sm = modeFilter(sm, w, h, smoothR, 1, NC, wrap, kFull > 1.05 ? protect : null);
    if(progress) progress(0.92);
    // 微小フラグメント除去 (画面上で点に見えるサイズの絶対下限つき)
    const minFrag = Math.round(Math.max(70 * (w/512)*(w/512),
                                        110 * (w/512)*(w/512) / (scale*scale)));
    cleanupFragments(sm, w, h, minFrag, wrap, NC, protect);
    cleanupSlivers(sm, w, h, wrap, protect);   // 幅 1px の筋 (輪郭交差の残り) を除去
  }else{
    // デジタル系: ピクセル輪郭を保持。サブセルの欠片だけ除去
    cleanupFragments(sm, w, h, Math.round((P.fragFloor ?? 14) * (w/512)*(w/512)), wrap, NC);
  }
  // 小石層 (DBDU のチョコチップ): 平滑化・欠片除去の「後」に実寸で置く。
  // 先に置くと (1) 多数決ミップで消える (2) 領域成長シームに途中で切られる
  // (3) minFrag (512px で 70〜224px 相当) の欠片除去に丸ごと食われる ため、
  // 1〜2px の黒縁を持つ数 px の斑点はこの位置でしか成立しない。
  if(P.chips) applyChips(sm, w, h, seed, (w/512)/scale, P.chips, wrap);
  // 値の統合 (P.remap): 多色図案を少ない色数で刷った派生迷彩 (DDPM = DPM の 4 版を 2 色で刷ったもの) を、
  // 元図案のソースで合成してから index を写像する。合成を 4 値で行うのは、2 値ソースだと
  // 同色どうしの継ぎ目にコストが無くパッチ輪郭が直線の切断面としてそのまま出るため
  // (実測: DDPM の 2 値ソースでは kBase / patchR を変えても矩形の切り口が残った)。
  // 統合される色どうしの境界は写像で消えるので、残る輪郭は 4 値で整合の取れた継ぎ目だけになる
  if(P.remap) for(let i=0;i<sm.length;i++) sm[i] = P.remap[sm[i]];
  if(progress) progress(1);
  return {type:'organic', w, h, index: sm};
}
/* ================= 小石層 (チョコレートチップ) =================
   実物 DBDU の識別点は「ブロブ層の内部に散る、黒フチ付きの白い小石」。
   ブロブ層 (クイルト) では再現できないので、後処理後の index に直接描く。
   配置はジッタードグリッド: セル幅を w/nx で厳密に割り切り、小石の footprint が
   セル内に収まるようジッタを制限する。これで (a) 隣接セルの小石と構造的に重ならず
   (b) トーラス上で格子が連続し (c) 占有判定・距離場が不要になる。
   すべて座標ハッシュなので走査順に依存せず、同一シード → 同一配置。 */
// 小石 1 個の形。実物の小石は真円でも楕円でもない不定形 (コンマ状・腎臓状) なので
// 半径を角度の低次ハーモニクスで変調する (pasteBlob の rad(θ) と同じ考え方、周期は 2 と 3)。
// 戻り値: (dx,dy) が形の内側なら true
function chipInside(dx, dy, sh){
  const u =  dx*sh.co + dy*sh.si;
  const t = (-dx*sh.si + dy*sh.co) / sh.ar;
  const rr = Math.hypot(u, t);
  if(rr > sh.a * 1.5) return false;
  const an = Math.atan2(t, u);
  const rad = sh.a * (1 + 0.30*Math.sin(2*an + sh.p1) + 0.18*Math.sin(3*an + sh.p2));
  return rr <= rad;
}
// 小石 (白) と黒縁の 2 形を 1 回の走査で塗る。
// 黒縁は白と同形をひとまわり大きくして中心をずらしたもの。実物の黒は小石の全周ではなく
// 片側に寄って三日月状に太く出るので、同心の輪では実物と別物になる。
function drawChip(index, w, h, cx, cy, wh, rimSh, C, wrap){
  const m = Math.ceil(Math.max(wh ? wh.a : 0, rimSh.a) * 1.5 + Math.hypot(rimSh.ox, rimSh.oy)) + 2;
  const ix0 = Math.round(cx), iy0 = Math.round(cy);
  for(let dy=-m; dy<=m; dy++){
    for(let dx=-m; dx<=m; dx++){
      let v = -1;
      if(wh && chipInside(dx, dy, wh)) v = C.v;
      else if(chipInside(dx - rimSh.ox, dy - rimSh.oy, rimSh)) v = C.rimV;
      if(v < 0) continue;
      const x = ix0 + dx, y = iy0 + dy;
      const xi = wrap ? wrapI(x, w) : x, yi = wrap ? wrapI(y, h) : y;
      if(xi < 0 || xi >= w || yi < 0 || yi >= h) continue;   // 非タイル時はクリップ
      index[yi*w + xi] = v;
    }
  }
}
// 小石が置かれる範囲が単一のブロブ色で占められている比率
// (実物の小石はブロブ内部に置かれ、境界を跨がない)
// index にはすでに描いた小石が混ざるので、判定はブロブ層のスナップショット blob に対して行う
// (これで小石同士の重なりを許せる。実物の小石は隣同士がくっついて連なることがある)
// 2px 間隔サンプリング: 小石 (r ≈ 4〜16px) でも走査点は最低十数点確保できる密度で、
// pure 閾値 0.9 の判定を粗く離散化するほどではない (目視検証: seed 1234/777/211025 で境界跨ぎ誤判定なし)
function chipPurity(blob, w, h, cx, cy, r, wrap){
  const index = blob;
  const m = Math.ceil(r);
  const bx = wrap ? wrapI(Math.round(cx), w) : Math.min(w-1, Math.max(0, Math.round(cx)));
  const by = wrap ? wrapI(Math.round(cy), h) : Math.min(h-1, Math.max(0, Math.round(cy)));
  const base = index[by*w + bx];
  let same = 0, n = 0;
  for(let dy=-m; dy<=m; dy+=2){
    for(let dx=-m; dx<=m; dx+=2){
      if(dx*dx + dy*dy > m*m) continue;
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      const xi = wrap ? wrapI(x, w) : x, yi = wrap ? wrapI(y, h) : y;
      if(xi < 0 || xi >= w || yi < 0 || yi >= h) continue;
      n++;
      if(index[yi*w + xi] === base) same++;
    }
  }
  return n ? same/n : 0;
}
// C: {v, rimV, r, rim, spacing, density, pure}。長さの単位は「512px・scale 1.0」基準 px
// (upx で実 px に換算。genQuilt の k と同じ換算なのでブロブと小石の寸法比が scale で保たれる)
// index はこの呼び出し時点で常に実寸 (genQuilt が多段解像度時に sm/w/h を fullW/fullH へ
// 差し替えた「後」に呼ぶ設計、上の呼び出し行を参照)。よって index.slice() のコピーは
// 常に実寸 1 枚分で収まり、baseMax による縮小生成後の解像度と食い違うことはない
function applyChips(index, w, h, seed, upx, C, wrap){
  const cell = Math.max(6, (C.spacing ?? 30) * upx);
  const nx = Math.max(1, Math.round(w/cell)), ny = Math.max(1, Math.round(h/cell));
  const cw = w/nx, ch = h/ny;                        // 厳密割り切り → 継ぎ目で格子がずれない
  const s = (seed ^ 0x5b1c) | 0;
  const rBase = (C.r ?? 8) * upx;
  const rimF = C.rim ?? 0.42;                        // 黒縁の太さ (小石半径に対する比)
  const blob = index.slice();                        // 配置判定用のブロブ層スナップショット
  for(let gy=0; gy<ny; gy++){
    for(let gx=0; gx<nx; gx++){
      if(hash2(gx, gy, s) > (C.density ?? 0.6)) continue;       // 実物は疎密がある
      // 大きさは 0.45〜1.55 倍でばらつく (実物の小石は大小の差が大きい)
      const a = Math.max(1.5, rBase * (0.45 + 1.1*hash2(gx, gy, s+31)));
      const th = 2*Math.PI * hash2(gx, gy, s+41);
      const wh = {
        a, co: Math.cos(th), si: Math.sin(th),
        ar: 0.62 + 0.38*hash2(gx, gy, s+37),                   // 軸比
        p1: 2*Math.PI*hash2(gx, gy, s+43), p2: 2*Math.PI*hash2(gx, gy, s+47),
      };
      // 黒縁: 同じ形をひとまわり大きくし、ランダム方向へ半径の 0.2〜0.5 だけずらす → 三日月
      const oth = 2*Math.PI * hash2(gx, gy, s+53);
      const od = a * (0.20 + 0.30*hash2(gx, gy, s+59));
      const rimSh = {...wh, a: a*(1 + rimF), ox: Math.cos(oth)*od, oy: Math.sin(oth)*od};
      const m = Math.ceil(rimSh.a * 1.5 + od) + 2;
      // ジッタはセル全域。footprint がセルからはみ出して隣の小石と重なるのは許容する
      // (セル内に閉じ込めると格子のリズムが目に見えてしまう。実物の配置は不規則)
      const cx = gx*cw + hash2(gx, gy, s+11) * cw;
      const cy = gy*ch + hash2(gx, gy, s+23) * ch;
      if(chipPurity(blob, w, h, cx, cy, m, wrap) < (C.pure ?? 0.9)) continue;
      // 実物には白を伴わない黒だけの斑点も混ざる
      const blackOnly = hash2(gx, gy, s+61) < (C.blackOnly ?? 0.22);
      drawChip(index, w, h, cx, cy, blackOnly ? null : wh, rimSh, C, wrap);
    }
  }
}
// 幅 1px の筋を消す (有機系のみ)。両隣が互いに同色で自分だけ違う画素を隣の色に倒す。
// k ≈ 1 の領域では階段もエイリアスも出ないため多数決フィルタを掛けない設計だが、
// 最上層の版で消した黒枝の跡や、パッチ輪郭の交差でできた 1px の筋だけはそこに残る
// (連結成分としては本体に繋がっているので cleanupFragments では落ちない)。
// デジタル系は 1px セルが図案なので対象外
function cleanupSlivers(index, w, h, wrap=false, protect=null){
  for(let pass=0; pass<2; pass++){
    const src = index.slice();
    const sat = (x, y) => {
      if(wrap) return src[wrapI(y, h)*w + wrapI(x, w)];
      if(x<0||x>=w||y<0||y>=h) return -1;
      return src[y*w + x];
    };
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        // 細部保護 (v34): 幅 1px でも「線」として伸びているものは実物の刷毛目なので残す
        if(protect && protect[y*w + x]) continue;
        const v = src[y*w + x];
        const l = sat(x-1, y), r = sat(x+1, y);
        if(l >= 0 && l === r && l !== v){ index[y*w + x] = l; continue; }
        const u = sat(x, y-1), d = sat(x, y+1);
        if(u >= 0 && u === d && u !== v) index[y*w + x] = u;
      }
    }
  }
}
// 面積 < minArea の連結成分を近傍多数色へ併合。nColors は index に現れる色数 (既定 4 = クイルト系)。
// 既定のままだと 5 値図案で cnt[4] が数えられず、5 色目が併合先として選ばれない
// 戻り値: 1 px 以上を書き換えたら true (呼び出し側が不動点ループを打ち切る判定に使う)
function cleanupFragments(index, w, h, minArea, wrap=false, nColors=4, protect=null){
  let changed = false;
  const seen = new Uint8Array(w*h);
  // 4近傍インデックス (wrap 時は境界をまたいで連結 → 継ぎ目で欠片が二重に数えられない)
  const nb = (i) => {
    const x = i % w, y = (i / w) | 0;
    const r = [];
    if(wrap){
      r.push(y*w + wrapI(x-1,w), y*w + wrapI(x+1,w), wrapI(y-1,h)*w + x, wrapI(y+1,h)*w + x);
    }else{
      if(x>0) r.push(i-1); if(x<w-1) r.push(i+1); if(y>0) r.push(i-w); if(y<h-1) r.push(i+w);
    }
    return r;
  };
  for(let start=0; start<w*h; start++){
    if(seen[start]) continue;
    const col = index[start];
    const stack = [start];
    seen[start] = 1;
    const cells = [];
    while(stack.length){
      const i = stack.pop();
      cells.push(i);
      for(const j of nb(i)) if(!seen[j] && index[j]===col){ seen[j]=1; stack.push(j); }
    }
    if(cells.length >= minArea) continue;
    // 細部保護 (v34): 面積は小さいが「細く長い」画素が過半を占める成分は、実物の毛先・
    // 刷毛目・飛沫なので残す。丸い微小点は protect が立たないので従来どおり併合される
    if(protect){
      let pc = 0;
      for(const i of cells) if(protect[i]) pc++;
      if(pc*2 >= cells.length) continue;
    }
    const cnt = new Int32Array(nColors);
    for(const i of cells){
      for(const j of nb(i)) if(index[j]!==col) cnt[index[j]]++;
    }
    let best = 0;
    for(let c2=1;c2<nColors;c2++) if(cnt[c2]>cnt[best]) best = c2;
    if(cnt[best]===0) continue;
    for(const i of cells) index[i] = best;
    changed = true;
  }
  return changed;
}

/* ================= 斑点配置 (フロッグスキン系) =================
   実物構造: 地色の上に、版 (色) ごとに独立した丸い斑点をローラー捺染で刷り重ねたもの。
   同じ版の斑点同士は重ならず、後の版 (暗色) は前の版の上に部分的に乗る。
   ブロブ図案 (M81 系) のように色領域が互いを「切り合う」構造ではないので、
   ソース図案を継ぎ合わせるクイルトではなく、斑点を 1 つずつ置く手続き生成が合う。
   輪郭は極座標の低次高調波で作る解析形状なので、階段・欠片・市松ノイズは構造的に出ない。 */

// 斑点 1 個の輪郭: r(θ) = R·(1 + Σ_k a_k cos(kθ + φ_k)), k = 2..5。
//   a2 = 楕円率 (実物の斑点は 1.3〜2 倍に伸びた豆型が多い)、a3 = 三葉・くびれ (豆型の非対称)、
//   a4 / a5 = 小さな凹凸。高調波は 5 次で止め、輪郭が入り組まない「丸み」を保つ
//   (M81 の枝分かれや陸自 2 型の斑点分岐は作らない。フロッグスキンの識別点は輪郭の単純さ)。
function makeSpot(rng, cx, cy, R, L){
  const a = [0, 0, randRange(rng, L.elong[0], L.elong[1]), randRange(rng, L.lobe[0], L.lobe[1]),
             randRange(rng, 0, L.wobble ?? 0.06), randRange(rng, 0, (L.wobble ?? 0.06) * 0.6)];
  // 長軸の向き: L.orient (rad) が指定されていればその方向 ± L.orientJitter に揃える。
  // 捺染はロール方向に図案が流れるため、実物のブラウン斑は縦長 (布の経方向) に偏る
  const ph = [0, 0, randRange(rng, 0, Math.PI*2), randRange(rng, 0, Math.PI*2),
              randRange(rng, 0, Math.PI*2), randRange(rng, 0, Math.PI*2)];
  if(L.orient !== undefined){
    const j = L.orientJitter ?? 0.5;
    ph[2] = -2 * (L.orient + randRange(rng, -j, j));   // a2 cos(2θ+φ2) は θ = -φ2/2 で最大
  }
  let sum = 0; for(let k=2;k<=5;k++) sum += a[k];
  // 角度 LUT: 画素ごとの cos 計算 (4 項) を省く。分割数は輪郭の周長に比例させ、
  // 1 ステップが 1px 未満になるようにする。固定 256 分割だと高解像度 (R が数百 px) で
  // 輪郭に多角形の折れが見える (2048px の等倍クロップで確認)
  const N = Math.min(8192, Math.max(256, 1 << Math.ceil(Math.log2(7 * R + 1))));
  const lut = new Float32Array(N);
  for(let i=0;i<N;i++){
    const th = i * Math.PI*2 / N;
    let f = 1; for(let k=2;k<=5;k++) f += a[k] * Math.cos(k*th + ph[k]);
    lut[i] = R * f;
  }
  return {cx, cy, R, rMax: R*(1+sum), rMin: R*(1-sum), lut};
}
// 斑点をトーラス上に塗る。塗った画素数を返す (面積目標の進捗に使う)。
// grow > 0 で輪郭を相似拡大する (halo = 暗色の斑をひと回り大きく別の版で先に刷る用途)
function stampSpot(out, w, h, s, color, wrap, grow=0){
  const g = 1 + grow;
  const rMaxG = s.rMax*g, rMinG = s.rMin*g;
  const x0 = Math.floor(s.cx - rMaxG), x1 = Math.ceil(s.cx + rMaxG);
  const y0 = Math.floor(s.cy - rMaxG), y1 = Math.ceil(s.cy + rMaxG);
  const N = s.lut.length, rMax2 = rMaxG*rMaxG, rMin2 = rMinG*rMinG;
  let n = 0;
  for(let y=y0;y<=y1;y++){
    const yy = wrap ? wrapI(y, h) : y;
    if(yy < 0 || yy >= h) continue;
    const dy = y - s.cy;
    for(let x=x0;x<=x1;x++){
      const xx = wrap ? wrapI(x, w) : x;
      if(xx < 0 || xx >= w) continue;
      const dx = x - s.cx, d2 = dx*dx + dy*dy;
      if(d2 > rMax2) continue;
      if(d2 > rMin2){
        let th = Math.atan2(dy, dx); if(th < 0) th += Math.PI*2;
        const r = s.lut[Math.min(N-1, (th * N / (Math.PI*2)) | 0)] * g;
        if(d2 > r*r) continue;
      }
      out[yy*w + xx] = color; n++;
    }
  }
  return n;
}
// P.layers を版の順に処理する。各層: color (index 値) / frac (塗る面積比。後の版に覆われる分を含む) /
// r [min,max] (平均半径、512px・scale 1 基準 px) / elong / lobe (高調波振幅の範囲) /
// gap (同層の中心間距離の下限 = (R1+R2)·(1+gap)。負なら重なって融合する) /
// over (他の斑点層との重なり許容 = (R1+R2)·(1-over) 未満に近づかない。1 で無制限) /
// patch: true なら「地の色むら」扱いで、他層の間隔制約に参加しない /
// halo {color, grow} なら、その斑を刷る直前に同じ形を (1+grow) 倍で halo.color として刷る。
//   実物の重ね刷りで暗色の斑の周りに一段明るい版が縁として残る構造 (フロッグスキンの
//   ブラウン斑をグリーンが縁取る、など)。層間の相関を独立配置のまま表現する最小の手段
// 斑点層の配置本体。genSpots と genLayered (背景帯の上に斑を乗せる) で共用する。
// rng の消費順は genSpots 単体だった頃と 1 bit も変えていない (決定性スナップショットで固定)。
//   progress(li, n): 層ごとの進捗通知 (呼び出し側が全体の区間に写す)
//   halo.shift (0..1、既定 0): halo の中心を rng で shift·R だけずらす。等幅の縁取りは「輪郭線」に
//   見えるが、実物の重ね刷りでは芯の版が縁の版の中で片寄る (マルチカムのクリーム芯が淡タン地の
//   中で偏る)。未指定なら rng を消費しないので既存プリセットの出力は変わらない
//   placed / li0: 呼び出し側が層を 1 つずつ渡すとき (genLayered) に配置リストと層番号を引き継ぐ
function placeSpots(out, w, h, rng, u, layers, wrap, progress, placed=[], li0=0){
  const dist2 = (ax, ay, bx, by) => {
    const dx = wrap ? wrapD(ax-bx, w) : ax-bx, dy = wrap ? wrapD(ay-by, h) : ay-by;
    return dx*dx + dy*dy;
  };
  // placed: {cx, cy, R, li, patch}
  for(let li=li0; li<li0+layers.length; li++){
    const L = layers[li-li0];
    if(progress) progress(li-li0, layers.length);
    const target = L.frac * w * h;
    const rLo = L.r[0]*u, rHi = L.r[1]*u;
    const gap = L.gap ?? 0.1, over = L.over ?? 0.4;
    let painted = 0, fails = 0;
    // 候補 8 点から「既存斑点との最短距離が最大」のものを採る (Mitchell's best-candidate)。
    // 一様なダーツ投げより間隔が均され、捺染図案の「斑点が散在するが偏らない」配置になる
    // fails は成功時にリセットしない「累積失敗」カウンタ (連続失敗ではない)。gap/over が厳しく
    // 面積目標に届く前に置き場所が尽きる異常系の安全弁で、通常は面積目標到達が先に来て消費されない
    while(painted < target && fails < 400){
      const R = randRange(rng, rLo, rHi);
      let best = null, bestD = -1;
      for(let c=0;c<8;c++){
        const cx = rng()*w, cy = rng()*h;
        let ok = true, minD = Infinity;
        for(const q of placed){
          const d2 = dist2(cx, cy, q.cx, q.cy), lim = R + q.R;
          let need;
          if(q.li === li) need = lim*(1+gap);
          else if(L.patch || q.patch) continue;    // 地の色むら層は間隔制約に参加しない
          else need = lim*(1-over);
          if(need > 0 && d2 < need*need){ ok = false; break; }
          if(d2 < minD) minD = d2;
        }
        if(ok && minD > bestD){ bestD = minD; best = {cx, cy}; }
      }
      if(!best){ fails++; continue; }
      const s = makeSpot(rng, best.cx, best.cy, R, L);
      // halo は先に刷る (下の版)。halo の画素は自層の面積目標には数えない
      if(L.halo){
        if(L.halo.shift){
          // 芯を halo の中で片寄せる: halo は中心をずらした別の輪郭 (独立の高調波) を (1+grow) 倍の
          // 半径で刷る。同形の相似拡大だと等幅の縁取りになり輪郭線に見える
          const a = randRange(rng, 0, Math.PI*2), d = randRange(rng, 0, L.halo.shift) * R;
          const hs = makeSpot(rng, s.cx + Math.cos(a)*d, s.cy + Math.sin(a)*d, R * (1 + L.halo.grow), L);
          stampSpot(out, w, h, hs, L.halo.color, wrap);
        }else{
          stampSpot(out, w, h, s, L.halo.color, wrap, L.halo.grow);
        }
      }
      painted += stampSpot(out, w, h, s, L.color, wrap);
      // 間隔判定は halo を含んだ外形で行う (縁まで含めて他の斑と離す)
      placed.push({cx: s.cx, cy: s.cy, R: R * (1 + (L.halo?.grow ?? 0)), li, patch: !!L.patch});
    }
  }
}
export function genSpots(w, h, seed, scale, P, opt={}){
  const wrap = opt.tileable !== false;
  const progress = typeof opt.progress === 'function' ? opt.progress : null;
  const rng = mulberry32(seed ^ 0x5b0d);
  const out = new Uint8Array(w*h);            // 0 = 地色
  const u = (w/512) / scale;                  // 特徴サイズの単位 (scale 大 = 模様細かい、他手法と同じ規約)
  placeSpots(out, w, h, rng, u, P.layers, wrap, progress ? (li, n) => progress(li / n) : null);
  // 後の版の斑点 2 個が前の版の斑点を挟むと、前の色が細い三日月や微小片として残る
  // (捺染の実物では版ずれ以外にこの形は出ない)。P.minFrag (512px・scale 1 基準の px²) 未満の欠片は
  // 近傍多数色へ併合する。それ以外の後処理 (平滑化・多数決) は要らない: 輪郭は解析形状で最初から滑らか
  // 不動点ループ: cleanupFragments は 1 走査で併合先を決めるため、「欠片 A を欠片 B の色へ併合 → 直後に
  // B 自体が別の色へ併合」の順で A の画素が 1 px 取り残されることがある (2048px・scale 0.7 で実際に発生)。
  // 3 個以上の欠片が数珠つなぎに連鎖する稀なケースにも対応できるよう、変化がなくなるまで繰り返す
  // (実測では 2 パス目で収束。上限 8 は理論上の異常系向けの安全弁で通常消費されない)
  if(P.minFrag){
    const minArea = P.minFrag * u * u;
    for(let p=0; p<8; p++){
      if(!cleanupFragments(out, w, h, minArea, wrap, P.colors.length)) break;
    }
  }
  if(progress) progress(1);
  return {type:'spots', w, h, index: out};
}

/* ================= 幾何ハードエッジ (スプリンター系) =================
   実物構造: ドイツ WWII スプリンター (Splittertarnmuster) は、有機的な斑ではなく
   「直線だけで囲まれた多角形」で平面を隙間なく分割した図案。
   参照画像で確認できる識別点は 3 つ:
     - 輪郭が全て直線。曲線・ギザギザ (デジタル系の階段) が一切ない
     - 3 つの領域が 1 点で出会う三重点が多い = 重ね刷りの「乗せ」ではなく平面の「分割」
     - 破片は 1 個の凸多角形ではなく、いくつかの多角形が同色でつながった非凸の塊。
       角が鋭く辺が長い (M81 のような入り組んだ輪郭とは統計が別)
   → 斑を 1 つずつ置く genSpots でも、ソース図案を継ぎ合わせる genQuilt でもなく、
     平面をセルに分割してからセルへ色を割り当てる手法が構造的に合う。
   ソース図案を持たない完全手続き生成なので、参照画像の派生データはアプリに同梱しない。 */

// 周期境界のパワー図 (重み付きボロノイ) で平面をセルに分割する。
//   - 素のボロノイは平均 120° の鈍角セルに寄り、実物の鋭角が出ない。サイトごとに重み wt を振った
//     距離 d = |Δ|² − wt (ラゲール距離) にすると、二等分線は直線のままで (= ハードエッジを保ったまま)
//     重みの小さいサイトが細長い楔セルになり鋭角が現れる
//   - サイトはジッタ格子に置く。格子分割数を w / h の約数になるよう丸めるのでトーラス上で閉じ、
//     タイル境界に継ぎ目も格子ずれも出ない (applyChips と同じ手口)
// 戻り値: cell (画素 → サイト ID) / area (サイトごとの画素数) / n (サイト数)
function splinterCells(w, h, seed, S){
  const { u, cellR, aniso, tilt, wrap } = S;
  // jitter / wtVar の上限クランプ: 下の探索は ±2 リング (5×5 近傍) 固定で、サイトが自セルを
  // 大きくはみ出す (jitter 過大) か遠方サイトが重みで逆転する (wtVar 過大) と 5×5 の外に
  // 最近傍が出て取りこぼす。スプリンター (jitter 1.5・wtVar 0.9) は
  // scale 0.7/1.0/2.0 × wrap true/false × 65536px の全サイト走査比較で不一致 0 件を確認済みで、
  // その値をクランプの上限にしても出力は変わらない
  const jitter = Math.min(S.jitter, 2.0);
  const wtVar = Math.min(S.wtVar, 1.0);
  const nx = Math.max(2, Math.round(w / (cellR * u)));
  const ny = Math.max(2, Math.round(h / (cellR * u)));
  const cw = w / nx, ch = h / ny;
  const n = nx * ny;
  const sx = new Float64Array(n), sy = new Float64Array(n), wt = new Float64Array(n);
  // 重みの上限はセル間隔の wtVar 倍の 2 乗。これを超えると重みで遠方サイトが勝ち、
  // 下の 5×5 近傍探索が最近傍を取り逃してセルが破綻する
  const wtMax = (wtVar * cellR * u) * (wtVar * cellR * u);
  for(let gy=0; gy<ny; gy++){
    for(let gx=0; gx<nx; gx++){
      const i = gy*nx + gx;
      sx[i] = (gx + 0.5 + jitter*(hash2(gx, gy, seed ^ 0x1f13) - 0.5)) * cw;
      sy[i] = (gy + 0.5 + jitter*(hash2(gx, gy, seed ^ 0x7c29) - 0.5)) * ch;
      wt[i] = wtMax * hash2(gx, gy, seed ^ 0x2b55);
    }
  }
  // 全体異方フレーム: 距離を測る前に tilt 回転 + aniso 伸長する。線形変換したパワー図は
  // 元の座標系でも辺が直線なので、ハードエッジのまま「辺が長い」側に寄せられる。
  // サイトごとに違う計量 (異方ボロノイ) は二等分線が曲線になるため採らない
  const cs = Math.cos(tilt), sn = Math.sin(tilt);
  const ia2 = 1 / (aniso*aniso);
  const cell = new Int32Array(w*h);
  const area = new Int32Array(n);
  for(let y=0; y<h; y++){
    const gy0 = Math.floor(y / ch);
    for(let x=0; x<w; x++){
      const gx0 = Math.floor(x / cw);
      let best = -1, bd = Infinity;
      for(let oy=-2; oy<=2; oy++){
        let gy = gy0 + oy;
        if(wrap) gy = wrapI(gy, ny); else if(gy < 0 || gy >= ny) continue;
        for(let ox=-2; ox<=2; ox++){
          let gx = gx0 + ox;
          if(wrap) gx = wrapI(gx, nx); else if(gx < 0 || gx >= nx) continue;
          const i = gy*nx + gx;
          let dx = sx[i] - x, dy = sy[i] - y;
          if(wrap){ dx = wrapD(dx, w); dy = wrapD(dy, h); }
          const rx = dx*cs + dy*sn, ry = -dx*sn + dy*cs;
          const d = rx*rx*ia2 + ry*ry - wt[i];
          if(d < bd){ bd = d; best = i; }
        }
      }
      cell[y*w + x] = best;
      area[best]++;
    }
  }
  return { cell, area, n };
}

// セルの隣接グラフ (トーラス)。色割当が「隣接セルを同色にまとめて破片を大きくする」ために使う
function cellAdjacency(cell, w, h, n, wrap){
  const adj = [];
  for(let i=0;i<n;i++) adj.push(new Set());
  const link = (a, b) => { adj[a].add(b); adj[b].add(a); };
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const a = cell[y*w + x];
      let b;
      if(x+1 < w) b = cell[y*w + x+1]; else if(wrap) b = cell[y*w]; else b = a;
      if(b !== a) link(a, b);
      if(y+1 < h) b = cell[(y+1)*w + x]; else if(wrap) b = cell[x]; else b = a;
      if(b !== a) link(a, b);
    }
  }
  return adj;
}

// セルへの色割当。既定は「面積目標の不足が最大の色」を採り、確率 merge で
// 「既に色が付いた隣接セルのうち最も多い色」に合わせる (= 隣接セルの統合)。
//   merge = 0 → 1 セル 1 色のモザイク、merge 大 → 数セルが同色につながった非凸の破片。
// 統合は面積目標を超えていない色にだけ許す。超過色への統合まで許すと 1 色が画面の半分を覆う
// (不足率の差は色が均衡した後は 0.01 未満しかなく、統合項を足し込む形にすると必ず統合が勝つ)。
// 走査順は mulberry32 でシャッフルする (格子順のままだと同色の帯が左上から右下へ流れる)
function assignCellColors(area, adj, n, seed, frac, merge, total){
  const nc = frac.length;
  const col = new Int32Array(n).fill(-1);
  const target = new Float64Array(nc), got = new Float64Array(nc);
  for(let c=0;c<nc;c++) target[c] = Math.max(1, frac[c] * total);
  const rng = mulberry32(seed ^ 0x3d71);
  const order = new Int32Array(n);
  for(let i=0;i<n;i++) order[i] = i;
  for(let i=n-1;i>0;i--){ const j = Math.floor(rng()*(i+1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
  const cnt = new Float64Array(nc);
  for(let k=0;k<n;k++){
    const i = order[k];
    cnt.fill(0);
    for(const j of adj[i]) if(col[j] >= 0) cnt[col[j]]++;
    let best = -1;
    if(rng() < merge){
      let bc = -1;
      for(let c=0;c<nc;c++) if(cnt[c] > 0 && got[c] < target[c] && (bc < 0 || cnt[c] > cnt[bc])) bc = c;
      best = bc;
    }
    if(best < 0){
      let bs = -Infinity;
      for(let c=0;c<nc;c++){
        const s = (target[c] - got[c]) / target[c];
        if(s > bs){ bs = s; best = c; }
      }
    }
    col[i] = best;
    got[best] += area[i];
  }
  return col;
}

// 雨線 (Regenmuster): スプリンターだけが持つ縦の短い破線。実物は多角形の版とは別に
// 細い縦線の版を重ね刷りしたもので、遠距離で多角形の輪郭を溶かす役割を持つ。
// 色は既存のインデックス (実物と同じ緑の版) を使うので色数は増えない。
// P.rain: {color, spacing, len, gap, thick, density, jitter} — 長さは 512px・scale 1.0 基準 px
function applyRain(index, w, h, seed, u, R, wrap){
  const seg = (R.len + R.gap) * u;
  const th = Math.max(1, Math.round((R.thick ?? 1) * u));
  // 線の太さは 1px より細くできないので、u が小さい (scale 大 / 小さいキャンバス) とき
  // 間隔だけが縮んで雨線が塗り潰しになる。間隔の下限を太さの 4 倍に切り、被覆率を保つ
  const nx = Math.max(1, Math.round(w / Math.max(R.spacing * u, 4 * th)));
  const ny = Math.max(1, Math.round(h / seg));
  const cw = w / nx, ch = h / ny;
  const dens = R.density ?? 1, jit = R.jitter ?? 0.8;
  const duty = R.len / (R.len + R.gap);
  for(let gy=0; gy<ny; gy++){
    for(let gx=0; gx<nx; gx++){
      if(hash2(gx, gy, seed ^ 0x51a7) > dens) continue;
      const x0 = Math.round((gx + 0.5 + jit*(hash2(gx, gy, seed ^ 0x6e11) - 0.5)) * cw);
      // 線の長さは平均の 0.5〜1.5 倍に散らす (実物の雨線は長短が混じる)
      const len = Math.max(2, Math.round(R.len * u * (0.5 + hash2(gx, gy, seed ^ 0x2c4d))));
      const y0 = Math.round((gy + hash2(gx, gy, seed ^ 0x91b3) * (1 - duty)) * ch);
      for(let k=0;k<len;k++){
        let y = y0 + k;
        if(wrap) y = wrapI(y, h); else if(y < 0 || y >= h) continue;
        for(let t=0;t<th;t++){
          let x = x0 + t;
          if(wrap) x = wrapI(x, w); else if(x < 0 || x >= w) continue;
          index[y*w + x] = R.color;
        }
      }
    }
  }
}

// P.cellR (セル間隔) / jitter (格子ジッタ) / wtVar (重みの散らし = 鋭角の出方) /
// aniso・tilt (全体異方フレーム) / merge (隣接セルの統合の強さ) / frac (面積比) /
// minFrag (欠片除去閾値 px²) / rain (雨線。無ければ描かない) で図案を決める。
// ソース図案を持たず計算量が画素数に線形なので opt.baseMax は参照せず常に実寸で生成する
// (縮小生成 → 拡大の経路を通らないため、ハードエッジが最近傍拡大で階段化する問題が起きない)
export function genSplinter(w, h, seed, scale, P, opt={}){
  const wrap = opt.tileable !== false;
  const progress = typeof opt.progress === 'function' ? opt.progress : null;
  const u = (w/512) / scale;              // 特徴サイズの単位 (scale 大 = 模様細かい、他手法と同じ規約)
  const S = {
    u, wrap, cellR: P.cellR,
    jitter: P.jitter ?? 0.9, wtVar: P.wtVar ?? 0.5,
    aniso: P.aniso ?? 1, tilt: P.tilt ?? 0,
  };
  const { cell, area, n } = splinterCells(w, h, seed, S);
  if(progress) progress(0.6);
  const adj = cellAdjacency(cell, w, h, n, wrap);
  if(progress) progress(0.75);
  const col = assignCellColors(area, adj, n, seed, P.frac, P.merge ?? 0.5, w*h);
  const out = new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) out[i] = col[cell[i]];
  if(progress) progress(0.9);
  // 楔セルが細く潰れると 1〜2px の欠片として残るので近傍多数色へ併合する。
  // 雨線はこの後に描く (先に描くと細い線が欠片と判定されて消える)
  if(P.minFrag){
    const minArea = P.minFrag * u * u;
    for(let p=0; p<8; p++){
      if(!cleanupFragments(out, w, h, minArea, wrap, P.frac.length)) break;
    }
  }
  if(P.rain) applyRain(out, w, h, seed, u, P.rain, wrap);
  if(progress) progress(1);
  return {type:'splinter', w, h, index: out};
}

/* ================= 多層グラデーション (マルチカム系) =================
   実物構造: Crye MultiCam (2000 年代〜) は、単層のハードエッジ図案ではなく
     1. 横方向にゆるやかに色が移り変わる背景 (タン ↔ ペールグリーン ↔ ブラウンの帯。境界は
        滲んだグラデーションで、帯の中に隣色の島が混じる)
     2. その上に乗る輪郭のはっきりした前景ブロブ (クリームの大きな斑、ダークブラウンの虫状の斑)。
        斑の芯はひと回り大きい別の版に包まれていて、ブロブの内側に 2 段階の階調がある
     3. 草の茎のような細い縦棒 (ダークグリーン / ダークブラウン) が疎らに立つ。同じ祖先 (Scorpion) を持つ
        米陸軍 OCP には無い、MultiCam 固有の識別点
   の 3 層でできている。既存手法は全て単層 (クイルトは図案の継ぎ合わせ、斑点配置は地色 1 色の上に斑、
   成長系はセル格子) なので、背景の帯と前景の斑を別々に作って重ねる手法を新設した。
   index マップは離散色のままなので形状 / 色の分離 (パレット差し替え) は崩れない。
   ソース図案を持たない手続き生成 (MultiCam は Crye Precision の商標・意匠。図案は複製しない)。
   層は P.bg / P.layers[] で独立に on/off・調整できるので、派生 (OCP: 縦棒なし + 微小斑の群れ、
   MTP: 配色と前景形状の差し替え) は同じエンジンにプリセットを足すだけで作れる。 */

// 周期境界の値ノイズ。格子を nx × ny 周期に閉じるので、w × h のトーラス上で継ぎ目が出ない。
// (vnoise は無限平面の格子なのでタイル境界で不連続になる。背景帯は低周波なので継ぎ目が目立つ)
function pnoise(gx, gy, nx, ny, seed){
  const ix = Math.floor(gx), iy = Math.floor(gy);
  const fx = gx - ix, fy = gy - iy;
  const x0 = wrapI(ix, nx), x1 = wrapI(ix+1, nx), y0 = wrapI(iy, ny), y1 = wrapI(iy+1, ny);
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed), c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  const u = fade(fx), v = fade(fy);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
// 周期 fBm。オクターブごとに周期数を 2 倍にするので各段も閉じる
function pfbm(gx, gy, nx, ny, seed, oct){
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for(let i=0;i<oct;i++){
    sum += amp * pnoise(gx*f, gy*f, nx*f, ny*f, seed + i*101);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

// 背景のグラデーション帯を量子化して index に敷く。
//   B.bandX / bandY: 帯の周期 (512px・scale 1 基準 px)。bandX ≫ bandY で横に流れる帯になる
//   B.mottle: 帯の境界を乱す等方ノイズの振幅。閾値の近くで隣色が島状に入り混じり、実物の
//     「滲んだ境界」を離散色で近似する。画素単位のディザは使わない (市松ノイズ・微小点という
//     既知アーティファクトを構造的に生む。docs/01-tech-verification.md)
//   B.mottleR: 島の大きさ (px)。B.colors: 暗 → 明の順に並べた index。B.frac: その面積比
// 閾値は quantile で決めるので面積比はシードに依らず frac に追従する
function paintBands(out, w, h, seed, u, B){
  const nx = Math.max(1, Math.round(w / (B.bandX * u)));
  const ny = Math.max(1, Math.round(h / (B.bandY * u)));
  const mR = B.mottleR ?? 45;
  const mx = Math.max(1, Math.round(w / (mR * u))), my = Math.max(1, Math.round(h / (mR * u)));
  const mottle = B.mottle ?? 0.25;
  const field = new Float32Array(w*h);
  for(let y=0;y<h;y++){
    const gy = y / h * ny, hy = y / h * my;
    for(let x=0;x<w;x++){
      const gx = x / w * nx, hx = x / w * mx;
      field[y*w + x] = pfbm(gx, gy, nx, ny, seed ^ 0x3a1d, 2)
                     + mottle * (pfbm(hx, hy, mx, my, seed ^ 0x77c2, 2) - 0.5);
    }
  }
  const th = [];
  let acc = 0;
  for(let i=0;i<B.colors.length-1;i++){ acc += B.frac[i]; th.push(quantile(field, acc)); }
  for(let i=0;i<w*h;i++){
    const v = field[i];
    let c = 0;
    while(c < th.length && v > th[c]) c++;
    out[i] = B.colors[c];
  }
}

// 筆線 (stroke) 層。中心を Mitchell 候補で散らし、方向 dir に len の緩い曲線を歩きながら半径 thick/2 の
// 円を刻印する (両端が丸い太い線)。makeSpot の 5 次高調波は a2 を上げると腰がくびれた「ひょうたん形」に
// なり 4:1 以上の細長比を作れないので、実物の
//   - ダークブラウンの横長で虫状の斑 (dir 0、太さ 8〜14px、halo でブラウンの縁)
//   - 草の茎のような細い縦棒 (dir π/2、太さ 3px。MultiCam 固有の識別点)
// はどちらもこの primitive で描く。
//   S.color: index / S.frac (塗る面積比) または S.count (512²・scale 1 基準の本数) のどちらかで量を決める
//   S.len [lo,hi]: 長さ px / S.thick: 太さ px (数値 or [lo,hi]) / S.dir: 方向 rad (既定 π/2 = 縦) / S.dirJitter: 方向のばらつき rad
//   S.sway: 曲がり (長さに対する横ずれの比) / S.halo {color, grow, shift}: 同じ経路を (1+grow) 倍の太さ・
//     shift·thick だけずらした中心で先に描く (斑点層の halo と同じ「重ね刷りで下の版が縁として残る」構造)
//   S.late: true なら欠片除去の後に描く (細い線は先に描くと欠片と判定されて消える。genSplinter の雨線と同じ順序論理)
// placed: この層タイプ同士の Mitchell 判定に使う中心リスト (斑点層とは独立。実物でも版が別)
function strokePath(out, w, h, path, r0, color, wrap){
  let n = 0;
  for(const [xx, yy, rm] of path){
    const r = r0 * (rm ?? 1), r2 = Math.max(0.5, r*r);
    const x0 = Math.floor(xx - r), x1 = Math.ceil(xx + r), y0 = Math.floor(yy - r), y1 = Math.ceil(yy + r);
    for(let py=y0; py<=y1; py++){
      const yw = wrap ? wrapI(py, h) : py;
      if(yw < 0 || yw >= h) continue;
      for(let px=x0; px<=x1; px++){
        const xw = wrap ? wrapI(px, w) : px;
        if(xw < 0 || xw >= w) continue;
        const dx = px + 0.5 - xx, dy = py + 0.5 - yy;
        if(dx*dx + dy*dy <= r2){
          const i = yw*w + xw;
          if(out[i] !== color){ out[i] = color; n++; }
        }
      }
    }
  }
  return n;
}
function placeStrokes(out, w, h, rng, u, S, wrap, placed){
  const dist2 = (ax, ay, bx, by) => {
    const dx = wrap ? wrapD(ax-bx, w) : ax-bx, dy = wrap ? wrapD(ay-by, h) : ay-by;
    return dx*dx + dy*dy;
  };
  const count = S.count !== undefined ? Math.max(1, Math.round(S.count * (w*h) / (512*512) / (u*u))) : Infinity;
  const target = S.frac !== undefined ? S.frac * w * h : Infinity;
  const thick = Array.isArray(S.thick) ? S.thick : [S.thick, S.thick];
  const dir = S.dir ?? Math.PI/2, dj = S.dirJitter ?? 0, sway = S.sway ?? 0;
  let painted = 0, k = 0;
  while(k < count && painted < target && k < 4000){
    // 既存の線から最も離れた候補を採る (線同士が束にならない。実物の茎は 1 本ずつ立つ)。
    // placed が空 (レイヤー内で最初の 1 本) のときは 8 候補とも minD=Infinity になり、
    // Infinity > Infinity は false のため実質「8 候補中の最初」で確定する。genSpots の
    // 同種ループと同じ挙動で、rng は 8 候補ぶん消費するため決定性・スナップショットへの影響はない
    let best = null, bestD = -1;
    for(let c=0;c<8;c++){
      const cx = rng()*w, cy = rng()*h;
      let minD = Infinity;
      for(const q of placed){ const d2 = dist2(cx, cy, q.cx, q.cy); if(d2 < minD) minD = d2; }
      if(minD > bestD){ bestD = minD; best = {cx, cy}; }
    }
    placed.push(best);
    const len = randRange(rng, S.len[0], S.len[1]) * u;
    const th = Math.max(1, randRange(rng, thick[0], thick[1]) * u);
    const a = dir + randRange(rng, -dj, dj);
    // 曲がり: 1 本の低周波の弧。真っすぐな線は印刷物に見えて実物と違う
    const bend = randRange(rng, -sway, sway), phase = randRange(rng, 0, Math.PI*2);
    // 太さの揺らぎ (S.taper): 線に沿って太さを 1 ± taper で正弦変調する。等幅のソーセージ形は印刷物に
    // 見え、実物の斑は途中で膨らんだり端が太かったりする
    const taper = S.taper ?? 0, tk = randRange(rng, 1, 2.5), tph = randRange(rng, 0, Math.PI*2);
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const steps = Math.max(1, Math.ceil(len));
    const path = [];
    for(let i=0;i<=steps;i++){
      const t = i / steps - 0.5, off = bend * len * (Math.sin(phase + (t+0.5)*Math.PI) - Math.sin(phase)) * 0.5;
      path.push([best.cx + ux*t*len + nx*off, best.cy + uy*t*len + ny*off, 1 + taper * Math.sin(tph + t*Math.PI*tk)]);
    }
    if(S.halo){
      const hs = S.halo.shift ?? 0;
      const ha = randRange(rng, 0, Math.PI*2), hd = randRange(rng, 0, hs) * th;
      const hk = randRange(rng, 1, 2.5), hph = randRange(rng, 0, Math.PI*2);
      const hp = path.map(([x, y], i) => [x + Math.cos(ha)*hd, y + Math.sin(ha)*hd,
                                          1 + taper * Math.sin(hph + (i/steps - 0.5)*Math.PI*hk)]);
      strokePath(out, w, h, hp, th * (1 + S.halo.grow) / 2, S.halo.color, wrap);
    }
    painted += strokePath(out, w, h, path, th/2, S.color, wrap);
    k++;
  }
}

// P.bg (背景帯) → P.layers を配列順に (斑点層 type 無し / 'spot'、筆線層 type:'stroke') → 欠片除去 →
// late: true の筆線層。各層は独立に外せる (bg を外すと index 0 の地色、layers を空にすると帯だけ)。
// ソース図案を持たず計算量が画素数に線形なので opt.baseMax は参照せず常に実寸で生成する
export function genLayered(w, h, seed, scale, P, opt={}){
  const wrap = opt.tileable !== false;
  const progress = typeof opt.progress === 'function' ? opt.progress : null;
  const rng = mulberry32(seed ^ 0x1a7e);
  const u = (w/512) / scale;
  const out = new Uint8Array(w*h);
  if(P.bg) paintBands(out, w, h, seed, u, P.bg);
  if(progress) progress(0.4);
  const layers = P.layers ?? [];
  const placedSpots = [], placedStrokes = [], late = [];
  for(let li=0; li<layers.length; li++){
    const L = layers[li];
    if(progress) progress(0.4 + 0.5 * li / layers.length);
    if(L.type === 'stroke'){
      if(L.late) late.push(L); else placeStrokes(out, w, h, rng, u, L, wrap, placedStrokes);
    }else{
      placeSpots(out, w, h, rng, u, [L], wrap, null, placedSpots, li);
    }
  }
  if(P.minFrag){
    const minArea = P.minFrag * u * u;
    for(let p=0; p<8; p++){
      if(!cleanupFragments(out, w, h, minArea, wrap, P.colors.length)) break;
    }
  }
  // late な筆線層 (multicam の縦棒) は非 late の虫状斑層と placedStrokes を共有する。
  // 版が違っても筆線同士の Mitchell 距離を通しで見ることで、縦棒が虫状斑の真上に立たず、
  // 筆線どうし (虫状斑・縦棒を問わず) が束にならないようにする意図的な共有 (placeSpots とは独立)
  for(const S of late) placeStrokes(out, w, h, rng, u, S, wrap, placedStrokes);
  if(progress) progress(1);
  return {type:'layered', w, h, index: out};
}

/* ================= プリセット ================= */
export const PRESETS = {
  woodland: {
    // topLayer: 黒は実物でも最後に刷る版なので、パッチ輪郭に切られず丸ごと乗る (v21/v22)
    name: 'ウッドランド (M81)', kind: 'quilt', src: 'm81', ref: 'm81',
    kBase: 0.95, patchR: 185, organic: true, topLayer: 3,
    frac: [0.24, 0.27, 0.333, 0.157], divw: [1, 1, 1, 2.4],
    colors: [
      {name:'サンド',  hex:'#9c8f6f'},
      {name:'グリーン', hex:'#4c5f49'},
      {name:'ブラウン', hex:'#5f5345'},
      {name:'ブラック', hex:'#3a3e3d'},
    ],
  },
  cce: {
    // CCE (Camouflage Centre-Europe、フランス 1990 年代〜現用): M81 の図案を横に伸ばした派生。
    // 4 色構成も M81 と同系統なので、ソースは m81 を流用し srcAspect で横長ブロブを作る。
    // 色は M81 よりグリーンが明るく、カーキが灰味 (参照画像からの実測値)
    name: 'CCE (フランス)', kind: 'quilt', src: 'm81', ref: 'cce',
    // patchR は M81 と同値。パッチも srcAspect 倍の楕円になるので 1 パッチが参照するソース面積は M81 と同じ
    kBase: 0.95, patchR: 185, organic: true, srcAspect: 1.5, topLayer: 3,
    frac: [0.305, 0.254, 0.277, 0.165], divw: [1, 1, 1, 2.4],
    colors: [
      {name:'ライトカーキ', hex:'#a29275'},
      {name:'グリーン',   hex:'#4f5c40'},
      {name:'ブラウン',    hex:'#614f3d'},
      {name:'ブラック',    hex:'#2d2d2d'},
    ],
  },
  marpat: {
    name: 'MARPAT ウッドランド', kind: 'growth', ref: 'marpat',
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
    name: 'MARPAT デザート', kind: 'growth', ref: 'marpat_desert',
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
    name: 'AOR1 (デザート)', kind: 'quilt', src: 'aor1', ref: 'aor1',
    kBase: 1.5, patchR: 170, organic: false, cellSrc: 10,   // cellSrc: ソース図案の 1 セル ≈ 10 px (960px スウォッチ実測)
    frac: [0.42, 0.325, 0.214, 0.041], divw: [1, 1, 1.3, 2.6],
    colors: [
      {name:'ライトタン',  hex:'#b5a78c'},
      {name:'タン',       hex:'#958268'},
      {name:'ブラウン',    hex:'#776140'},
      {name:'ダークブラウン', hex:'#5b442b'},
    ],
  },
  aor2: {
    name: 'AOR2 (ウッドランド)', kind: 'quilt', src: 'aor2', ref: 'aor2',
    kBase: 1.5, patchR: 170, organic: false, cellSrc: 10,   // cellSrc: ソース図案の 1 セル ≈ 10 px (960px スウォッチ実測)
    frac: [0.043, 0.289, 0.454, 0.214], divw: [2, 1, 1, 1.3],
    colors: [
      {name:'タン',       hex:'#a39678'},
      {name:'カーキ',     hex:'#7f7852'},
      {name:'グリーン',    hex:'#5c6844'},
      {name:'ブラック',    hex:'#2b2220'},
    ],
  },
  ucp: {
    name: 'UCP (ACU)', kind: 'growth', ref: 'ucp',
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
  cadpat: {
    // CADPAT TW (温帯林、カナダ)。MARPAT の原型なのでピクセル粒度は同等 (cell 4)。
    // 実物の特徴 (refs/cadpat.png の 4 色実測。面積比 17 / 44 / 29 / 10%):
    //   - 緑 3 段 + タンの構成で、MARPAT のような明るいタン地を持たない。
    //     ミッドグリーンが最大面積 (44%) を占め、全体が緑に寄る
    //   - ダークグリーンは MARPAT のブラウンブラック (17%) より広い 29% で、
    //     枝状に細く散るのではなく大きめの塊として連なる → min/max を MARPAT より大きく、
    //     compact を上げて塊寄りにする
    //   - タンは最小面積 (10%)。緑の塊の縁に沿って点在するので seedNear でダークグリーンに寄せる
    name: 'CADPAT TW (カナダ)', kind: 'growth', ref: 'cadpat',
    cell: 4, growDither: 1,
    layers: [
      {color: 1, ratio: 0.74, eat: [0], min: 0.0015, max: 0.006, compact: 1.3, drift: 2.2, jitter: 1.3, wander: 0.4, stratify: 5},
      {color: 2, ratio: 0.36, eat: [0,1], seedNear: 1, min: 0.0012, max: 0.005, compact: 1.4, drift: 2.0, jitter: 1.1, wander: 0.35},
      {color: 3, ratio: 0.11, eat: [0,1,2], seedNear: 2, min: 0.0005, max: 0.0025, compact: 1.5, drift: 1.4, jitter: 1.0, wander: 0.30},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.06}, {on: 0, dot: 1, density: 0.05},
      {on: 2, dot: 1, density: 0.05}, {on: 3, dot: 2, density: 0.04},
    ],
    colors: [
      {name:'ライトグリーン', hex:'#81925c'},
      {name:'ミッドグリーン', hex:'#525d3c'},
      {name:'ダークグリーン', hex:'#35392d'},
      {name:'タン',        hex:'#847b5d'},
    ],
  },
  pla07: {
    // 07 式 通用迷彩 (中国)。実物の特徴 (refs/pla07.jpg 実測。面積比 42 / 36 / 10 / 10%):
    //   - ライトグレーの地が最大面積で、明暗コントラストが MARPAT より強い
    //   - グリーンの塊は輪郭が整い、MARPAT のような細い蛇行が少ない
    //     → wander / drift を下げて compact を上げ、丸みのある塊にする
    //   - ブラックは緑塊の内側に落ちる (eat: [1] で緑だけを食う)。
    //     ブラウンは緑と地の境界を縫う細い帯 (eat: [0,1])
    //   - ピクセルが MARPAT より粗い (Issue #30) → cell 5。粗いセルでスペックルを強くすると
    //     微小点アーティファクトが目立つので density は MARPAT より低くする
    name: '07 式 通用迷彩 (中国)', kind: 'growth', ref: 'pla07',
    cell: 5, growDither: 1,
    layers: [
      {color: 1, ratio: 0.545, eat: [0], min: 0.0025, max: 0.009, compact: 1.7, drift: 1.6, jitter: 1.1, wander: 0.25, stratify: 5},
      {color: 3, ratio: 0.11, eat: [1], seedNear: 1, min: 0.001, max: 0.004, compact: 1.6, drift: 1.4, jitter: 1.0, wander: 0.25},
      {color: 2, ratio: 0.11, eat: [0,1], seedNear: 1, min: 0.0008, max: 0.0035, compact: 1.4, drift: 2.6, jitter: 1.0, wander: 0.30},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.05}, {on: 0, dot: 1, density: 0.04},
      {on: 3, dot: 1, density: 0.04}, {on: 2, dot: 0, density: 0.03},
    ],
    colors: [
      {name:'ライトグレー', hex:'#d8d7dc'},
      {name:'グリーン',   hex:'#48594f'},
      {name:'ブラウン',    hex:'#605645'},
      {name:'ブラック',    hex:'#292d30'},
    ],
  },
  emr: {
    // EMR (デジタルフローラ、ロシア)。実物の特徴 (refs/emr.png 実測。面積比 43 / 42 / 10 / 6%):
    //   - カーキとダークグリーンがほぼ同面積で噛み合い、地色がどちらとも言えない
    //   - ピクセルが極小 (参照スウォッチで幅の約 1/290) → cell 3
    //   - クラスタが縦方向へ細長く伸びる。UCP の横長 (elongX) と対称に elongY を使う。
    //     縦異方性を蛇行で崩さないよう drift を MARPAT より下げ、
    //     縦縞の反復に退化しないよう elongY は 1.8 に留めて min/max の分散で崩す
    //   - ブラウンとブラックは緑の縁に沿う細片なので seedNear で連鎖させる
    name: 'EMR (ロシア)', kind: 'growth', ref: 'emr',
    cell: 2, growDither: 1,
    layers: [
      {color: 1, ratio: 0.52, eat: [0], min: 0.0003, max: 0.0015, compact: 1.3, drift: 1.2, jitter: 1.2, wander: 0.25, elongY: 1.8, stratify: 6},
      {color: 2, ratio: 0.15, eat: [0,1], seedNear: 1, min: 0.0002, max: 0.0009, compact: 1.4, drift: 1.0, jitter: 1.0, wander: 0.22, elongY: 1.8},
      {color: 3, ratio: 0.06, eat: [1,2], seedNear: 2, min: 0.00012, max: 0.0005, compact: 1.5, drift: 1.0, jitter: 1.0, wander: 0.22, elongY: 1.8},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.10}, {on: 0, dot: 1, density: 0.10},
      {on: 2, dot: 1, density: 0.07}, {on: 3, dot: 1, density: 0.06},
    ],
    colors: [
      {name:'カーキ',      hex:'#7d7d50'},
      {name:'ダークグリーン', hex:'#434e38'},
      {name:'ブラウン',     hex:'#513d32'},
      {name:'ブラック',     hex:'#302d31'},
    ],
  },
  nwu1: {
    // NWU Type I (米海軍、2008〜2019)。実物の特徴 (refs/nwu1.jpg 実測。面積比 48 / 31 / 17 / 4%):
    //   - 唯一の寒色デジタル。ネイビーブルーが地色 (48%) で、他のデジタル系のように
    //     明色が地になっていない。そこで grid の 0 (成長前の初期値) をネイビーに割り当て、
    //     グレー → ライトブルー → ダークネイビーの順に上へ成長させる
    //     (colors の並びも明度降順ではなく「地色が先頭」にしている)
    //   - ピクセルが MARPAT より粗く塊も大きい (Issue #53) → cell 6、min/max も MARPAT より大きめ
    //   - ライトブルーの塊はグレーの内側〜縁に現れる → seedNear: 1 でグレーに寄せる
    //   - ダークネイビーは最小面積 (4%) で、ライトブルーの塊のすぐ脇に高コントラストの点として散る
    //     → eat: [0,2] / seedNear: 2 でライトブルーに連鎖させる
    //   - 4 色すべて低彩度の寒色でコントラストが低いため、スペックルを強くすると
    //     クラスタ境界が溶けて識別できなくなる。density は MARPAT と同等に留める
    name: 'NWU Type I (米海軍)', kind: 'growth', ref: 'nwu1',
    cell: 6, growDither: 1,
    layers: [
      {color: 1, ratio: 0.40, eat: [0], min: 0.0012, max: 0.0065, compact: 1.3, drift: 2.0, jitter: 1.2, wander: 0.35, stratify: 12},
      {color: 2, ratio: 0.20, eat: [0,1], seedNear: 1, min: 0.0006, max: 0.0045, compact: 1.5, drift: 1.4, jitter: 1.1, wander: 0.30},
      {color: 3, ratio: 0.05, eat: [0,2], seedNear: 2, min: 0.0002, max: 0.0010, compact: 1.5, drift: 1.2, jitter: 1.0, wander: 0.25},
    ],
    growSpeckle: [
      {on: 1, dot: 0, density: 0.06}, {on: 0, dot: 1, density: 0.05},
      {on: 2, dot: 1, density: 0.05}, {on: 3, dot: 1, density: 0.04},
    ],
    // 実測: node tools/extract-palette.mjs refs/private/nwu1.jpg 4 --core
    // (--core = 領域内部の中央値。素の k-means 重心だと最小面積のダークネイビーが
    //  ネイビーとの混色に吸収され #3d4a57 まで持ち上がり、実物の黒に近い版を再現できない)
    colors: [
      {name:'ネイビーブルー',   hex:'#4f5d77'},
      {name:'グレー',         hex:'#7f919a'},
      {name:'ライトブルー',     hex:'#c2d6dd'},
      {name:'ダークネイビー',   hex:'#333f46'},
    ],
  },
  dcu: {
    // 3 カラーデザート (DCU / コーヒーステイン)。実物の特徴:
    //   - ブロブが M81 より大きく丸みが強く、輪郭の入り組みが少ない → 専用ソース図案 (dcusrc) が担う
    //     (クイルトは局所形状 = ソース図案そのものなので、丸みはパラメータでは作れない)
    //   - ライトタンとペールグリーンが大面積を分け合い、ブラウンは細いリボン状に走るだけ (実測 9%)
    name: '3 カラーデザート (DCU)', kind: 'quilt', src: 'dcu', ref: 'dcu',
    // kBase 1.35: ソース図案 (800px) を 1/1.35 に縮小参照する。DCU のブロブは M81 より
    // 大きいが、スウォッチ上ではさらに大きく写っている (M81 スウォッチの形状の約 2.5 倍) ため、
    // そのまま等倍参照すると 512px 出力に 2〜3 個しか入らない。1.35 は実物の見た目
    // (ブロブが画面の 1/3 前後 + ブラウンは細いリボン) に合う倍率で、
    // 多数決ミップマップの発動域 (k > 1.4) を避けて輪郭の階段化も出さない上限でもある。
    // patchR 150: 実物のブロブの大きさはソース図案側で決まるので、patchR は「継ぎ目の頻度」だけを
    // 決める。M81 (185) より小さくしている理由は、DCU では大きいパッチがトーラス上の切断面を招くこと:
    // patchR 230 だとブロブ半径が bRcap (0.42·短辺) に張り付き、完走帯 (OUT_HI 倍) がキャンバス一周を
    // 超えてパッチが自分自身と重なる → 縦継ぎ目の変化率が内部の 3 倍超になる (tests/tiling.test.ts)。
    // 150 なら 8 シードで最大 1.7 倍に収まり、面積比も測定値に最も近い
    kBase: 1.35, patchR: 150, organic: true,
    // frac / divw は 4 要素固定 (genQuilt が 4 色前提で走査する)。4 色目は 0 で無効化。
    // frac はソース図案の実測面積比 (tools/gen-src.mjs の出力) をそのまま置く。
    // ただし DCU では候補選択が境界リング誤差項に支配され (div 項は最大 0.07 対 ring*2.6 ≈ 0.8)、
    // frac / divw を動かしても出力は変わらない。実際の面積比はシード依存で
    // タン 0.27〜0.39 / グリーン 0.50〜0.57 / ブラウン 0.10〜0.16 に落ち着く
    // (完走がグリーンの地を優遇するため測定値よりグリーン寄りになる。既知の系統誤差)
    frac: [0.401, 0.506, 0.093, 0], divw: [1, 1, 1.8, 1],
    colors: [
      {name:'ライトタン',    hex:'#e9d1ae'},
      {name:'ペールグリーン', hex:'#bbb18d'},
      {name:'ブラウン',      hex:'#8f590b'},
    ],
  },
  jgsdf2: {
    // 陸上自衛隊 迷彩 2 型 (1991〜)。実物の特徴:
    //   - ブロブが M81 より丸く小ぶりで、輪郭から小さなローブ (斑点) が多数分岐する二重構造。
    //     クイルトは局所形状 = ソース図案そのものなので、この「丸み + 斑点」は専用ソース図案
    //     (jgsdf2src) が担う。パラメータ側では作れない
    //   - 4 色。緑が地を占め (実測 40%)、タン・ブラウン・黒に近いダークグリーンが上に乗る
    name: '陸自迷彩 2 型風', kind: 'quilt', src: 'jgsdf2', ref: 'jgsdf2',
    // ソース図案の生成:
    //   node tools/gen-src.mjs refs/jgsdf2.jpg src/core/jgsdf2src.js 4 JGSDF2 --resize=800 --blur=1.2 --flatten=80
    //   (参照がスウォッチではなく布地の写真なので前処理が要る。--blur: 織り目の斜め筋を
    //    落とさないと k-means が明度で切ってしまい茶が緑に吸収される。--flatten: 周辺減光を
    //    残すと四隅が丸ごと黒に量子化され、黒の面積比が 10% → 22% に膨らむ)
    // kBase 1.1: ソース図案 (800px) を 1/1.1 に縮小参照する。実物と同じ「512px の画面に
    // ブロブが 6〜7 個」の見え方になる倍率で、1 未満 (= ソースの拡大参照) にすると
    // 最近傍サンプリングで輪郭が階段化するため 1 以上に留める。多数決ミップの発動域
    // (k > 1.4) にも入らない
    // patchR 185: ブロブの大きさはソース図案側で決まるので patchR は「継ぎ目の頻度」だけを決める。
    // ソースが M81 と同じ 800px なので M81 と同値でパッチ / キャンバス比が揃う
    kBase: 1.1, patchR: 185, organic: true,
    // frac はソース図案の実測面積比 (tools/gen-src.mjs の出力)。
    // divw[3] 1.6: 黒は面積が小さい (10%) ので M81 (2.4) ほどではないが重みを足す。
    // 重みが 1 のままだと完走が大面積色を優遇する性質で黒がさらに痩せる
    frac: [0.240, 0.468, 0.186, 0.105], divw: [1, 1, 1, 1.6],
    // 実測: node tools/extract-palette.mjs refs/jgsdf2.jpg 4 --core --flatten=80
    // (--core = 領域内部の中央値。斑点が多い図案なので素の k-means 重心だと輪郭の混色に
    //  引かれて黒が緑寄り #464e45 になり、実物の黒に近い色を再現できない。
    //  --flatten はソースマップ生成と同じ値にして量子化とパレットの前提を揃える)
    colors: [
      {name:'タン',      hex:'#8d8b7f'},
      {name:'グリーン',   hex:'#5e775c'},
      {name:'ブラウン',   hex:'#74524e'},
      {name:'ブラック',   hex:'#46444b'},
    ],
  },
  dpm: {
    // 英軍 DPM (Disruptive Pattern Material、1960 年代〜2010 年頃)。実物の特徴:
    //   - M81 と同系の 4 色ブロブだが、輪郭が筆で描いたようなブラシ状で先端が尖る。
    //     ブロブの縁に刷毛目 (かすれ) が残る。クイルトは局所形状 = ソース図案そのものなので、
    //     この筆致は専用ソース図案 (dpmsrc) が担う
    //   - 黒がブラウン / グリーンの中に細長く入り込む「筆跡」が識別の核。実物は網版印刷で
    //     黒を最後に刷るためこの性質は topLayer (woodland / cce と同じ v21/v22 の構造) が
    //     合致するが、dpmsrc は不採用 (v26)。黒成分 18 個中 12 個が参照画像の縁で切れており
    //     applyTopLayer が除外するため usable 面積が目標の 15% しかなく、残り成分が 6〜7 回
    //     反復してしまう。代わりに下記 divw[3]: 2.4 で下刷りの黒を厚くして確保する
    name: 'DPM 風 (英国)', kind: 'quilt', src: 'dpm', ref: 'dpm',
    // ソース図案の生成:
    //   node tools/gen-src.mjs refs/dpm.jpg src/core/dpmsrc.js 4 DPM --resize=800 --blur=1.5 --flatten=250
    //   (参照は英国防省の布地接写写真 (OGL v1.0)。右側が暗く皺の陰影もあるので前処理が要る。
    //    --blur: 織り目を落とす。--flatten: 照明ムラの平坦化。ブロブが大きい (幅 200px 前後) ので
    //    jgsdf2 の sigma 80 だと図案そのものを照明成分と誤認して砂色が 3% に潰れる。
    //    250 以上で安定 (250 と 400 で面積比の差は 1pt 未満))
    // kBase 1.5: 参照が M81 スウォッチより 2 倍寄って撮られており、800px ソース上のブロブ幅 (200px 前後) が
    // patchR 185 のパッチと同程度になる。1.1 では継ぎ目がブロブ内部を横切り直線の切断面が多発した (v26)。
    // patchR 185: ソースが M81 / jgsdf2 と同じ 800px なので同値。
    // 1 未満 (ソースの拡大参照) にすると最近傍サンプリングで輪郭が階段化する (v25)
    kBase: 1.5, patchR: 185, organic: true,
    // frac はソース図案の実測面積比 (tools/gen-src.mjs の出力)。
    // divw[3] 2.4: topLayer は使えない (参照の黒成分が縁で切れていて反復する、v26) ので、M81 と同じ重みを与えて
    // 完走が大面積色を優遇する性質で痩せないようにする
    frac: [0.172, 0.289, 0.331, 0.208], divw: [1, 1, 1, 2.4],
    // 実測: ソース図案生成と同じ前処理・同じ k-means の量子化重心を採用 (stderr 出力より)
    //   node tools/gen-src.mjs refs/dpm.jpg src/core/dpmsrc.js 4 DPM --resize=800 --blur=1.5 --flatten=250
    //   → 量子化パレット (明度降順): #d8a858 #616022 #50311d #28221f
    // extract-palette.mjs --core は不採用: 照明ムラで砂色が明部 / 暗部の 2 クラスタに割れ、
    // k=4 では黒とブラウンが 1 色に融合する。k=6 なら分離するが砂色が明部側に寄る
    colors: [
      {name:'サンド',     hex:'#d8a858'},
      {name:'グリーン',   hex:'#616022'},
      {name:'ブラウン',   hex:'#50311d'},
      {name:'ブラック',   hex:'#28221f'},
    ],
  },
  tigerstripe: {
    // タイガーストライプ (ベトナム戦争期、1960 年代〜)。実物の特徴:
    //   - 横方向に流れる細長い縞。黒縞が主役で、太さが途中で変わり先端が鋭く尖る。
    //     縞は互いに噛み合い、緩やかにうねりながら分岐・合流する
    //   - 黒縞の縁からは「爪」状の細いフリンジが多数生える。これが識別の核で、
    //     異方性ノイズの閾値化 (等高線バンド) では原理的に出せない。局所形状が
    //     ソース図案そのものになるクイルトなら、この筆致がそのまま保たれる
    //   - グリーン面の内部には、さらに細いライトカーキの線が櫛状に走る。面積比は
    //     6% 弱しかないが、これが無いと「黒縞入りのウッドランド」に見えてしまう
    name: 'タイガーストライプ風', kind: 'quilt', src: 'tigerstripe', ref: 'tigerstripe',
    // ソース図案の生成:
    //   node tools/gen-src.mjs refs/private/tigerstripe.webp src/core/tigerstripesrc.js 4 TIGERSTRIPE
    //   (参照はフラットなスウォッチなので --blur / --flatten は不要。--resize も掛けない:
    //    600px に落とすとライトカーキ細線の面積比が 0.056 → 0.050 に痩せる)
    // slopeLock: 縞の傾きの向きを揃える (pick のコメント参照)。これが無いと mx·my = -1 のパッチで
    // 縞が逆傾きになり、隣接パッチで「く」の字に折れて長距離の流れが消える
    // patchR 120: M81 系 (185) より小さい。ソースの局所形状が「面」でなく「線」なので、パッチが
    // 大きいとソースの数枚のコピーになり面積比フィードバックが働かない (patchR 200 では 512px あたり
    // 5 枚しか貼られず divw が無効化した)。120 なら 14 枚前後で、黒の面積比が実測 0.455 に収束する
    // topLayer は不採用: 黒は縞として参照画像の端まで貫くため、applyTopLayer が除外しない
    // (= 縁に接しない) 黒成分の合計面積は全黒面積の 1.9% しかない (M81 は 0.82、DPM は 0.15 で破綻)。
    // 逆にライトカーキは 0.95 と十分だが、topLayer: 0 で刷ると細線でなく淡い塊が浮いて見える
    // fineDetail: グリーン面を走るライトカーキ細線 (幅 1〜2px、面積比 0.056) を後処理から守る (v34)
    kBase: 0.95, patchR: 120, organic: true, slopeLock: true, fineDetail: true,
    // frac はソース図案の実測面積比 (tools/gen-src.mjs の出力)
    frac: [0.056, 0.210, 0.279, 0.455], divw: [1, 1, 1, 2],
    // 実測: node tools/extract-palette.mjs refs/private/tigerstripe.webp 4 --max-edge=771 --core=2
    //   既定の --max-edge=256 では縞とライトカーキ細線が潰れて 4 色とも暗側に寄るため原寸で測る
    colors: [
      {name:'ライトカーキ', hex:'#9d977d'},
      {name:'カーキ',     hex:'#6f6953'},
      {name:'グリーン',    hex:'#515d49'},
      {name:'ブラック',    hex:'#2e3131'},
    ],
  },
  brushstroke: {
    // ローデシアン・ブラッシュストローク (1965〜1980)。実物の特徴:
    //   - 太い刷毛で斜めに掃いた大ぶりな筆跡。タイガーストライプより縞が太く短く、
    //     端は尖らず丸みを持つ。地色 (サンド) が広く見える
    //   - 筆跡の縁はドライブラシのかすれで毛先状に割れ、飛沫が飛ぶ。この筆致が識別の核で、
    //     ノイズ閾値では原理的に出せない → 局所形状がソース図案そのものになるクイルトを使う
    //   - グリーンをブラウンの上に重ね刷りした箇所が暗いオリーブになる。面積比 13.5% で、
    //     この 4 値目が無いとブラウン面が広がりすぎて「茶色い迷彩」に見える (k=3 で確認)
    name: 'ローデシアン・ブラッシュストローク風', kind: 'quilt', src: 'brushstroke', ref: 'brushstroke',
    // ソース図案の生成:
    //   node tools/gen-src.mjs refs/private/brushstroke.jpg src/core/brushstrokesrc.js 4 BRUSHSTROKE
    //   (参照はフラットなスウォッチなので --blur / --flatten は不要。--resize も掛けない:
    //    960×508 の中身は 480×254 の 1 リピートを 2×2 に敷いたもので、原寸のまま使うと
    //    パッチ窓をタイル境界にまたがせても図案が連続する)
    // slopeLock: 筆跡が斜めに走るため、mx·my = -1 のパッチで傾きが反転すると隣接パッチで
    //   「く」の字に折れて長距離の流れが消える (tigerstripe と同じ理由)
    // kBase 1.0 / patchR 130: kBase は「ソースもパッチ半径 (R = patchR/k) も同じ比で縮める」
    //   ズーム操作なので、図案とパッチの大小関係は patchR 側で決まる。1.0 = ソースを等倍参照
    //   する値で、これより上げると間引きで毛先のかすれ (ソース上 1〜2px) が落ちる。1 未満は
    //   最近傍の拡大階段が出る。R = 130 で 512px あたり 11 枚。色比フィードバック (divw) が
    //   働くには 10 枚以上が要る (v30) ので、これが patchR の上限側の制約になる
    //   (v34 の再現度スコアで kBase 1.2/patchR 155 = 86.0 → 1.0/130 = 91.5)
    // fineDetail: ドライブラシの毛先・掠れ・飛沫を後処理から守る (v34)
    kBase: 1.0, patchR: 130, organic: true, slopeLock: true, fineDetail: true,
    // frac はソース図案の実測面積比 (tools/gen-src.mjs の出力)
    frac: [0.311, 0.257, 0.298, 0.135], divw: [1, 1, 1, 1],
    // 実測: node tools/extract-palette.mjs refs/private/brushstroke.jpg 4 --max-edge=960 --core=2
    //   既定の --max-edge=256 では毛先のかすれが周囲と混色して 4 色とも中間色に寄るため原寸で測る
    colors: [
      {name:'サンド',         hex:'#cab17b'},
      {name:'グリーン',       hex:'#686947'},
      {name:'ブラウン',       hex:'#775539'},
      {name:'ダークオリーブ', hex:'#5a5b3b'},
    ],
  },
  lizard: {
    // フランス軍リザード TAP47 (1950 年代〜1980 年代)。タイガーストライプの原型。実物の特徴:
    //   - 水平寄りに長く伸びる筆跡。ブラッシュストロークより細く、地色の比率が小さい
    //   - 刷毛の毛先が分かれた跡が縞の内部を櫛状に走り、端では点状の飛沫になる
    //   - ブラウンをカーキ地に刷った部分とグリーンの上に刷った部分で明度が違う (重ね刷り)。
    //     この 2 種のブラウンを 1 色に潰すと平板になるため 4 値で扱う
    name: 'リザード (TAP47) 風', kind: 'quilt', src: 'lizard', ref: 'lizard',
    // ソース図案の生成:
    //   node tools/gen-src.mjs refs/private/lizard.png src/core/lizardsrc.js 4 LIZARD --resize=1200
    //   (参照は 11202×5000 と巨大なので縮小する。1200 で 47KB / frac は 1600 と 0.3pt 差、
    //    1600 は 75KB。飛沫の残り具合が同等なので小さい方を採る)
    //   k=3 は不可: グリーンが消えてブラウンが 2 クラスタに割れる
    // slopeLock: tigerstripe と同じ。水平寄りの長い流れを隣接パッチ間で保つ
    // kBase 1.15 / patchR 145: 縞幅は 15〜40px と tigerstripe と同オーダーだが、tigerstripe の
    //   patchR 120 では 1 パッチに縞が 2〜3 本しか入らず、長い水平の流れがパッチ境界で途切れて
    //   短くちぎれた縞に見えた。R = 145/1.15 ≈ 126 (512px あたり 11 枚) で流れが繋がる。
    //   kBase をこれ以上上げると多数決ミップマップが飛沫 (1〜2px) を落とす。1 未満は最近傍で階段化する
    // fineDetail: 刷毛目 (ストローク内部を櫛状に走る細線) と端の飛沫を後処理から守る (v34)
    kBase: 1.15, patchR: 145, organic: true, slopeLock: true, fineDetail: true,
    frac: [0.283, 0.261, 0.229, 0.227], divw: [1, 1, 1, 1],
    // 実測: node tools/extract-palette.mjs refs/private/lizard.png 4 --max-edge=1200 --core=2
    colors: [
      {name:'ライトカーキ',   hex:'#b9b18c'},
      {name:'ブラウン',       hex:'#90664c'},
      {name:'グリーン',       hex:'#6d7348'},
      {name:'ダークブラウン', hex:'#76523c'},
    ],
  },
  dbdu: {
    // 6 カラーデザート (DBDU / チョコレートチップ)。実物の特徴:
    //   - ブロブ層は DCU と同系の大ぶりで丸い形状 → ソース図案は dcu を共有する
    //     (DBDU 実物のフラットなスウォッチはパブリックドメインで入手できないため、
    //      同系統で PD の DCU 図案を流用している。基色は実物の 4 色に対し 3 色)
    //   - 識別点は「小石」を模した黒フチ付きの白い斑点がブロブ内部に散ること → chips 層が担う
    name: '6 カラーデザート (DBDU)', kind: 'quilt', src: 'dcu', ref: 'dbdu',
    kBase: 1.35, patchR: 150, organic: true,
    // frac/divw は dcu からそのまま流用 (dcu 側は blob 層専用パラメータで 4 要素)。
    // dbdu の blob 層が生成する値も 0..2 のみなので意味は保たれる。3 (小石ホワイト) /
    // 4 (黒縁) は下の chips 層が実寸 index に直接描く専用値で、frac/divw の制御対象外
    frac: [0.401, 0.506, 0.093, 0], divw: [1, 1, 1.8, 1],
    // 小石層。r / spacing は「512px・scale 1.0」基準 px、rim は小石半径に対する比。
    // 実物写真 (refs/dbdu.jpg) の見た目に合わせた: 小石はブロブ幅の 1/8 前後で大小が混在し、
    // 黒は全周の輪ではなく片側に寄った三日月として小石と同程度の面積を占める
    chips: {v: 3, rimV: 4, r: 8, rim: 0.42, spacing: 34, density: 0.72, pure: 0.9},
    // 色の並びは index 値の順。ソース図案 (dcu) の面積比が 0.40 / 0.51 / 0.09 なので、
    // 実物で支配的なペールタンを最大面積の値 1 に割り当てる (実物は淡色が地になる)
    colors: [
      {name:'ライトブラウン', hex:'#9a766b'},
      {name:'ペールタン',    hex:'#c6b5a4'},
      {name:'ブラウン',      hex:'#704c44'},
      {name:'小石ホワイト',   hex:'#e5d5cd'},
      {name:'ブラック',      hex:'#1d1f23'},
    ],
  },
  frogskin: {
    // 米軍 M1942 フロッグスキン (通称ダックハンター、1942〜) のグリーン面。実物の特徴:
    //   - 地色 (ライトグリーン) の上に、丸みのある独立した斑点が散る。斑点の輪郭は単純で、
    //     M81 のような枝分かれ・切り合いがない → クイルトではなく斑点を 1 つずつ置く genSpots
    //   - 版は 4 つ。ライム (地色よりやや暗い大きな色むら。斑点というより「地の二層目」) →
    //     タン (小さく少ない淡い斑点) → ダークグリーン (中サイズ) → ブラウン (最大。全面積の 3 割)。
    //     後の版が前の版に部分的に乗る (ブラウンがグリーンの縁に被る) のは捺染の重ね刷りそのもの
    //   - 参照画像 (refs/frogskin.jpg) は CC BY-SA のため量子化したソース図案はアプリに同梱しない。
    //     形状はここで手続き生成し、参照画像は目視比較とパレット実測にだけ使う
    name: 'フロッグスキン風 (M1942 ジャングル面)', kind: 'spots', ref: 'frogskin',
    // r は「512px・scale 1.0」基準の平均半径 px。参照画像 (610px 幅) を 512px に cover した寸法で、
    // ブラウン斑の外接矩形の中央値 37×52 → 最大 70×110 (半径換算 16〜34)、グリーン斑 38×47 (11〜22)、
    // タン斑はその半分程度、ライムの色むらは斑点の 2 倍前後で互いに融合する (gap < 0)。
    // frac は「その版が塗る面積比」(後の版に覆われる分を含む)。参照画像の量子化 (k=8, blur 2) の可視面積比
    // ブラウン 0.30 / グリーン 0.15 / ライム + タン 0.24 / 地 0.32 に、重ね刷りで隠れる分を足した値
    // orient π/2: ブラウン斑・グリーン斑は縦長に偏る (参照の外接矩形 49×94 / 47×95 / 69×109。捺染のロール方向)
    layers: [
      {color: 1, frac: 0.40, r: [30, 60], elong: [0.10, 0.40], lobe: [0.10, 0.25], gap: -0.35, patch: true},
      {color: 2, frac: 0.05, r: [7, 13],  elong: [0.05, 0.30], lobe: [0.05, 0.15], gap: 0.3, over: 0.6},
      {color: 3, frac: 0.18, r: [14, 28], elong: [0.15, 0.40], lobe: [0.08, 0.25], wobble: 0.10, gap: 0.15, over: 0.6, orient: Math.PI/2, orientJitter: 0.9},
      {color: 4, frac: 0.29, r: [22, 42], elong: [0.20, 0.40], lobe: [0.10, 0.25], wobble: 0.10, gap: 0.12, over: 0.6, orient: Math.PI/2, orientJitter: 0.5},
    ],
    // 重ね刷りで挟まれた薄片 (三日月・微小片) の除去閾値。512px・scale 1 基準の px²
    minFrag: 40,
    // 実測: node tools/extract-palette.mjs refs/frogskin.jpg 12 --core=2 --max-edge=610 --blur=2
    // (布地の写真で織り目と陰影が各版の色を 2〜3 クラスタに割るため k を多めに取り、
    //  役割ごとに内部画素数が最大のクラスタを採用。--blur 無しではブラウンが 3 分裂して代表色が定まらない)
    colors: [
      {name:'ライトグリーン', hex:'#93a587'},
      {name:'ライム',        hex:'#85926c'},
      {name:'タン',          hex:'#978d70'},
      {name:'ダークグリーン', hex:'#576b44'},
      {name:'ブラウン',      hex:'#7e6043'},
    ],
  },
  frogskin_beach: {
    // M1942 フロッグスキンのビーチ面 (リバーシブルの裏面)。実物の特徴:
    //   - ジャングル面と同じ「丸い独立した斑点」の設計言語だが、版が 5 → 4 に減り、
    //     地色がクリーム (淡タン) になる。砂浜・植生の乏しい地形向けの配色
    //   - 斑点はジャングル面よりやや小ぶりで、地色が斑の間を細い水路のようにつないで残る
    //     (実測: 地色の連結成分がほぼ 1 個 = 地が網目状につながっている)
    //   - 版は 3 つ。カーキ (小〜中サイズ) → グリーン (中サイズ) → ブラウン (最大) の順に刷り重ねる。
    //     ジャングル面のライムのような「地の二層目」に当たる大きな色むら層は無い
    // リファレンスは refs/private/ の実物スウォッチ (再配布不可)。ソース図案は持たず手続き生成する
    name: 'フロッグスキン風 (M1942 ビーチ面)', kind: 'spots', ref: 'frogskin_beach',
    // r は「512px・scale 1.0」基準の平均半径 px。参照スウォッチを 512px に拡大して測った
    // 等価半径 (√(面積/π)) の p10〜p90: カーキ 7.2〜17.4 / グリーン 6.6〜19.5 / ブラウン 4.8〜29.8。
    // frac は「その版が塗る面積比」(後の版に覆われる分を含む)。可視面積比の実測値
    // カーキ 0.117 / グリーン 0.221 / ブラウン 0.282 / 地 0.380 に重ね刷りで隠れる分を足した値
    // orient π/2: bbox の中央値がカーキ 29×33 / グリーン 31×43 / ブラウン 35×51 と縦長に偏る
    // (ジャングル面と同じ捺染のロール方向。ブラウンが最も強い)
    // ブラウン層の halo: 実物はブラウン斑の周りをグリーンが縁取り、地色は斑の間の細い水路として残る。
    // grow 0.22 は参照スウォッチの縁の太さ (斑半径の 2 割前後) に合わせた
    layers: [
      {color: 1, frac: 0.18, r: [7, 18],  elong: [0.05, 0.25], lobe: [0.08, 0.20], wobble: 0.08, gap: 0.2, over: 0.6},
      {color: 2, frac: 0.12, r: [7, 20],  elong: [0.10, 0.35], lobe: [0.08, 0.25], wobble: 0.10, gap: 0.15, over: 0.6, orient: Math.PI/2, orientJitter: 0.9},
      {color: 3, frac: 0.30, r: [10, 30], elong: [0.15, 0.40], lobe: [0.10, 0.25], wobble: 0.10, gap: 0.05, over: 0.7, orient: Math.PI/2, orientJitter: 0.6,
       halo: {color: 2, grow: 0.22}},
    ],
    minFrag: 40,
    // 実測: node tools/extract-palette.mjs refs/private/frogskin_beach.jpg 4 --core=2 --max-edge=294
    // (平坦なスウォッチなので --flatten / --blur は不要。k=6 まで上げても内部画素を持つクラスタは
    //  4 つのままで、インクが 4 色であることの確認になる)
    colors: [
      {name:'クリーム',      hex:'#e2cc9d'},
      {name:'カーキ',        hex:'#bfa96d'},
      {name:'グリーン',      hex:'#979467'},
      {name:'ブラウン',      hex:'#a98c6a'},
    ],
  },
  ddpm: {
    // 英軍デザート DPM (DDPM、1990 年代〜2010 年頃)。実物の特徴:
    //   - サンド地にブラウン 1 色の 2 色構成。図案は DPM と同じ設計言語 (筆致状の輪郭・細長い筆跡) で、
    //     実物も DPM の 4 版のうち明 2 色をサンド、暗 2 色をブラウンにまとめて刷った派生図案
    //   - ブロブの縁がハーフトーンの点描で崩れる (布地写真では点の群れとして見える。未再現)
    // → DPM のソース図案を 4 値のまま合成し、最後に remap で {サンド, グリーン} → 0 / {ブラウン, 黒} → 1 に統合する。
    //   面積比は DPM 実測 (0.172 + 0.289) : (0.331 + 0.208) = 0.46 : 0.54 で、DDPM 実物スキャンの実測
    //   0.45 : 0.55 (node tools/gen-src.mjs refs/ddpm.jpg /dev/null 2 X --resize=800 --blur=1.0) と一致する。
    //   DDPM スキャンから直接 2 値ソースを作る案は、2 値だと同色どうしの継ぎ目にコストが無く
    //   パッチ輪郭が矩形の切断面として残る (kBase 1.1〜1.8 / patchR 185〜320 で確認) ので採らない。
    //   Issue #26 当初案の「黒 + グリーン → ブラウン」だと 0.17 : 0.83 でサンド地にならない
    name: 'デザート DPM 風 (DDPM)', kind: 'quilt', src: 'dpm', ref: 'ddpm',
    // kBase / patchR / frac / divw は合成段階が DPM そのものなので dpm と同値
    kBase: 1.5, patchR: 185, organic: true,
    frac: [0.172, 0.289, 0.331, 0.208], divw: [1, 1, 1, 2.4],
    remap: [0, 0, 1, 1],
    // 実測: node tools/extract-palette.mjs refs/ddpm.jpg 2 --core
    colors: [
      {name:'サンド',   hex:'#d5d5c9'},
      {name:'ブラウン', hex:'#7a5825'},
    ],
  },
  auscam: {
    // オーストラリア DPCU (Auscam / 通称ヘリーテディー、1980 年代〜)。実物の特徴:
    //   - 5 色。サンド地に、ミッドグリーン / オレンジブラウン / ミッドブラウン / ダークグリーンの
    //     斑が「互いに離れて」置かれる。斑は M81 より小ぶりで丸く、輪郭の入り組みが浅い
    //     → クイルトは局所形状 = ソース図案そのものなので、この丸みと斑の孤立配置は
    //       専用ソース図案 (auscamsrc、5 値) が担う。パラメータでは作れない
    //   - Issue #27 の「パッチ密度を下げて地色を残す」案は現行の genQuilt では効かない:
    //     v17 以降ベースを敷かず全面をパッチで被覆する設計なので、patchR は継ぎ目の頻度しか
    //     決めない。地色比を決めるのはソース図案の面積比 (frac) と面積比フィードバック
    //   - オレンジブラウンの小斑が識別性の核 (jelly bean の由来)。5 色目が平滑化・欠片除去で
    //     消えないよう genQuilt は P.frac.length を色数として全経路に通している
    name: 'オーストラリア DPCU 風', kind: 'quilt', src: 'auscam', ref: 'auscam',
    // ソース図案の生成:
    //   node tools/gen-src.mjs refs/auscam.jpg src/core/auscamsrc.js 5 AUSCAM --blur=1.2 --flatten=120 --thin=5
    //   (参照はスウォッチではなく着用中の布地写真。--blur: 織り目を落とさないと k-means が
    //    設計色ではなく明度で切る。--flatten=120: たたみ皺の陰影を残すとサンド地が
    //    「明部サンド + 暗部サンド」に分かれて 5 色目が失われる。--thin=5: 皺の稜線と影が
    //    細帯・縁取りとして残るとパッチがそれを拾い、出力に直線状の筋が並ぶ)
    // kBase 1.0: ソース図案 (640px) を等倍参照する。実物と同じ「512px の画面に斑が 10 個前後」の
    // 見え方になる倍率。1 未満 (拡大参照) は最近傍サンプリングで輪郭が階段化し、
    // 1.4 超は多数決ミップの発動域に入るため 1.0〜1.35 の帯に収める
    // patchR 150: 斑の大きさはソース図案側で決まるので patchR は継ぎ目の頻度だけを決める。
    // ソースが 640px と小ぶりなので、DCU と同じ 150 でパッチ / キャンバス比を揃える
    kBase: 1.0, patchR: 150, organic: true,
    // frac はソース図案の実測面積比 (tools/gen-src.mjs の出力)。
    // divw[3] 1.6: ミッドブラウンは面積が最小 (10%) なので重みを足す。重みが 1 のままだと
    // シェイプ完走が大面積色を優遇する性質で更に痩せる (jgsdf2 の黒と同じ扱い)。
    // ただし DCU と同様に候補選択は境界リング誤差項に支配されるので、この重みを 2.4 に
    // 上げても出力の面積比はシード依存の振れ (ブラウン 0.04〜0.08) に埋もれる
    frac: [0.269, 0.207, 0.220, 0.101, 0.202], divw: [1, 1, 1, 1.6, 1],
    // 実測: node tools/extract-palette.mjs refs/auscam.jpg 5 --core --flatten=60
    // (--core = 領域内部の中央値。斑の輪郭が滲んだ写真なので素の重心だと混色に引かれる。
    //  --flatten は 256px 縮小後の px なので、640px でソースマップに使った 120 と相対値が揃う)
    // 参照写真は全体が青寄りに転んでおり、ダークグリーンが青緑 (#2d4d57) として出る。
    // 感覚で補正せず実測値のまま採用している (docs/01-tech-verification.md v28)
    colors: [
      {name:'サンド',        hex:'#a8a996'},
      {name:'ミッドグリーン',  hex:'#769b65'},
      {name:'オレンジブラウン', hex:'#a87c4f'},
      {name:'ミッドブラウン',  hex:'#765d3e'},
      {name:'ダークグリーン',  hex:'#2d4d57'},
    ],
  },
  splinter: {
    // ドイツ WWII スプリンター (Splittertarnmuster、1931 年制定・1945 年まで)。実物の特徴:
    //   - 3 色。ライトタン地をグリーンとブラウンの多角形が分割する。破片は小ぶりで数が多い
    //   - 全面に細い縦の破線 (雨線 / Regenmuster) が重なる。1938 年以降のテント幕・スモックの識別点で、
    //     遠距離で多角形の輪郭を溶かすために足された版
    // リファレンスは refs/private/splinter.webp。ソース図案は持たず genSplinter で手続き生成する
    name: 'スプリンター風 (Splittertarn)', kind: 'splinter', ref: 'splinter',
    // cellR 14: 参照画像 (750px タイル) を 512px に合わせたときの 1 破片の差し渡し 27〜40px を、
    // merge 0.5 による 1〜3 セルの統合で作る寸法
    cellR: 14, jitter: 1.5, wtVar: 0.9, merge: 0.5,
    // 実測: node tools/gen-src.mjs refs/private/splinter.webp /dev/null 3 SP (量子化面積比)
    frac: [0.274, 0.311, 0.415],
    minFrag: 70,
    // 雨線は実物と同じくグリーンの版 (color 1)。spacing / len / gap は参照画像を 512px 換算した見え方に
    // 合わせた値 (線間隔 8px・線長 8〜24px・縦の間隔 16px・太さ 1px)。density 0.65 で列を間引き、
    // 全面を均一に覆わず「所々に降っている」濃淡を作る (0.45 では実物より疎、0.7 超で全面が縞に見える)
    rain: {color: 1, spacing: 8, len: 16, gap: 16, thick: 1, density: 0.65, jitter: 0.9},
    // 実測: node tools/extract-palette.mjs refs/private/splinter.webp 4 --core=2
    // (k=4 の 4 クラスタ目は参照画像の透かし文字で内部画素 0。実インクは 3 色)
    colors: [
      {name:'ライトタン', hex:'#dbb78c'},
      {name:'グリーン',   hex:'#9f9d70'},
      {name:'ブラウン',   hex:'#876246'},
    ],
  },
  berezka: {
    // ベリョースカ (白樺) / KLMK オーバーオール、ソ連 1957〜。実物の特徴:
    //   - 2 色のみ。中間色の緑が地 (実測 77%)、その上に淡色の「葉/小枝」状シルエットが散る (23%)。
    //     色で溶け込むのではなく、明色の塊で人型シルエットを破断させる設計 (現行プリセット唯一の明色基調)
    //   - **輪郭が全て水平・垂直の細かい階段でできている**。粗いステンシル版で刷った由来の
    //     直交量子化で、これがベリョースカの視覚的署名。滑らかな曲線輪郭にすると別物に見える
    //   - シルエットは丸い斑ではなく、葉柄から小葉が分かれるような細い分岐形
    // → kind: 'growth' を選ぶ理由: genGrowth は「粗いセル格子でクラスタを成長させ最近傍で実寸に拡大」
    //   するエンジンなので、直交階段が後処理ではなく生成過程そのものから出る (実物のステンシル版と同じ構造)。
    //   クイルト系は不可: 局所形状 = ソース図案なのでパラメータでは分岐形を作れず、かつ 2 値クイルトは
    //   同色どうしの継ぎ目に誤差コストが無くパッチ輪郭が矩形の切断面として残る
    //   (docs/01-tech-verification.md v26)。その矩形が「意図した階段」と見分けられなくなる
    // → ソース図案 (berezkasrc.js) を作らない理由: 参照画像が CC BY-SA 4.0 で、量子化した
    //   インデックスマップを同梱すると share-alike の派生物になる (docs/04-add-preset.md §1、DBDU と同じ判断)。
    //   参照画像は目視比較とパレット実測にのみ使う
    name: 'ベリョースカ風 (KLMK)', kind: 'growth', ref: 'berezka',
    // cell 8: 実物の階段ステップは 785px 幅の参照写真上で 8〜12px。512px・scale 1.0 換算で 5.2〜7.8px。
    //   6 から始めたが --compare で実物より細かく見えたため 8 に上げた
    // growDither 0: 実物の段差は清潔で、境界にディザ的な孤立ピクセルが無い (MARPAT 系との識別点)。
    //   既定 1 を明示的に切る
    cell: 8, growDither: 0,
    // 2 層とも color 1 (淡色) を緑地 (0) から食う。ratio 合計 0.226 = 参照画像の実測面積比。
    //   1 層目 = 主シルエット / 2 層目 = seedNear で 1 層目の縁に連なる小葉
    //   compact 0.5 が分岐形の要: 同色近傍ボーナスを既存プリセット (1.3〜1.5) より大きく下げると
    //   成長前線が固まらず葉柄状に伸びる。0.35 まで下げると motif が繋がって画面を横断する紐になり、
    //   実物の「独立した sprig が散る」構図が壊れる (docs/01-tech-verification.md v31)
    //   stratify 4: growLayer の stratify はスロットをシャッフルして先頭から消費するので、
    //   スロット数 (n²) をクラスタ数 (約 13) に合わせないと「多数から少数を選ぶ」形になり逆に偏る
    layers: [
      {color: 1, ratio: 0.166, eat: [0], min: 0.006, max: 0.020, compact: 0.5, drift: 2.8, jitter: 1.1, wander: 0.65, stratify: 4},
      {color: 1, ratio: 0.060, eat: [0], seedNear: 1, min: 0.003, max: 0.007, compact: 0.7, drift: 2.2, jitter: 1.0, wander: 0.55},
    ],
    // 実測: node tools/extract-palette.mjs refs/private/berezka.jpg 2 --blur=2 --core=3
    // (--blur=2: 布地の織り目を落とさないと k-means が版の色ではなく織りの明暗で切る。
    //  --core=3: 輪郭の混色を除いた領域内部の中央値。--flatten を足しても ±2 で安定)
    colors: [
      {name:'グリーン',   hex:'#5b7457'},
      {name:'ペールグレー', hex:'#b0b4b6'},
    ],
  },
  multicam: {
    // マルチカム風 (Crye Precision MultiCam、2002 年原型 Scorpion → 2004 年商用化。米 SOCOM、2010〜 米陸軍
    // アフガン向け OEF-CP、英 MTP の母体)。実物の特徴 (refs/private/multicam.jpg = 生地写真、Public domain):
    //   - 7 色。背景は横方向にゆるやかに移り変わる帯 (ブラウン → タン → ライトタン → ペールグリーン)。
    //     境界は滲んでいて、帯の中に隣色の島が混じる
    //   - 前景 1: クリームの大きな斑。ライトタンの一段大きい版に包まれ、芯は包みの中で片寄っている
    //   - 前景 2: ダークブラウンの横長で虫状の斑。ブラウンの版が縁として残る (重ね刷りの構造は frogskin_beach の halo と同じ)
    //   - 前景 3: ダークグリーンの小斑と、クリームの微小な丸点 (数は少ない)
    //   - 縦棒: ダークグリーン / ダークブラウンの細い茎が疎らに立つ。同じ Scorpion 系の米陸軍 OCP には無い識別点
    // MultiCam は Crye Precision の商標・意匠なのでソース図案は作らず、特徴の手続き再現に留める (Issue #33)
    name: 'マルチカム風 (MultiCam)', kind: 'layered', ref: 'multicam',
    // 背景帯: bandX 360 / bandY 110 は参照画像 (1280px 幅を 512px に cover) の帯の横 300〜400px・縦 90〜130px に合わせた。
    // colors は暗 → 明の順 (帯の推移がこの順で隣り合う: ブラウンはタンとだけ、ペールグリーンはライトタンとだけ接する)。
    // frac は可視面積比の実測 (下記 gen-src) から前景に覆われる分を戻した値
    bg: {colors: [3, 1, 0, 2], frac: [0.06, 0.32, 0.20, 0.42], bandX: 300, bandY: 110, mottle: 0.22, mottleR: 70},
    // 斑点層は genSpots と同じ schema。r は 512px・scale 1 基準の平均半径 px (参照画像の実測: クリーム斑の
    // 外接矩形 60〜120 × 40〜70、ダークブラウン斑 30〜90 × 12〜30 で横長)。orient 0 = 横長
    layers: [
      // クリーム斑 + ライトタンの包み (grow 0.45、shift 0.6 で芯を片寄せ)
      {color: 5, frac: 0.11, r: [14, 28], elong: [0.20, 0.45], lobe: [0.15, 0.40], wobble: 0.18, gap: 0.25, over: 0.5,
       orient: 0, orientJitter: 0.6, halo: {color: 0, grow: 0.7, shift: 1.0}},
      // ダークブラウンの虫状斑: 横向きの太い筆線 (長さ 30〜90 × 太さ 9〜14px、実測 3〜6:1) + ブラウンの縁
      // halo は grow 1.2 / shift 1.6 で大きくずらし、暗色の斑が「ブラウンの塊の縁に乗る」構図にする
      // (等幅の縁取りだと輪郭線に見える。実物ではブラウンの版が斑よりずっと大きい)
      {type: 'stroke', color: 4, frac: 0.07, len: [10, 80], thick: [8, 14], dir: 0, dirJitter: 0.35, sway: 0.35, taper: 0.35,
       halo: {color: 3, grow: 1.2, shift: 1.6}},
      // ダークグリーンの小斑
      {color: 6, frac: 0.03, r: [4, 10], elong: [0.20, 0.50], lobe: [0.10, 0.25], gap: 0.3, over: 0.6, orient: 0, orientJitter: 0.6},
      // クリームの微小な丸点 (地の色むら扱いで間隔制約に参加しない)
      {color: 5, frac: 0.006, r: [2.5, 4.5], elong: [0.0, 0.10], lobe: [0.0, 0.05], gap: 1.0, patch: true},
      // 縦棒 (欠片除去の後に描く)。本数は 512² 基準
      {type: 'stroke', late: true, color: 6, count: 9, len: [40, 120], thick: 3, dir: Math.PI/2, dirJitter: 0.08, sway: 0.25},
      {type: 'stroke', late: true, color: 4, count: 3, len: [30, 80],  thick: 3, dir: Math.PI/2, dirJitter: 0.08, sway: 0.3},
    ],
    minFrag: 30,
    // 実測: node tools/extract-palette.mjs refs/private/multicam.jpg 7 --blur=1.5 --core=2
    // (生地写真で織り目が版の色を割るので --blur。グラデーション地なので --flatten は使わない = 帯の色差が
    //  照明成分と誤推定される。写真自体がグレー〜ピンク寄りの色被りで、実物より彩度が低い値になっている。
    //  k=8/9 に上げても 2 つ目のグリーン (縦棒の明るい緑) は分離しないので 7 クラスタを採用)。
    // 面積比: node tools/gen-src.mjs refs/private/multicam.jpg /dev/null 7 MC --blur=1.5
    //   → 明度降順 [0.081, 0.135, 0.196, 0.243, 0.187, 0.086, 0.072]
    colors: [
      {name:'ライトタン',    hex:'#a09d9b'},
      {name:'タン',          hex:'#97918c'},
      {name:'ペールグリーン', hex:'#acadb1'},
      {name:'ブラウン',      hex:'#8c8581'},
      {name:'ダークブラウン', hex:'#645259'},
      {name:'クリーム',      hex:'#c5c7d3'},
      {name:'ダークグリーン', hex:'#757870'},
    ],
  },
};

/* ================= 生成入口 ================= */
// opt.tileable (既定 true): 出力を上下左右に並べても境界が連続するトーラス生成
// opt.progress(fraction 0..1): 進捗コールバック (UI 表示用)。opt.baseMax: 多段解像度の基準長辺 (既定 1024)
export function generate(key, w, h, seed, scale, opt={}){
  const P = PRESETS[key];
  switch(P.kind){
    case 'quilt':  return genQuilt(w, h, seed, scale, P, opt);
    case 'growth': return genGrowth(w, h, seed, scale, P, opt);
    case 'spots':  return genSpots(w, h, seed, scale, P, opt);
    case 'splinter': return genSplinter(w, h, seed, scale, P, opt);
    case 'layered': return genLayered(w, h, seed, scale, P, opt);
    default: throw new Error('unknown kind: ' + P.kind);
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
