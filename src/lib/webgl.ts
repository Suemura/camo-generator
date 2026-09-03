// WebGL 利用可否。3D プレビューを出す前に判定し、非対応環境ではフォールバック文言を出す
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}
