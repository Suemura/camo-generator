// prototype/index.html は src/core/* のインライン展開ビルドで、精度検証用 Artifact の実体でもある。
// 再ビルドを忘れると古い生成コアが焼き付いたまま残り、検証環境とアプリの出力がずれる
// （実際に v18 より前の pasteBlob が残っていたことがある）。
// 生成コアを変えたら `node prototype/build.mjs` → Artifact 再デプロイまでを必ず行う。
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildIndexHtml, indexPath } from "../prototype/build.mjs";

describe("検証プロトタイプの同期", () => {
  it("prototype/index.html が src/core/* の現状と一致する (node prototype/build.mjs で再ビルドする)", () => {
    expect(readFileSync(indexPath, "utf8")).toBe(buildIndexHtml());
  });
});
