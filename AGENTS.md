# AGENTS.md

Claude Code / Codex 共通の作業規約。実装・コミット・PR の文書は通常の日本語で書く。

## プロジェクトと不変条件

シードから迷彩模様を生成する React 19 + Vite + TypeScript の SPA。生成は完全クライアントサイド。

- `src/core/camo.js` は browser / Node 共用の ES module、外部依存ゼロ、JS のまま。型は `camo.d.ts`。生成経路に `Math.random` など非決定要素を持ち込まない。
- `generate()` の形状（色インデックス）と `toRGBA()` の着色を分離する。パレット変更で形状を変えない。
- 大きな `digsrc.js` は動的 import + `registerSources()` を維持する。
- 状態の正本は URL クエリ。既存の共有 URL との互換性を保つ。
- UI の色・余白は定義済み `var(--…)` のみ。`_primitives.scss` は生成物で編集禁止。色は `_semantic.scss`、新しい余白は同ファイルの `$static` に定義する。
- 実物リファレンスはライセンスにかかわらず `refs/private/` にのみ置き、絶対にコミット・push しない。`prototype/index.local.html` も公開しない。
- パレット既定値は参照画像からの実測値。感覚で変更しない。製造元の Pantone 等の色番号は色数・名称の裏取りに使い、公式測色データが無い sRGB 換算値は採らない。手順は `docs/04-add-preset.md` §4。生成アルゴリズムのコメントには、実物のどの特徴を再現する意図かを書く。
- main への変更はブランチ + PR 経由。マージは対象 PR を特定したユーザーの明示依頼がある場合のみ、実行直前に番号・タイトル・方式を提示して承認を得る。「デプロイして」「進めて」からマージを推測しない。
- main への直接 push は原則禁止。明示依頼があっても対象コミット・件数・理由を提示し、一度確認する。権限ダイアログはこの確認の代替ではない。force push は行わない。
- 作業開始時に Git の状態を確認し、他者の未コミット変更・未追跡ファイルを保護する。

## 作業開始時に読む資料

このファイルに加え、以下の共通ルールを未読なら読む。リンク先が自動注入済みとは仮定しない。パスはリポジトリルート基準。

- `.agents/rules/workflow-orchestration.md` — 計画、分担、Git 操作、検証の順序。
- `.agents/rules/self-review.md` — docs-sync と独立レビューの起動条件。

タスクに応じて必要な資料だけ読む。

| 作業 | 参照先 |
| --- | --- |
| 概要・コマンド・進捗 | `README.md` |
| アーキテクチャ・モジュール境界 | `docs/architecture.md` |
| 仕様・URL 状態・技術選定 | `docs/02-spec.md` |
| UI | `.agents/skills/design-system/SKILL.md` |
| 生成精度変更 | `docs/01-tech-verification.md`（手法の選び方・既知アーティファクト・捨てた案）、`docs/04-add-preset.md` §4–5 |
| 新プリセット | `docs/04-add-preset.md` 全体（8 点セットが正本） |
| デプロイ | `docs/03-deploy.md` |
| エージェント設定・導入・トラブル対応 | `docs/05-agent-workflow.md` |

## ドキュメントの方針

ドキュメントはソース・テスト・PR・Issue から復元できないものだけを置く。二重管理は必ず食い違い、食い違った時点で読む価値が消える。

- 書かない: 作業報告（「検証した」「不変を確認した」）、日付・Issue / PR 番号つきの時系列ログ、進捗表・フェーズ表、残課題、総数などの数値（「100 色以上」で足りる）、ソースを読めば分かる構造の説明。
- 置き場所: パラメータの値と根拠は `PRESETS` のコメント。検証したシード・スケール・面積比・性能は PR 本文。残課題は Issue。生成手法の知見（症状 → 原因 → 対策、捨てた案、実測の罠）は `docs/01-tech-verification.md` の該当節に箇条書き 1 つ。カラーライブラリの出典は各エントリの `source`。
- 新しい文書・新しい節を作る前に「既存のどこに 1 行足せば足りるか」を先に問う。変更ログ専用の文書・節は作らない。

## コマンドと検証

Node.js 22 以上 / pnpm 10。`pnpm install --frozen-lockfile` で依存を導入する。worktree 作成後も必須（prepare が Git hooks と `merge.ours.driver` を設定）。

```bash
pnpm dev --port 5199
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

変更完了前に check / typecheck / test の成功を確認する。ビルド・設定・依存・ハーネス変更は build も確認。フックがあるだけでは実行済みとみなさない。

- 生成結果の変更は複数シード（1234 / 777 / 211025）× スケール（0.7 / 1.0 / 1.5 / 2.0）を `tools/render.mjs` でレンダリングし、実物と目視比較する。Vitest は変化検知であり品質を測れない。
- PR に貼る検証画像（`verify-assets`）のスケール比較は ×1 / ×2 / ×5 / ×10 で作る（`docs/04-add-preset.md` §6）。
- 意図した変化を目視確認し、プロトタイプを再ビルドした後で `pnpm test -u`。スナップショット更新・手動デプロイは、その操作が既存の依頼に含まれない場合は確認する。
- 新プリセット・生成手法変更ではサムネイルも再生成。`node prototype/build.mjs` は必須。生成物 `prototype/index.html` を直接編集しない。手元の比較は同時生成される `prototype/index.local.html` を使う。詳細は `docs/04-add-preset.md`。
- UI 変更は開発サーバーと利用可能なブラウザツールで確認。Playwright 使用時は `channel: "chrome"`。デスクトップ 1440 / モバイル 390 × ライト / ダーク、関連する単一 / タイル / 3D 表示・モデル切替・WebGL 非対応時のフォールバックを確認する。書き出し変更では PNG の pHYs と SVG の rect 数も確認。

## 共通ワークフローの入口

`.agents/skills/` にある `start-issue` / `review-pr` / `resolve-pr-comments` / `resolve-conflicts` / `land` を必要時に読む。Claude の `/start-issue` 等も同じ手順を使う。独自エージェントの役割本文は `.agents/roles/` が正本。

Codex の作業ブランチは既定 `codex/`。モデルは利用者の選択を継承し、共通資料に固定しない。承認質問・ブラウザ・サブエージェントなどの具体的な呼び出しは、そのセッションに実在するツールを使う。利用不能な工程は未実施と明記する。
