---
description: エージェントのワークフロー・オーケストレーション指針（Plan Mode、Subagent、検証など）
---

# ワークフロー・オーケストレーション

## Issue 起点のタスク開始（/start-issue）
- GitHub Issue に紐づくタスクは `/start-issue <Issue番号>` で開始する。Issue の把握 → worktree・ブランチ作成 → planner → 実装 → 検証 → docs-sync → PR 作成（自動レビューフロー起動）まで 1 コマンドで自走する。作業は Issue 専用の git worktree（`.claude/worktrees/` 配下）で行われるため、複数 Issue の並列作業が可能。
- 詳細手順は `.claude/commands/start-issue.md` を single source of truth とし、本ルール側には手順を重複記述しない。
- 出口は `/land <Issue番号>`（マージ + worktree・ブランチの後片付け）。

## 実装計画の策定
- **Plan Mode で計画済みの場合**: planner の起動をスキップし、合意済みの計画に基づいて実装を開始する。
- **Plan Mode を経ずに直接実装する場合**: 些細ではないタスク（3ステップ以上、またはアーキテクチャの決定事項など）では **planner エージェントを起動**して実装計画を策定する。
- planner は Sprint Contract（完了条件）を含む計画を返す。この契約がタスクの完了基準となる。
- 状況がおかしくなった場合は直ちに手を止めて planner を再起動し、無理に進めないこと。

## Subagent 戦略
- メインのコンテキストウィンドウをクリーンに保つため、subagent を惜しみなく活用する。
- 以下は**必ず subagent に委譲する**:
  - **実装計画**: planner エージェント（Plan Mode で計画済みならスキップ）
  - **ドキュメント同期**: docs-sync エージェント（起動条件は `self-review.md` のホワイトリスト参照）
  - **完了前レビュー**: PR を作成するタスクでは PR 自動レビューフロー（pr-reviewer / pr-comment-resolver）に一本化し、PR 前の reviewer は起動しない。PR を作らないタスクのみ reviewer エージェント（`self-review.md` 参照）
  - **リサーチ・調査**: Explore タイプの subagent
- **サブエージェントには差分とコンテキストを手渡す**: 起動プロンプトに差分（`git diff --stat` 等）・変更概要・関連ファイルパス・生成結果への影響を埋め込み、エージェントがコードベースをゼロから探索し直さないようにする。
- 1 つの subagent につき 1 つのタスクとする。

## 完了前の検証
- 動作を証明しないまま、タスクを完了にしてはならない。
- `pnpm check` / `pnpm typecheck` / `pnpm test` の 3 点成功が完了条件。Stop フック（`.claude/hooks/check-on-stop.sh`）が応答終了時に自動実行し、失敗を差し戻す。
- **生成品質に触れる変更**は CLAUDE.md「検証ワークフロー」が必須: `node tools/render.mjs` を複数シード × 複数スケールで実行 → PNG を Read で目視 → 既知アーティファクトの再発確認 → `docs/01-tech-verification.md` 追記 → 検証プロトタイプの更新 → `pnpm test -u`。**スナップショット更新を先にしない**。
- **新プリセットの追加・生成精度の変更では検証プロトタイプ（Artifact）の更新が完了条件**（CLAUDE.md「検証プロトタイプ（Artifact）」）: `prototype/refs.js` に参照画像を追加 → `node prototype/build.mjs` → `Artifact` ツールに `file_path: prototype/index.html` と既存 URL を渡して同じ URL に再デプロイ → 報告に URL を含める。`tests/prototype-sync.test.ts` が再ビルド忘れを検出するが、再デプロイ忘れは検出できないので自分で確認する。
- UI に触れる変更は `pnpm dev --port 5199` + Playwright（`channel: "chrome"`）でデスクトップ 1440 / モバイル 390 × ライト / ダークを確認する（CLAUDE.md「UI の実画面確認」）。
- 変更が `self-review.md` のホワイトリストに該当する場合は **docs-sync エージェント**を起動する。
- 独立レビューは `self-review.md`「レビューの二本立て」に従う。

## PR 作成後の自動レビューフロー
- `gh pr create` で PR を作成すると、フック（`.claude/hooks/pr-created.sh`）が自動レビューフローの開始を指示する。
- フローの内容:
  1. **pr-reviewer サブエージェント**（利用できない場合は general-purpose で代替）を起動し、`.claude/commands/review-pr.md` の手順で PR をレビューさせ、インラインコメントを投稿させる
  2. レビュー完了後、**pr-comment-resolver サブエージェント**（利用できない場合は general-purpose で代替）を起動し、`.claude/commands/resolve-pr-comments.md` の手順でコメント対応（修正・返信）をさせる
  3. 対応結果のサマリーをユーザーに報告する
- 各エージェントの起動プロンプトには Issue / タスクの要約・変更ファイル一覧・実装意図・生成結果への影響を埋め込む（探索削減）。
- PR 作成コマンドは単独で実行すること（`git push && gh pr create` のような複合コマンドはフックが発火しない）。
- 手動で実行したい場合は `/review-pr <PR番号>` と `/resolve-pr-comments <PR番号>` を使用する。

## エレガントさの要求（バランスよく）
- 些細ではない変更を行う際は一時停止し、「もっとエレガントな方法はないか？」と自問する。
- 場当たり的 (hacky) だと感じた場合はより良いソリューションを実装する。ただし過剰なオーバーエンジニアリングは避ける。
- 生成アルゴリズムでは「実物のどの特徴を再現する意図か」をコメントに書く（CLAUDE.md「規約」）。パラメータの感覚調整で済ませない。

## 自律的なバグ修正
- バグレポートを受け取った場合は詳細な指示を待たず、ログやエラーから自律的に特定し修正を試みる。
- 生成結果の見た目に関する報告は、`docs/01-tech-verification.md` の既知アーティファクト一覧と照合してから着手する（同じ轍を踏まない）。
- ユーザーへのコンテキストスイッチを極力減らすこと。
