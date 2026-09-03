// パレット抽出ワーカー: 縮小済み画像ピクセルを受け取り k 色を返す。画像はブラウザ外に送らない。
import { kmeans, rgbToHex } from "@/lib/kmeans";

export interface ExtractRequest {
  pixels: Uint8ClampedArray;
  k: number;
}
export interface ExtractResponse {
  colors: string[];
}

self.onmessage = (e: MessageEvent<ExtractRequest>) => {
  const centers = kmeans(e.data.pixels, e.data.k);
  const res: ExtractResponse = { colors: centers.map(rgbToHex) };
  self.postMessage(res);
};
