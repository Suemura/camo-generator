---
description: >-
  GitHub PR のコードレビューを実施し、インラインコメントを投稿する。
  「PR #N をレビューして」「この PR 見て」とレビューを依頼されたら使う
  （通常は PR 作成フックから pr-reviewer エージェント経由で自動実行される）。
argument-hint: <PR番号>
---

GitHub Pull Request のコードレビューを行ってください。

PR: $ARGUMENTS

## 手順

※ 呼び出しプロンプトに変更概要（タスクの要約・変更ファイル一覧・実装意図・生成結果への影響）が含まれる場合はそれを起点にし、レビューは diff 範囲とその直接の参照元 / 参照先に集中する。diff 範囲外のコードベース探索はしない。

1. `gh pr view $ARGUMENTS` で PR の概要を確認
2. `gh pr diff $ARGUMENTS` で diff を取得し、変更内容を把握
3. 以下の観点でレビューを実施:
   - **決定性**: 生成経路（`src/core/`、`src/lib/generate.ts`、Worker）に `Math.random` / `Date.now` / `crypto.getRandomValues` 等の非決定要素が混入していないか。同一シード → 同一出力が製品要件
   - **形状 / 色の分離**: `generate()` が index マップを返し着色は `toRGBA()` に留まっているか。パレット情報が形状生成に漏れていないか
   - **`src/core/camo.js` の制約**: browser / Node 共用 ES module・外部依存ゼロ・JS のまま（型は `camo.d.ts`）。`digsrc.js` を静的 import していないか（初期 JS サイズの根拠）
   - **スナップショットの扱い**: `tests/__snapshots__/` が変わっているなら、`docs/tech-verification/` への新規エントリと render.mjs 目視検証の記述が PR 本文または docs にあるか。無ければ [重要]
   - **パレット・リファレンス**: 既定パレットの変更が実測抽出値に基づくか（感覚調整は [重要]）。リファレンス画像追加が Wikimedia Commons 由来で README クレジットが更新されているか
   - **URL 状態**: `src/lib/state.ts` の変更に往復テストが伴うか、既存の共有 URL が壊れないか（後方互換）
   - **デザイントークン**: SCSS / TSX に生の色・余白値がなく `var(--…)` のみか。新規余白は `_semantic.scss` の `$static` に定義されているか。`_primitives.scss`（生成物）を直接編集していないか
   - **パフォーマンス**: 高解像度（〜4096²）で O(n²) 以上の処理や巨大配列のコピーを増やしていないか。Worker 境界（`src/lib/generate.ts`）を迂回してメインスレッドで生成していないか
   - バグ・潜在的な不具合、エッジケース（scale 端値・タイル境界・プリセット切替）の考慮漏れ
   - 型安全性（TypeScript）、`camo.d.ts` と実装の整合
   - コーディング規約（CLAUDE.md / `.claude/rules/`）。生成アルゴリズムのコメントが「実物のどの特徴を再現する意図か」を書いているか
   - `src/lib/` のロジック変更に対応するテスト（`tests/`）の有無
4. 問題がある場合、インラインコメントとして PR に投稿

## インラインコメントの投稿

レビュー指摘がある場合、以下の形式で GitHub API を使ってインラインコメントを投稿してください:

```bash
cat > /tmp/review_comments.json << 'EOF2'
{
  "commit_id": "{最新のコミットSHA}",
  "event": "COMMENT",
  "body": "このレビューは Claude Code (AI) によるものです。\n\nサマリーをここに記載",
  "comments": [
    {
      "path": "対象ファイルパス",
      "line": 行番号,
      "body": "指摘内容"
    }
  ]
}
EOF2

cat /tmp/review_comments.json | gh api repos/{OWNER}/{REPO}/pulls/{PR_NUMBER}/reviews --input -
```

指摘がない場合も `event: "COMMENT"` で本文のみのレビュー（「指摘なし」とレビューした観点の要約）を投稿し、レビュー済みであることを残す。

## レビュー本文のヘッダー

レビューの `body`（サマリー）の冒頭には必ず以下の一文を入れてください:

> このレビューは **Claude Code (AI)** によるものです。

## コメントのフォーマット

各指摘には以下のプレフィックスを使い分けてください:

- **[重要]** 修正必須の問題（バグ、決定性の破壊、形状/色分離の破壊、camo.js 制約違反、根拠のないスナップショット更新、型エラー等）
- **[改善]** 強く推奨する改善（可読性、保守性、性能）
- **[軽微]** 軽微な改善提案（命名、フォーマット等）
- **[質問]** 意図の確認や質問

## 出力

最後にレビュー結果のサマリーを表示してください:
- 指摘数（重要 / 改善 / 軽微 / 質問）
- 全体的な所感
