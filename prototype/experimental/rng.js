// 決定的 RNG ユーティリティ (experimental 共用)
'use strict';

// mulberry32: シード付き高速 PRNG
export function mulberry32(seed){
  let a = seed | 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, lo, hi){ // [lo, hi)
  return lo + Math.floor(rng() * (hi - lo));
}
export function randRange(rng, lo, hi){
  return lo + rng() * (hi - lo);
}
export function pick(rng, arr){
  return arr[Math.floor(rng() * arr.length)];
}

// 1D 値ノイズ (滑らか変調用)
export function noise1d(rng){
  const g = [];
  for(let i=0;i<256;i++) g.push(rng());
  return function(x){
    const ix = Math.floor(x) & 255, fx = x - Math.floor(x);
    const u = fx*fx*(3-2*fx);
    return g[ix] + (g[(ix+1)&255] - g[ix]) * u;
  };
}
