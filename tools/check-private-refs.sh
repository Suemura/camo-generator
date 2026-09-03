#!/bin/bash
# refs/private/ (再配布できないリファレンス画像) がリポジトリに入っていないことを検査する。
# 4 層の push 防止 (.gitignore / .githooks/pre-push / Claude Code PreToolUse / CI) の判定本体。
#
# usage: tools/check-private-refs.sh [<rev-range>]
#   引数なし:  現在のインデックス (git ls-files) に refs/private/ 配下が無いことだけ確認
#   rev-range: 加えて、その範囲のコミットで refs/private/ に触れた履歴が無いことを確認
#              (例: origin/main..HEAD / <remote sha>..<local sha> / HEAD)
# 混入があれば該当パスを表示して exit 1。
set -u
cd "$(git rev-parse --show-toplevel)" || exit 1

fail=0
tracked=$(git ls-files --cached -- refs/private)
if [ -n "$tracked" ]; then
  echo "ERROR: refs/private/ 配下がインデックスに含まれています (再配布不可の画像。git rm --cached で外してください):" >&2
  echo "$tracked" | sed 's/^/  /' >&2
  fail=1
fi

if [ $# -ge 1 ]; then
  range=$1
  touched=$(git log --format= --name-only "$range" -- refs/private 2>/dev/null | sort -u | sed '/^$/d')
  if [ -n "$touched" ]; then
    echo "ERROR: コミット範囲 $range に refs/private/ を触る履歴があります (追加後に削除しても履歴に残ります。rebase で除去してください):" >&2
    echo "$touched" | sed 's/^/  /' >&2
    fail=1
  fi
fi

exit $fail
