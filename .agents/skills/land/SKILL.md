---
name: land
description: 明示的に指定された PR を承認後にマージし、またはマージ済み PR の worktree とローカルブランチを安全に片付ける。
---

# PR のマージと後片付け

`AGENTS.md` と `.agents/rules/workflow-orchestration.md` を読む。「マージして」「land して」と対象 PR を特定した明示依頼が必要。「デプロイして」「反映して」からマージを推測しない。マージ済み PR の後片付けだけの依頼でも使用できるが、OPEN の PR をその依頼でマージしない。

## 対象とマージ

1. PR 番号・Issue 番号・ブランチ名を PR 情報と照合する。数値はまず PR として検索し、Issue なら closing reference、本文、headRefName を確認して対応づける。Issue と PR は同じ番号とは限らない。対応が曖昧なら確認する。
2. PR の state、baseRefName、headRefName、headRefOid、mergeable と `gh pr checks <番号>` を確認する。CONFLICTING は競合解消フローへ、チェックの失敗・未完了は中断して報告する。このリポジトリには CI があるため、チェック不在も設定・実行状態を確認し、ローカル成功だけで通過扱いしない。
3. OPEN なら実行直前に「PR #<番号>『<タイトル>』を main にマージコミット方式でマージしますか？ Actions の Deploy が本番へ自動デプロイします」と具体的な承認を得る。環境の質問機構、または通常の会話で確認する。コマンド実行権限のダイアログはこの承認の代わりにならない。拒否・無回答ではマージも後片付けも行わない。
4. 承認された head SHA を再確認し、`gh pr merge <番号> --merge --match-head-commit <SHA>` を実行する。head が変わった場合は最新差分とチェックを再確認し、新たに承認を得る。MERGED ならマージを省略する。CLOSED で未マージなら後片付け対象と決めつけず確認する。

## 後片付けとデプロイ

- PR が MERGED であることと mergeCommit SHA を取得する。`git worktree list --porcelain` から headRefName の実際の作業場所を特定する。固定パスや Issue 番号から推測しない。
- 削除対象の外の checkout から行う。未コミット変更（未追跡ファイルを含む）・locked 状態・PR head にないローカル追加コミットがあれば削除せず報告する。`--force`、自動 unlock、`git branch -D` は使わない。対象に問題がなければ `git worktree remove <実際のパス>` と `git branch -d <headRefName>` を行う。安全な削除が拒否されたら原因を説明し、強制削除しない。既に存在しない対象はスキップする。
- main の checkout が clean で main 上にある場合だけ `git fetch origin` と `git pull --ff-only` で更新する。他の作業ブランチを勝手に切り替えない。
- `docs/03-deploy.md` に従い、対象 mergeCommit SHA と一致する main の Deploy run を確認する。最新1件だけで成功を判断せず、`gh run list --workflow deploy.yml --commit <mergeCommit SHA>` 等で絞り、該当 run の完了を待って結果を確認する。起動しない・失敗した場合はその事実と run URL／原因を報告する。手動 `pnpm deploy` は行わない。

PR URL、マージ結果、削除／保持した worktree とブランチ、実際の Issue クローズ状態、main の状態、対象 Deploy の結果を報告する。
