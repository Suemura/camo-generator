#!/bin/bash
# PreToolUse フック (Bash: git push*): push 前に refs/private/ の混入を検査し、
# 見つかれば exit 2 でツール実行をブロックして Claude に差し戻す。
# git 側の .githooks/pre-push と二重になるが、hooksPath が未設定の環境でも止めるための層。
# range を HEAD 固定にしているのは、この層が「現在チェックアウト中のブランチを push する」
# Claude Code セッションの操作のみを想定した保険だから。任意 ref/tag の厳密な検査は
# git 側 .githooks/pre-push が stdin で渡される push 対象 ref ごとに行う（そちらが正）。

input=$(cat)
work_dir=""
if command -v jq > /dev/null 2>&1; then
  work_dir=$(echo "$input" | jq -r '.cwd // empty' 2>/dev/null)
fi
cd "${work_dir:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0
script="$(git rev-parse --show-toplevel 2>/dev/null)/tools/check-private-refs.sh"
[ -f "$script" ] || exit 0

if ! out=$(bash "$script" HEAD 2>&1); then
  echo "refs/private/ がコミット履歴に含まれています。push を中止しました。" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
