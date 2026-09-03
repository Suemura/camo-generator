---
description: >-
  PR ブランチのマージコンフリクトを origin/main のマージ取り込みで解消し、
  check / typecheck / test を通して push する。「コンフリクト解消して」
  「コンフリクト直して」「コンフリクト起きてる」「マージできない」と
  言われたら使う。
argument-hint: "[PR番号 | ブランチ名]"
---

PR ブランチのコンフリクトを解消し、検証して push してください。

対象: $ARGUMENTS

このコマンドは「origin/main の取り込み → コンフリクト解消 → 検証 → push」を定型化する。このリポジトリは rebase ではなく **merge 方式**で履歴を作っているため、それに従う。

## 手順

### 1. 対象ブランチの特定と作業場所

- 引数は PR 番号またはブランチ名（省略時: `gh pr list --state open --json number,title,headRefName,mergeable` からコンフリクト中の PR を探し、複数あれば確認する）
- PR 番号なら `gh pr view {番号} --json headRefName,mergeable,url` でブランチ名を得る
- 作業場所の優先順位:
  1. 対応する worktree（`.claude/worktrees/issue-{番号}/`）が存在 → `EnterWorktree` の `path` 指定で入る
  2. worktree がない → メイン checkout の状態を確認（未コミット変更があれば中断）し、`git switch {ブランチ名}` する
- worktree / checkout に未コミット変更がある場合は中断して確認する

### 2. マージ

```bash
git fetch origin
git merge origin/main
```

コンフリクトが出たら `git status --porcelain` と `git diff` で全コンフリクトファイルを把握する。

### 3. 解消方針

**両側の変更意図を理解してから統合する**こと。機械的にどちらか一方を採用しない。定番パターン:

- **`.gitattributes` で自動解決されるもの**: `tests/__snapshots__/*.snap` / `prototype/refs.js` / `docs/01-tech-verification.md`（索引）は `merge=union`、`prototype/index.html` は `merge=ours`。コンフリクトとして出てこないが、**union は両側の行を機械的に並べるだけ**なので、解消後に順序（索引は日付順）と `pnpm test` での妥当性を必ず確認する。`prototype/index.html` は `node prototype/build.mjs` で再生成する
- **CLAUDE.md / README.md / docs/**: 両側の追記を統合する。セクション単位で両方を残し、重複記述は一本化。検証記録は `docs/tech-verification/` の 1 エントリ 1 ファイルなので、別エントリどうしなら衝突しない（衝突するのは同じエントリを両側で編集したときだけ）
- **pnpm-lock.yaml**: 手で編集しない。`git checkout --theirs pnpm-lock.yaml`（origin/main 側を採用）した上で、自ブランチが依存を追加している場合のみ `pnpm install` で再解決する。依存追加がなければ theirs 採用のみでよい
- **package.json**: scripts / dependencies を両側マージ。lockfile と整合させる
- **`tests/__snapshots__/determinism.test.ts.snap`**: 手で統合しない。両側が生成結果を変えている場合、マージ後の実際の出力が正なので、解消後に `pnpm test -u` で再生成する。ただし**両側の変更が同じプリセットの生成パラメータに触れている場合は、統合後の見た目を `node tools/render.mjs` で確認し、`docs/01-tech-verification.md` に両者の統合結果を追記してから**更新する
- **`src/core/camo.js`**: 双方の変更目的（対応 Issue / PR）を `git log` で確認し、両方の意図（どの実物特徴の再現か）が生きる形に統合する。判断がつかない場合は中断してユーザーに提示する
- **`src/lib/state.ts`（URL 状態）**: 両側のパラメータ追加を統合し、キー名の衝突がないか確認する。往復テストを両側分残す
- **SCSS トークン（`_semantic.scss`）**: 両側の追加を統合する。`_primitives.scss` は生成物のためコンフリクトしない（していたら `pnpm tokens` で再生成）
- **その他ソースコード**: 双方の変更目的を `git log` で確認し、両方の意図が生きる形に統合する。判断がつかない場合は中断してユーザーに提示する

### 4. 検証

```bash
pnpm check
pnpm typecheck
pnpm test
```

3 つすべて成功が完了条件。マージ起因の失敗（型の突き合わせ・テストの期待値）は修正して再実行する。node_modules がない worktree では先に `pnpm install --frozen-lockfile`（lockfile 解消後も `pnpm install` ではなく `--frozen-lockfile` を使う）。`_primitives.scss` がなければ `pnpm tokens`。

### 5. コミットと push

- マージコミットのメッセージはデフォルト（`Merge remote-tracking branch 'origin/main' into <branch>`）のままでよい。解消内容に特記事項があれば本文に日本語で 1-2 行追記する
- `git push` する（force push は禁止・不要。マージ方式なので履歴は前進するだけ）
- push 後、`gh pr view {番号} --json mergeable` で `MERGEABLE` になったことを確認する（GitHub 側の再計算に数秒かかることがある）

### 6. 報告

- 解消したファイルと統合方針の要約（1 ファイル 1 行）
- 検証結果（check / typecheck / test）
- スナップショットを再生成した場合はその旨と docs 追記の有無
- PR の mergeable 状態

## 中断条件

- 対象 PR / ブランチを特定できない
- 作業場所に未コミット変更がある
- 双方の変更意図が衝突していて統合判断がつかない（両案を提示して確認）
- 検証が解消と無関係な理由で失敗する
