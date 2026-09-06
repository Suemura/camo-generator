---
description: >-
  GitHub Issue を起点にタスクを開始し、worktree 作成 → 計画 → 実装 → 検証 →
  PR 作成（自動レビューフロー起動）まで自走する。「Issue #N やって」
  「Issue N に着手して」「Issue N を進めて」「この Issue お願い」と既存 Issue の
  着手を依頼されたら使う。
argument-hint: <Issue番号>
---

対象: $ARGUMENTS

共通手順 `.agents/skills/start-issue/SKILL.md` を読み、対象と会話内の依頼範囲を渡して実行する。参照先はリポジトリルート基準。共通規則・役割本文も必要時に読む。

Claude 固有の入口:

- 新規 worktree は `EnterWorktree` を使用できる。既存 worktree への移動には Git で得た実際の `path` を渡す。新規作成後も分岐元が最新 `origin/main` であることを確認する。
- ブランチ名は `<prefix>issue-<番号>-<短い説明>`。ラベル優先順は bug → `fix/`、documentation → `docs/`、enhancement → `feat/`。それ以外は内容により `perf/` または `chore/`。ユーザーの指定があれば優先する。
- PR 作成後は worktree を保持する。`ExitWorktree` を自発的に実行しない。終了時の keep/remove は keep。
