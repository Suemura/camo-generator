// 迷彩生成コア (browser / node 共用, 依存なし)
// すべて座標ハッシュベースの決定的生成。同一シード → 同一結果。
'use strict';
import { M81_SRC_W, M81_SRC_H, M81_SRC_RLE } from './m81src.js';
import { DCU_SRC_W, DCU_SRC_H, DCU_SRC_RLE } from './dcusrc.js';
import { JGSDF2_SRC_W, JGSDF2_SRC_H, JGSDF2_SRC_RLE } from './jgsdf2src.js';
// 静的 import の目安: m81src (24KB) / dcusrc (18KB) / jgsdf2src (24KB) は
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
function modeFilter(index, w, h, radius, passes, nColors, wrap=false){
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
function decodeSrc(key, rle, W, H){
  if(_srcCache[key]) return _srcCache[key];
  const bin = atob(rle);
  const map = new Uint8Array(W*H);
  let p = 0;
  for(let i=0;i<bin.length;i++){
    const b = bin.charCodeAt(i), v = b>>6, len = b&63;
    map.fill(v, p, p+len); p += len;
  }
  return _srcCache[key] = {map, W, H};
}
const SRCS = {
  m81:  () => decodeSrc('m81',  M81_SRC_RLE,  M81_SRC_W,  M81_SRC_H),
  dcu:  () => decodeSrc('dcu',  DCU_SRC_RLE,  DCU_SRC_W,  DCU_SRC_H),   // 18KB なので静的 import で足りる
  jgsdf2: () => decodeSrc('jgsdf2', JGSDF2_SRC_RLE, JGSDF2_SRC_W, JGSDF2_SRC_H), // 30KB なので静的 import で足りる
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
function applyTopLayer(out, w, h, srcM, SWm, SHm, kmX, kmY, top, targetFrac, seed, wrap){
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
    const ring = [0,0,0,0];
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
    for(let c=1;c<4;c++) if(ring[c] > ring[rc]) rc = c;
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
    const cnt = [0,0,0,0];
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
        for(let c=1;c<4;c++) if(cnt[c] > cnt[b]) b = c;   // 同数タイは小さい色番号
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
  const k = (P.kBase ?? 0.95) * (512/w) * scale;           // target px → src px
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
  const DIVW = P.divw ?? [1, 1, 1, 2];
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
    const cur = [0,0,0,0]; let cn = 0;
    for(let i=0;i<w*h;i+=997){ if(out[i]<4){ cur[out[i]]++; cn++; } }
    const deficit = cn ? TARGET_FRAC.map((t,ci)=> t - cur[ci]/cn) : [0,0,0,0];
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
        const hist = [0,0,0,0]; let hn = 0;
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
            if(rr > rb*0.72 && out[yi*w+xi] < 4){ if(out[yi*w+xi] !== v) err++; cnt++; }  // 境界リング(塗布済のみ)
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
    const cur2 = [0,0,0,0]; let cn2 = 0;
    for(let i=0;i<w*h;i+=997){ if(out[i]<4){ cur2[out[i]]++; cn2++; } }
    const allow2 = mkAllowExtend(cn2 ? TARGET_FRAC.map((t,ci)=> t - cur2[ci]/cn2) : [0,0,0,0]);
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
          if(ov < 4){ if(ov !== srcGet(p, x, y)) err++; cnt++; }
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
    applyTopLayer(out, w, h, srcM, SWm, SHm, kmX, kmY, P.topLayer, TARGET_FRAC[P.topLayer], seed, wrap);
  }
  if(progress) progress(0.8);
  let sm = out;
  // 実寸への拡大 (nearest)。拡大後の階段幅は 1/kFull px
  let kFull = k;
  if(f > 1){
    const big = new Uint8Array(fullW * fullH);
    for(let y=0;y<fullH;y++){
      const sy = Math.min(h-1, (y * h / fullH) | 0) * w;
      for(let x=0;x<fullW;x++) big[y*fullW + x] = out[sy + Math.min(w-1, (x * w / fullW) | 0)];
    }
    sm = big; w = fullW; h = fullH; kFull = k / f;
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
    if(smoothR) sm = modeFilter(sm, w, h, smoothR, 1, 4, wrap);
    if(progress) progress(0.92);
    // 微小フラグメント除去 (画面上で点に見えるサイズの絶対下限つき)
    const minFrag = Math.round(Math.max(70 * (w/512)*(w/512),
                                        110 * (w/512)*(w/512) / (scale*scale)));
    cleanupFragments(sm, w, h, minFrag, wrap);
    cleanupSlivers(sm, w, h, wrap);   // 幅 1px の筋 (輪郭交差の残り) を除去
  }else{
    // デジタル系: ピクセル輪郭を保持。サブセルの欠片だけ除去
    cleanupFragments(sm, w, h, Math.round((P.fragFloor ?? 14) * (w/512)*(w/512)), wrap);
  }
  // 小石層 (DBDU のチョコチップ): 平滑化・欠片除去の「後」に実寸で置く。
  // 先に置くと (1) 多数決ミップで消える (2) 領域成長シームに途中で切られる
  // (3) minFrag (512px で 70〜224px 相当) の欠片除去に丸ごと食われる ため、
  // 1〜2px の黒縁を持つ数 px の斑点はこの位置でしか成立しない。
  if(P.chips) applyChips(sm, w, h, seed, (w/512)/scale, P.chips, wrap);
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
function cleanupSlivers(index, w, h, wrap=false){
  for(let pass=0; pass<2; pass++){
    const src = index.slice();
    const sat = (x, y) => {
      if(wrap) return src[wrapI(y, h)*w + wrapI(x, w)];
      if(x<0||x>=w||y<0||y>=h) return -1;
      return src[y*w + x];
    };
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const v = src[y*w + x];
        const l = sat(x-1, y), r = sat(x+1, y);
        if(l >= 0 && l === r && l !== v){ index[y*w + x] = l; continue; }
        const u = sat(x, y-1), d = sat(x, y+1);
        if(u >= 0 && u === d && u !== v) index[y*w + x] = u;
      }
    }
  }
}
// 面積 < minArea の連結成分を近傍多数色へ併合。nColors は index に現れる色数 (既定 4 = クイルト系)
function cleanupFragments(index, w, h, minArea, wrap=false, nColors=4){
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
    const cnt = new Int32Array(nColors);
    for(const i of cells){
      for(const j of nb(i)) if(index[j]!==col) cnt[index[j]]++;
    }
    let best = 0;
    for(let c2=1;c2<nColors;c2++) if(cnt[c2]>cnt[best]) best = c2;
    if(cnt[best]===0) continue;
    for(const i of cells) index[i] = best;
  }
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
// 斑点をトーラス上に塗る。塗った画素数を返す (面積目標の進捗に使う)
function stampSpot(out, w, h, s, color, wrap){
  const x0 = Math.floor(s.cx - s.rMax), x1 = Math.ceil(s.cx + s.rMax);
  const y0 = Math.floor(s.cy - s.rMax), y1 = Math.ceil(s.cy + s.rMax);
  const N = s.lut.length, rMax2 = s.rMax*s.rMax, rMin2 = s.rMin*s.rMin;
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
        const r = s.lut[Math.min(N-1, (th * N / (Math.PI*2)) | 0)];
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
// patch: true なら「地の色むら」扱いで、他層の間隔制約に参加しない
export function genSpots(w, h, seed, scale, P, opt={}){
  const wrap = opt.tileable !== false;
  const progress = typeof opt.progress === 'function' ? opt.progress : null;
  const rng = mulberry32(seed ^ 0x5b0d);
  const out = new Uint8Array(w*h);            // 0 = 地色
  const u = (w/512) / scale;                  // 特徴サイズの単位 (scale 大 = 模様細かい、他手法と同じ規約)
  const dist2 = (ax, ay, bx, by) => {
    const dx = wrap ? wrapD(ax-bx, w) : ax-bx, dy = wrap ? wrapD(ay-by, h) : ay-by;
    return dx*dx + dy*dy;
  };
  const placed = [];                          // {cx, cy, R, li, patch}
  const layers = P.layers;
  for(let li=0; li<layers.length; li++){
    const L = layers[li];
    if(progress) progress(li / layers.length);
    const target = L.frac * w * h;
    const rLo = L.r[0]*u, rHi = L.r[1]*u;
    const gap = L.gap ?? 0.1, over = L.over ?? 0.4;
    let painted = 0, fails = 0;
    // 候補 8 点から「既存斑点との最短距離が最大」のものを採る (Mitchell's best-candidate)。
    // 一様なダーツ投げより間隔が均され、捺染図案の「斑点が散在するが偏らない」配置になる
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
      painted += stampSpot(out, w, h, s, L.color, wrap);
      placed.push({cx: s.cx, cy: s.cy, R, li, patch: !!L.patch});
    }
  }
  // 後の版の斑点 2 個が前の版の斑点を挟むと、前の色が細い三日月や微小片として残る
  // (捺染の実物では版ずれ以外にこの形は出ない)。P.minFrag (512px・scale 1 基準の px²) 未満の欠片は
  // 近傍多数色へ併合する。それ以外の後処理 (平滑化・多数決) は要らない: 輪郭は解析形状で最初から滑らか
  // 2 パス: cleanupFragments は 1 走査で併合先を決めるため、「欠片 A を欠片 B の色へ併合 → 直後に B 自体が
  // 別の色へ併合」の順で A の画素が 1 px 取り残されることがある (2048px・scale 0.7 で実際に発生)。
  // 2 パス目がその取り残しを拾う
  if(P.minFrag) for(let p=0;p<2;p++) cleanupFragments(out, w, h, P.minFrag * u * u, wrap, P.colors.length);
  if(progress) progress(1);
  return {type:'spots', w, h, index: out};
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
    name: 'フロッグスキン風 (M1942)', kind: 'spots', ref: 'frogskin',
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
