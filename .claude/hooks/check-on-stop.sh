#!/bin/bash
# Stop フック: src/ tests/ tools/ 配下のソース (ts/tsx/js/mjs/scss) に未コミットの変更がある場合のみ
# check (Biome) + typecheck (tsc) + test (Vitest) を実行し、失敗したら exit 2 で Claude に差し戻す。
# （exit 2 の stderr は Claude へのフィードバックとして送られ、自動修正を促す）
#
# 注: 決定性テスト (tests/determinism.test.ts) のスナップショット不一致は「生成結果が変わった」証拠。
# 意図した変更なら docs/tech-verification/ に新規エントリを追加してから `pnpm test -u` する（先に更新しない）。

input=$(cat)

# stop_hook_active が true（すでに Stop フックからの継続中）の場合は
# 無限ループ防止のためチェックをスキップして停止を許可する
# （jq がない環境では文字列マッチにフォールバックし、無限ループ防止を維持する）
if command -v jq > /dev/null 2>&1; then
  if echo "$input" | jq -e '.stop_hook_active == true' > /dev/null 2>&1; then
    exit 0
  fi
elif [[ "$input" == *'"stop_hook_active":true'* ]]; then
  exit 0
fi

# 作業ディレクトリを決定する。EnterWorktree でセッションが worktree に入っている場合、
# 変更は worktree 側にのみ現れ、メイン checkout（CLAUDE_PROJECT_DIR）の git status には出ない。
# そのためフック stdin の cwd（セッションの現在ディレクトリ＝worktree に追従）を優先する。
work_dir=""
if command -v jq > /dev/null 2>&1; then
  work_dir=$(echo "$input" | jq -r '.cwd // empty' 2>/dev/null)
fi
cd "${work_dir:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0

# 対象ソースの変更がなければスキップ（prototype/ はビルド成果物を含むため対象外）
# porcelain は "XY path" 形式。-uall で未追跡ディレクトリ内も個別列挙、quotePath 無効化で非 ASCII 名の引用を防ぐ
if ! git -c core.quotePath=false status --porcelain -uall 2>/dev/null \
  | grep -qE '^.{3}(src|tests|tools)/.*\.(ts|tsx|js|mjs|scss)$'; then
  exit 0
fi

# worktree で node_modules がない場合はチェック不能。差し戻さずに注意だけ出して停止を許可する
if [ ! -d node_modules ]; then
  echo "node_modules がないため check/typecheck/test をスキップしました。pnpm install --frozen-lockfile を実行してください。" >&2
  exit 0
fi

errors=""

if ! check_output=$(pnpm check 2>&1); then
  errors="${errors}【Biome check エラー】以下を修正してください（pnpm check --write で自動整形可）:
${check_output}

"
fi

if ! type_output=$(pnpm typecheck 2>&1); then
  errors="${errors}【typecheck エラー】以下を修正してください:
${type_output}

"
fi

if ! test_output=$(pnpm test 2>&1); then
  errors="${errors}【テスト失敗】以下を修正してください。
determinism スナップショットの不一致は生成結果が変わった証拠です。意図した変更なら
docs/tech-verification/ に新規エントリを追加 (索引 docs/01-tech-verification.md に 1 行足す)した上で pnpm test -u してください（意図しない変更なら原因を直す）:
${test_output}

"
fi

if [ -n "$errors" ]; then
  printf "%s" "$errors" >&2
  exit 2
fi

exit 0
