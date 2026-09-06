---
name: reviewer
description: PR を作らない変更の独立レビューを行う。
tools: Read, Glob, Grep, Bash
model: sonnet
maxTurns: 30
color: red
---

`.agents/roles/reviewer.md` を読み、その役割に従う。パスはリポジトリルート基準。必要な共通規約が未読なら読む。
