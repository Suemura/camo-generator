# refs/ — 実物リファレンス画像（開発時専用・リポジトリ非管理）

生成結果を実物と目視比較し、パレット既定値を実測するための画像。**リポジトリには置かず、アプリにも同梱しない**（UI の実物比較モードは廃止）。
使い方は `node tools/render.mjs <outdir> <seed> --compare` と `node tools/extract-palette.mjs <image> [k]`。

## 置き場所

画像はライセンスの種類にかかわらず、すべて `refs/private/<presetKey>.<ext>`（`png` / `jpg` / `jpeg` / `webp`）に置く。
`mkdir -p refs/private` して各自で用意する。`.gitignore` 対象なので **絶対にコミットしない**。
画像が無くても生成・テストは動く（比較と実測ができないだけ）。

## 混入防止（4 層）

1. `.gitignore` の `refs/private/`
2. `.githooks/pre-push`（`pnpm install` の prepare で `core.hooksPath` を設定）→ `tools/check-private-refs.sh <range>`
3. Claude Code の PreToolUse フック（`git push*` の前に同スクリプト）
4. CI / Deploy ワークフロー（同スクリプト）

`git add -f` で強制追加しないこと。万一コミットしてしまった場合は履歴からも除去する（rebase）。

## ファイル名

プリセットキー（`src/core/camo.js` の `PRESETS` のキー）と一致させる。`m81` ではなく `woodland`。
