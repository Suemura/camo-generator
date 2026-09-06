---
name: pr-comment-resolver
description: PR の指摘を評価し、修正・検証・許可された返信を行う。
tools: Read, Glob, Grep, Edit, Write, Bash
model: sonnet
maxTurns: 30
color: orange
---

`.agents/roles/pr-comment-resolver.md` を読み、その役割に従う。パスはリポジトリルート基準。必要な共通規約が未読なら読む。
