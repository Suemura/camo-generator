// 画像からのパレット抽出: 固定シードの k-means (Lloyd)。同じ画像 → 同じ結果 (決定的)。
import { mulberry32 } from "@/core/camo.js";

export type RGB = [number, number, number];

export function kmeans(pixels: Uint8ClampedArray, k: number, iters = 24): RGB[] {
  const n = pixels.length / 4;
  const rng = mulberry32(0x5eed);
  // 初期化: k-means++ 風 (最遠点優先) を決定的に
  const centers: RGB[] = [];
  const first = Math.floor(rng() * n) * 4;
  centers.push([pixels[first], pixels[first + 1], pixels[first + 2]]);
  const d2 = new Float32Array(n);
  while (centers.length < k) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      let best = Number.POSITIVE_INFINITY;
      for (const c of centers) {
        const dr = pixels[i * 4] - c[0];
        const dg = pixels[i * 4 + 1] - c[1];
        const db = pixels[i * 4 + 2] - c[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < best) best = d;
      }
      d2[i] = best;
      sum += best;
    }
    let r = rng() * sum;
    let pick = n - 1;
    for (let i = 0; i < n; i++) {
      r -= d2[i];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    centers.push([pixels[pick * 4], pixels[pick * 4 + 1], pixels[pick * 4 + 2]]);
  }
  const assign = new Uint8Array(n);
  const sums = new Float64Array(k * 3);
  const counts = new Uint32Array(k);
  for (let it = 0; it < iters; it++) {
    sums.fill(0);
    counts.fill(0);
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bd = Number.POSITIVE_INFINITY;
      for (let c = 0; c < k; c++) {
        const dr = pixels[i * 4] - centers[c][0];
        const dg = pixels[i * 4 + 1] - centers[c][1];
        const db = pixels[i * 4 + 2] - centers[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      assign[i] = best;
      sums[best * 3] += pixels[i * 4];
      sums[best * 3 + 1] += pixels[i * 4 + 1];
      sums[best * 3 + 2] += pixels[i * 4 + 2];
      counts[best]++;
    }
    for (let c = 0; c < k; c++) {
      if (!counts[c]) continue;
      centers[c] = [
        sums[c * 3] / counts[c],
        sums[c * 3 + 1] / counts[c],
        sums[c * 3 + 2] / counts[c],
      ];
    }
  }
  // 明度順 (暗→明) に並べる。プリセット既定色との対応づけの基準
  return centers.map((c) => c.map(Math.round) as RGB).sort((a, b) => lum(a) - lum(b));
}

export function lum([r, g, b]: RGB) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function rgbToHex([r, g, b]: RGB) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
