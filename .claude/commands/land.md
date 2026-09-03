---
description: >-
  PR のマージと後片付け（worktree・ローカルブランチ削除・main 更新）を一括実行。
  「マージして」「PR を取り込んで」「マージしたから worktree 消して/片付けて」
  「後片付けして」「worktree 削除して」と言われたら使う。マージ済み PR の
  後片付けだけの依頼にも使う。
argument-hint: <Issue番号 | PR番号 | ブランチ名>
---

PR のマージと後片付け（worktree・ブランチ削除）を一括で行ってください。

対象: $ARGUMENTS

このコマンドは「PR マージ → worktree 削除 → ローカルブランチ削除 → main 更新」を 1 コマンドで完遂する出口である。`/start-issue` と対になる。マージは `gh pr merge` の ask 権限（`.claude/settings.json`）によりユーザーの承認ダイアログを経るため、勝手にマージされることはない。

## 手順

### 1. 対象 PR の特定

引数は Issue 番号・PR 番号・ブランチ名のいずれか（`#` 付きは除去）。GitHub では Issue と PR が番号空間を共有するため、以下の順で解決する:

1. `gh pr view {番号} --json number,title,state,headRefName,mergeable,url` が成功 → その PR
2. 失敗した場合は Issue 番号とみなし、`gh pr list --state all --search "{番号} in:title,body" --json number,title,state,headRefName` とブランチパターン `*issue-{番号}-*` から対応 PR を探す
3. 引数なしの場合: `git worktree list` と `gh pr list --state open` を突き合わせ、候補を提示してユーザーに確認する

対応 PR が見つからない・複数候補で絞れない場合は中断して確認する。

### 2. マージ（PR が OPEN の場合のみ）

- `gh pr checks {PR番号}` でチェックの状態を確認する。**チェックが存在し、未完了・失敗がある場合は中断して報告する**。チェックが 1 つもない場合（このリポジトリは現時点で GitHub Actions 未設定）はスキップしてよいが、ローカルで `pnpm check` / `pnpm typecheck` / `pnpm test` が通っていることを PR の会話または worktree で確認する
- `mergeable` が `CONFLICTING` の場合は中断し、`/resolve-conflicts {PR番号}` の実行を案内する
- マージ実行（このリポジトリはマージコミット方式）:

```bash
gh pr merge {PR番号} --merge
```

- ask 権限でユーザー承認ダイアログが出る。拒否されたら以降の後片付けも行わず終了する
- PR が既に `MERGED` の場合はこの手順をスキップして後片付けへ進む

### 3. 後片付け

メイン checkout（worktree 外）で実行する:

```bash
# worktree が存在する場合（dirty なら中断して確認）
git worktree remove .claude/worktrees/issue-{番号}
# ローカルブランチ削除（マージ確認済みのため -D でよい）
git branch -D {headRefName}
# main を最新化（メイン checkout が main にいる場合のみ）
git fetch origin && git pull --ff-only
```

- worktree に未コミット変更がある場合は `git worktree remove` が失敗する。**`--force` を自動で付けず**、差分概要を提示してユーザーに確認する
- worktree・ローカルブランチが存在しない場合はスキップ（エラーにしない）
- locked worktree はユーザー確認なしに unlock しない

### 4. 報告

- マージした PR（番号・タイトル・URL）/ 既にマージ済みだった旨
- 削除した worktree・ブランチ
- `Closes #N` により自動クローズされた Issue（PR 本文から判定）
- main の最新コミット
- デプロイ: main へのマージで GitHub Actions「Deploy」が自動実行される。マージ後 `gh run list --workflow Deploy --limit 1` で起動を確認し、結果（成功 / 失敗と URL）を報告する。失敗時の切り分けは `docs/03-deploy.md` §4。`pnpm deploy` はこのコマンドからは実行しない

## 中断条件

- 対象 PR を特定できない / 複数候補がある
- チェックが未完了または失敗している
- PR がコンフリクト状態（`/resolve-conflicts` を案内）
- マージ承認が拒否された
- worktree に未コミット変更がある
