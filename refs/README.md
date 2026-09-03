# refs/ — 実物リファレンス画像（開発時専用）

生成結果を実物と目視比較し、パレット既定値を実測するための画像。**アプリには同梱しない**（UI の実物比較モードは廃止）。
使い方は `node tools/render.mjs <outdir> <seed> --compare` と `node tools/extract-palette.mjs <image> [k]`。

## 置き場所の 2 段構成

- `refs/<presetKey>.<png|jpg|jpeg|webp>` — 自由ライセンス（Wikimedia Commons 等）の画像。git 管理。出典・作者・ライセンスは README「クレジット・ライセンス注記」に必ず記載する
- `refs/private/<presetKey>.<ext>` — 再配布できない画像（権利上の理由）。**`.gitignore` 対象で絶対にコミットしない**。私的複製の範囲で手元の精度改善にのみ使う。`mkdir -p refs/private` して置く。`render.mjs --compare` はこちらを優先して参照する

## 混入防止（4 層）

1. `.gitignore` の `refs/private/`
2. `.githooks/pre-push`（`pnpm install` の prepare で `core.hooksPath` を設定）→ `tools/check-private-refs.sh <range>`
3. Claude Code の PreToolUse フック（`git push*` の前に同スクリプト）
4. CI / Deploy ワークフロー（同スクリプト）

`git add -f` で強制追加しないこと。万一コミットしてしまった場合は履歴からも除去する（rebase）。

## ファイル名

プリセットキー（`src/core/camo.js` の `PRESETS` のキー）と一致させる。`m81` ではなく `woodland`。
