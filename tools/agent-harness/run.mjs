// 両製品のフック入口。Claude Bash と Codex の正規化された Bash は command、
// local exec_command は cmd を送る。イベント cwd を優先し worktree に追従する。
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const action = process.argv[2];
let event;
try {
  event = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  console.error("フック入力 JSON を読めません。検査未実施。");
  process.exit(2);
}
const input = event.tool_input || {};
const block = (message) => {
  console.error(message);
  process.exit(2);
};
let cwd;
try {
  const base = event.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  // Codex local exec_command の workdir は相対パスの可能性があるためイベント cwd 基準で解決する。
  cwd = realpathSync(input.workdir ? resolve(base, input.workdir) : base);
} catch {
  block("作業ディレクトリを特定できません。検査未実施。");
}
const run = (command, args, options = {}) =>
  spawnSync(command, args, { cwd, encoding: "utf8", timeout: 240000, ...options });
const git = (...args) => run("git", args);
const rootResult = git("rev-parse", "--show-toplevel");
const root = rootResult.stdout?.trim();
const command = input.command || input.cmd || "";
const context = (hookEventName, additionalContext) =>
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext } }));

if (action === "check-on-stop" && event.stop_hook_active === true) {
  console.log(
    JSON.stringify({
      systemMessage:
        "Stop フック再入のため再検査していません。前回の失敗を修正し、必須チェックを手動完了してください。",
    }),
  );
  process.exit(0);
}
if (!root) {
  if (action === "check-on-stop" || action === "pre-push-guard")
    block("Git 作業ツリーを特定できません。検査未実施。");
  process.exit(0);
}

if (action === "pre-push-guard") {
  // 補助ガード。シェル全構文の解析や任意 ref の検査は Git pre-push が担当する。
  if (!/\bgit\s+(?:-[^;&|]*?\s+)?push\b/.test(command)) process.exit(0);
  if (
    !/\bmain\b|--delete|(?:^|\s)-d(?:\s|$)/.test(command) &&
    git("branch", "--show-current").stdout.trim() === "main"
  ) {
    block(
      "main への暗黙 push を中止。ブランチ + PR を使用してください。明示指示がある場合は main を明示し、共通手順の承認条件を満たしてください。",
    );
  }
  const script = resolve(root, "tools/check-private-refs.sh");
  if (!existsSync(script)) block("refs/private 検査スクリプトがありません。push 検査未実施。");
  const result = run("bash", [script, "HEAD"]);
  if (result.status !== 0)
    block(`refs/private 検査失敗。push を中止。\n${result.stderr}${result.stdout}`);
} else if (action === "check-on-stop") {
  const status = git("status", "--porcelain", "-z", "-uall");
  if (status.status !== 0) block("Git 変更一覧を取得できません。検査未実施。");
  if (
    !status.stdout
      .split("\0")
      .some((line) => /^(src|tests|tools)\/.*\.(ts|tsx|js|mjs|scss|sh)$/.test(line.slice(3)))
  ) {
    console.log("{}");
    process.exit(0);
  }
  if (!existsSync(resolve(root, "node_modules")))
    block(
      "node_modules がないため検査未実施。pnpm install --frozen-lockfile 後、check/typecheck/test を実行してください。",
    );
  // フック側の上限 300 秒に収める。test は git / node を多数 spawn するため予算を厚くする。
  const budgets = { check: 40000, typecheck: 40000, test: 200000 };
  const errors = [];
  for (const check of ["check", "typecheck", "test"]) {
    const result = run("pnpm", [check], { cwd: root, timeout: budgets[check] });
    if (result.error?.code === "ETIMEDOUT")
      errors.push(
        `pnpm ${check} が ${budgets[check] / 1000} 秒で完了せず検査未完了。手動で実行して確認してください。`,
      );
    else if (result.status !== 0)
      errors.push(`pnpm ${check} 失敗:\n${result.stderr}${result.stdout}${result.error || ""}`);
  }
  if (errors.length) block(errors.join("\n\n"));
  console.log("{}");
} else if (action === "pr-created") {
  if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
  const response = event.tool_response;
  if (response?.exit_code !== undefined && response.exit_code !== 0) process.exit(0);
  if (response?.exitCode !== undefined && response.exitCode !== 0) process.exit(0);
  const url = JSON.stringify(response || "").match(
    /https:\/\/github\.com\/[^\s"\\]+\/pull\/\d+/,
  )?.[0];
  if (url)
    context(
      "PostToolUse",
      `PR ${url} 作成を検知。.agents/skills/review-pr/SKILL.md を読み、共通レビュー手順を進めてください。この通知自体はレビューを起動しません。同じ PR のレビューが実行中・完了済みなら二重起動しないでください。`,
    );
} else if (action === "session-start-worktrees") {
  const worktrees = git("worktree", "list", "--porcelain")
    .stdout.split("\n\n")
    .slice(1)
    .filter(Boolean);
  if (!worktrees.length) process.exit(0);
  const merged = run(
    "gh",
    ["pr", "list", "--state", "merged", "--limit", "100", "--json", "headRefName"],
    { timeout: 10000 },
  );
  if (merged.status !== 0) process.exit(0);
  let branches;
  try {
    branches = new Set(JSON.parse(merged.stdout).map((pr) => pr.headRefName));
  } catch {
    process.exit(0);
  }
  const stale = worktrees.filter((record) =>
    branches.has(record.match(/^branch refs\/heads\/(.+)$/m)?.[1]),
  );
  if (stale.length)
    context(
      "SessionStart",
      `マージ済み PR の worktree が残っています:\n${stale.map((record) => record.match(/^worktree (.+)$/m)?.[1]).join("\n")}\n後片付けは .agents/skills/land/SKILL.md を参照。自動削除せず、現在の依頼を優先してください。`,
    );
} else if (action === "format") {
  const files = input.file_path
    ? [input.file_path]
    : [...command.matchAll(/^\*\*\* (?:Add|Update) File: (.+)$/gm)].map((match) => match[1]);
  const failed = [];
  for (const file of files) {
    const target = resolve(cwd, file);
    if (!existsSync(target)) continue;
    const absolute = realpathSync(target);
    const path = relative(root, absolute);
    if (
      path.startsWith("..") ||
      isAbsolute(path) ||
      /^(prototype|src\/core)\//.test(path) ||
      !/\.(ts|tsx|js|mjs|json)$/.test(path) ||
      !existsSync(absolute)
    )
      continue;
    const result = run("pnpm", ["exec", "biome", "check", "--write", absolute], {
      cwd: root,
      timeout: 20000,
    });
    if (result.status !== 0) failed.push(path);
  }
  if (failed.length)
    context(
      "PostToolUse",
      `Biome の自動整形が完了しませんでした。pnpm check で確認してください: ${failed.join(", ")}`,
    );
} else {
  block(`不明なフック: ${action}`);
}
