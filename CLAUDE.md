# CLAUDE.md

このリポジトリで作業する際のガイド。

## プロジェクト概要

迷彩模様のプロシージャル生成 Web アプリ。シード決定的生成・パレット自由変更・PNG/JPG/SVG エクスポートが核。
フェーズ1（技術検証）完了、フェーズ2（仕様整理）の成果は `docs/02-spec.md`。全体の進め方と進捗は README の「進め方と進捗」を参照。
UI 実装時のデザインルールは `.claude/skills/design-system/SKILL.md`（spacious）。今後の開発予定は GitHub Issues。

## コマンド

```bash
pnpm dev                              # Vite 開発サーバー
pnpm build                            # tokens 生成 → tsc → vite build (dist/)
pnpm test                             # Vitest: 決定性テスト + index マップのハッシュスナップショット
pnpm check                            # Biome lint + format (--write で自動整形)
pnpm typecheck                        # tsc -b (noEmit)
pnpm tokens                           # docs/design/spacious-DESIGN.md → src/styles/tokens/_primitives.scss
node tools/render.mjs <outdir> <seed> [scale]   # 全プリセットを 512px PNG で出力（目視検証用）
#   オプション: --tile (2×2 タイル) / --size=WxH / --preset=key / --crop=512 (中央を等倍切出し、高解像度の階段確認)
pnpm deploy                           # 手動デプロイ: build → wrangler deploy。通常は main マージで .github/workflows/deploy.yml が自動実行
cd prototype && node build.mjs        # フェーズ1 プロトタイプ index.html の再ビルド (src/core を参照)
```

検証は「レンダ → 実物リファレンスと目視比較」が基本ループ。Vitest は生成結果の**変化検知**のみ（品質は測れない）。
スナップショットが落ちたら生成結果が変わった証拠。意図した変更なら `docs/01-tech-verification.md` に追記して `pnpm test -u`。

## アーキテクチャ

- `src/core/camo.js` — 生成コア（旧 `prototype/camo.js`）。**browser / Node 共用の ES module、外部依存ゼロ、JS のまま**。型は `camo.d.ts` で与える。この制約は維持すること
  - すべての乱数は座標ハッシュ (`hash2`) または `mulberry32` によるシード決定的生成。`Math.random` 禁止（同一シード→同一出力の保証が製品要件）
  - 「形状（index マップ: `Uint8Array` の色インデックス）」と「色（パレット）」を分離。`generate()` → `{w, h, index, grid?}`、着色は `toRGBA()`。この分離がパレット自由変更の根拠なので崩さない
  - 手法は3系統: `genQuilt`（ブロブパッチ合成、M81 主力）/ `genGrowth`（クラスタ成長、デジタル系）/ `genWoodland`・`genDigital`（ノイズ閾値、従来手法・比較用）
  - プリセットは `PRESETS` に集約。`kind` で生成関数にディスパッチ
  - `generate(key, w, h, seed, scale, opt)`。`opt.tileable`（既定 true）/ `opt.progress(0..1)` / `opt.baseMax`（長辺がこれを超えると縮小生成 → 拡大 → 実寸で後処理。v17）
- `src/core/m81src.js` / `digsrc.js` — M81 / AOR1 / AOR2 実物図案の 4値インデックスマップ（RLE + base64）。再生成は docs 記載の Python 手順。**`digsrc.js`（280KB）は camo.js から静的 import しない**。利用側が動的 import して `registerSources()` で渡す（ブラウザは `src/lib/generate.ts` の `ensureSources`、Node は `tools/render.mjs` / テストで先頭登録）
- `src/app/` — App シェル（`/about` 分岐、URL 状態フック、テーマ）。`src/components/` — UI 部品。`src/lib/` — 状態 ⇄ URL、単位換算、生成の非同期窓口、PNG pHYs、エクスポート、共有、k-means。`src/data/` — プリセット表示メタ、120 色ライブラリ、リファレンス画像（動的 import）
- `src/styles/tokens/` がデザイントークン（§デザイン参照）、`src/styles/ui.scss` が共通クラス。コンポーネントの色・余白は `var(--…)` のみ、生値禁止。新しい余白値が要るときは `_semantic.scss` の `$static` に追加してから使う（未定義 var は無効値になり潰れる）
- `tools/render.mjs` — Node レンダリングハーネス。`tools/gen-tokens.mjs` — トークン生成
- `prototype/app-template.html` — フェーズ1 UI（参照のみ）。`//__INLINE_CAMO__` / `//__INLINE_REFS__` マーカーに build.mjs がインライン展開する。**index.html を直接編集しない**（ビルドで上書きされる）
- `prototype/index.html` — ビルド成果物。Artifact/配布用の単一ファイル
- `prototype/experimental/` — 手法探索の原本。本体に移植済みだが履歴として保持

## デザイン

- ルール: `.claude/skills/design-system/SKILL.md`（spacious）。マーカー内は `npx typeui.sh pull spacious -p claude-code -f skill` の管理領域、プロジェクト固有ルールはマーカー外に書く
- トークン 3 層: `_primitives.scss`（生成物、編集禁止）→ `_semantic.scss`（役割名、light/dark map。**色を変えるのはここ**）→ `_emit.scss`（CSS カスタムプロパティ出力）
- テーマは `<html data-theme>` で切替。`index.html` の inline script が描画前に確定する

## UI の実画面確認

`pnpm dev --port 5199` を起動し、Playwright（`channel: "chrome"` でシステムの Chrome を使う、ブラウザダウンロード不要）でスクリーンショットと書き出しファイルを検証する。デスクトップ 1440 / モバイル 390、ライト / ダーク、書き出した PNG の pHYs と SVG の rect 数を見る。

## 検証ワークフロー（重要）

生成品質の変更を入れたら必ず:
1. `node tools/render.mjs <outdir> <seed> [scale]` を複数シード（1234 / 777 / 211025 など）× 複数スケール（0.7 / 1.0 / 1.5 / 2.0）で実行
2. 出力 PNG を Read で目視し、`docs/01-tech-verification.md` 記載の既知アーティファクト（ブロック感・境界急変・切断面・鏡映対称・市松ノイズ・微小点）が再発していないか確認
3. 変更内容と判断を `docs/01-tech-verification.md` に追記

過去に解消済みの問題と対策の全履歴が同ドキュメントにある。**同じ轍を踏む前に必ず読むこと**。

## 開発ハーネス（`.claude/`）

Issue → PR の定型フローは commands / agents / hooks で自走する。手順の正本は各 command ファイル。

- コマンド: `/start-issue <N>`（worktree 作成 → planner → 実装 → 検証 → docs-sync → PR 作成 → 自動レビュー）/ `/review-pr <PR>` / `/resolve-pr-comments <PR>` / `/resolve-conflicts [PR]` / `/land <N>`（マージ + worktree 後片付け）
- エージェント: `planner`（計画 + Sprint Contract）/ `pr-reviewer` → `pr-comment-resolver`（PR 作成後に自動起動）/ `reviewer`（PR を作らないタスクの独立レビュー）/ `docs-sync`（起動条件は `rules/self-review.md`）
- フック: Stop 時に `src/ tests/ tools/` のソース変更があれば `pnpm check` / `pnpm typecheck` / `pnpm test` を実行し失敗を差し戻す。`gh pr create` 成功で自動レビューフローを指示。Write/Edit 後に Biome 整形。SessionStart でマージ済み worktree を通知
- ルール: `rules/workflow-orchestration.md`（planner / subagent / 検証）、`rules/self-review.md`（独立レビューの二本立て・docs-sync ホワイトリスト）
- 完了条件は上記 3 コマンド成功。生成結果が変わる変更は加えて「検証ワークフロー」（render 目視 → `docs/01-tech-verification.md` 追記 → `pnpm test -u`）。スナップショット更新とデプロイは ask 権限

## 規約

- ドキュメント・コミットメッセージは通常の日本語
- 生成アルゴリズムのコメントは「実物のどの特徴を再現する意図か」を書く（パラメータの意味だけでなく）
- リファレンス画像は Wikimedia Commons 由来のみ（ライセンス管理のため）。追加時は README のクレジット節を更新
- パレット既定値は参照画像からの実測抽出値。感覚で変えない

## 技術方針（`docs/02-spec.md` で確定）

- React 19 + Vite + TypeScript の SPA。状態の正本は URL クエリ（§2.6）
- ホスティング: Cloudflare Workers Static Assets、`camo-generator.suemura.app`。生成は完全クライアントサイド
- 高解像度対応: Web Worker 化は Issue #3。`generate()` 呼び出しは非同期の窓口関数に隠して差し替え可能にする
