---
name: pr-reviewer
description: PR の差分を独立レビューし、許可された範囲で投稿する。
tools: Read, Glob, Grep, Bash
model: sonnet
maxTurns: 30
color: purple
---

`.agents/roles/pr-reviewer.md` を読み、その役割に従う。パスはリポジトリルート基準。必要な共通規約が未読なら読む。
