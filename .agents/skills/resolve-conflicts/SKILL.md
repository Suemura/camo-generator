---
name: resolve-conflicts
description: PR 作業ブランチへ origin/main を merge して競合を解消し、検証後に通常 push する。
---

# マージ競合の解消

対象 PR／ブランチを特定し、`AGENTS.md` と `.agents/rules/workflow-orchestration.md` を読む。省略時は競合中の PR と現在の作業文脈を照合し、複数候補なら確認する。

1. `git worktree list --porcelain` と PR の headRefName を照合して作業場所を選ぶ。Issue 番号からパスを組み立てない。未コミット変更・進行中の別操作・locked worktree があれば保護し、勝手な stash、reset、unlock はしない。別 worktree で使用中のブランチを二重 checkout しない。
2. worktree の依存とマージドライバを `pnpm install --frozen-lockfile` で準備し、`git fetch origin` 後に `git merge origin/main`。rebase／force push は使用しない。失敗した場合は状態を調べ、残っている競合を正確に把握する。
3. 双方の変更意図を履歴と仕様から理解して統合する。
   - `.gitattributes` の union は正しさを保証しない。スナップショットを検証し、`prototype/refs.js` は空を保つ。`prototype/index.html` は ours で残っても `node prototype/build.mjs` で再生成する。
   - 文書は重複を統合し、`docs/01-tech-verification.md` の検証履歴は両側を時系列で残す。
   - `package.json` の双方の変更を統合し、lockfile は手編集しない。origin/main 側の lockfile を基点に、統合した依存関係が異なる場合だけ `pnpm install` で再解決し、無関係な更新がないか確認する。その後は frozen install で整合性を確認する。
   - 生成器・URL 状態・トークンは両方の意図を保つ。URL の往復テストも残す。生成トークンは `pnpm tokens` で再生成する。
   - スナップショットは手で期待値を捏造しない。出力変更が意図された統合結果と確認できる場合だけ、`docs/04-add-preset.md` の目視・記録・承認手順を満たして更新する。同じプリセットに双方が触れた場合は統合後の実物比較が必要。
4. `pnpm check`、`pnpm typecheck`、`pnpm test` を成功させる。統合意図が両立しない、または原因不明の検証失敗が残る場合は、その状態と判断事項を報告する。
5. 解消ファイルを選択してステージし、マージコミットを作成する。対象ブランチを明示して通常 push。PR の mergeable 状態を再確認し、解消方針、検証、生成結果への影響と状態を報告する。main への PR マージはこのフローに含めない。
