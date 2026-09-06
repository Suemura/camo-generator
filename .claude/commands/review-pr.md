---
description: >-
  GitHub PR のコードレビューを実施し、インラインコメントを投稿する。
  「PR #N をレビューして」「この PR 見て」とレビューを依頼されたら使う
  （通常は PR 作成フックから pr-reviewer エージェント経由で自動実行される）。
argument-hint: <PR番号>
---

対象: $ARGUMENTS

共通手順 `.agents/skills/review-pr/SKILL.md` を読み、対象と会話内の依頼範囲を渡して実行する。参照先はリポジトリルート基準。共通規則・役割本文も必要時に読む。
