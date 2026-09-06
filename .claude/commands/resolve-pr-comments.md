---
description: >-
  GitHub PR のレビューコメントを読み取り、修正対応・回答・返信・push を行う。
  「レビューコメントに対応して」「PR #N の指摘を直して」と言われたら使う
  （通常は PR 作成フックから pr-comment-resolver エージェント経由で自動実行される）。
argument-hint: <PR番号>
---

対象: $ARGUMENTS

共通手順 `.agents/skills/resolve-pr-comments/SKILL.md` を読み、対象と会話内の依頼範囲を渡して実行する。参照先はリポジトリルート基準。共通規則・役割本文も必要時に読む。
