#!/bin/bash
# PreToolUse フック (Bash: git push*): push 前に (1) refs/private/ の混入検査、
# (2) main への暗黙 push のブロック、の 2 層を行う。
# (1) は見つかれば exit 2 でツール実行をブロックして Claude に差し戻す。
# git 側の .githooks/pre-push と二重になるが、hooksPath が未設定の環境でも止めるための層。
# range を HEAD 固定にしているのは、この層が「現在チェックアウト中のブランチを push する」
# Claude Code セッションの操作のみを想定した保険だから。任意 ref/tag の厳密な検査は
# git 側 .githooks/pre-push が stdin で渡される push 対象 ref ごとに行う（そちらが正）。
# (2) は `.claude/settings.json` の ask パターンが `main` を明示した push 形式しか
# 捕捉できない穴を埋める層。main チェックアウト中に `git push`（引数なし）や
# `git push origin`（ブランチ省略）を実行すると upstream 追跡で main へ push されるが、
# コマンド文字列に `main` が現れないため settings 側の ask 権限が発火しない。

input=$(cat)
work_dir=""
command=""
if command -v jq > /dev/null 2>&1; then
  work_dir=$(echo "$input" | jq -r '.cwd // empty' 2>/dev/null)
  command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
fi
cd "${work_dir:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0

# settings の `if: "Bash(git push*)"` は複合コマンド（for ループ・パイプ・サブシェル等）を
# 解析できないと保守的に発火するため、push と無関係なコマンドもここに流れてくる。
# 自前で `git push` を含むかを確認して素通りさせる。これが無いと main チェックアウト中に
# `main` の文字を含まないあらゆるコマンドが下の case で exit 2 され、作業が止まる。
case "$command" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

# main への暗黙 push ブロック（削除・main 明示指定は素通り）
case "$command" in
  *--delete*|*" -d "*|*" -d")
    ;;
  *main*)
    ;;
  *)
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ "$current_branch" = "main" ]; then
      echo "main への直接 push は原則禁止。ブランチを切って PR にする。" >&2
      echo "明示指示がある場合は \`git push origin main\` と main を明示して実行する（ask 権限 + AskUserQuestion 確認の対象になる）。" >&2
      exit 2
    fi
    ;;
esac

script="$(git rev-parse --show-toplevel 2>/dev/null)/tools/check-private-refs.sh"
[ -f "$script" ] || exit 0

if ! out=$(bash "$script" HEAD 2>&1); then
  echo "refs/private/ がコミット履歴に含まれています。push を中止しました。" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
