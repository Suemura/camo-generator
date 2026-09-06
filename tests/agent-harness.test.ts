import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const harness = resolve("tools/agent-harness/run.mjs");
const temporary: string[] = [];
function repo() {
  const dir = mkdtempSync(join(tmpdir(), "camo-hooks-"));
  temporary.push(dir);
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim();
  };
  git("init", "-b", "feature");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Fixture");
  git("commit", "--allow-empty", "-m", "fixture");
  mkdirSync(join(dir, "tools"));
  copyFileSync(resolve("tools/check-private-refs.sh"), join(dir, "tools/check-private-refs.sh"));
  return { dir, git };
}
function hook(action: string, event: object, cwd: string, env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [harness, action], {
    cwd,
    input: JSON.stringify(event),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("共通エージェントフック", () => {
  it.each(["claude", "codex"])(
    "%s の設定 command から実 shell 入口を起動し worktree の混入を止める",
    (product) => {
      const { dir, git } = repo();
      mkdirSync(join(dir, `.${product}`));
      cpSync(resolve(`.${product}/hooks`), join(dir, `.${product}/hooks`), { recursive: true });
      mkdirSync(join(dir, "tools/agent-harness"));
      copyFileSync(harness, join(dir, "tools/agent-harness/run.mjs"));
      const config = JSON.parse(
        readFileSync(
          resolve(product === "claude" ? ".claude/settings.json" : ".codex/hooks.json"),
          "utf8",
        ),
      ) as {
        hooks: Record<string, { hooks: { command: string }[] }[]>;
      };
      const shellHook = (command: string, event: object) =>
        spawnSync("bash", ["-c", command], {
          cwd: join(dir, "tools"),
          input: JSON.stringify(event),
          encoding: "utf8",
          env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
        });
      // 製品設定に登録された全 command を直接起動。未存在の入口や root 解決漏れを検出する。
      for (const [eventName, groups] of Object.entries(config.hooks)) {
        for (const group of groups)
          for (const entry of group.hooks) {
            const result = shellHook(entry.command, {
              cwd: dir,
              stop_hook_active: true,
              hook_event_name: eventName,
              tool_input: { command: "git status" },
            });
            expect(result.status, `${entry.command}\n${result.stderr}`).toBe(0);
          }
      }
      const worktree = join(dir, "worktree with spaces");
      git("worktree", "add", "-b", "work", worktree);
      mkdirSync(join(worktree, "tools"));
      copyFileSync(
        resolve("tools/check-private-refs.sh"),
        join(worktree, "tools/check-private-refs.sh"),
      );
      mkdirSync(join(worktree, "refs/private"), { recursive: true });
      writeFileSync(join(worktree, "refs/private/test.png"), "fixture");
      git("-C", worktree, "add", "refs/private/test.png");
      const guard = config.hooks.PreToolUse[0].hooks[0].command;
      // shell の cwd / CLAUDE_PROJECT_DIR が親 checkout でもイベント cwd を検査する。
      const result = shellHook(guard, {
        cwd: worktree,
        tool_input: { command: "git push origin work" },
      });
      expect(result.status, result.stderr).toBe(2);
      expect(result.stderr).toContain("refs/private");
      // Codex local exec_command の明示 workdir も親 checkout より優先する。
      const explicit = shellHook(guard, {
        cwd: dir,
        tool_input: { cmd: "git push origin work", workdir: worktree },
      });
      expect(explicit.status, explicit.stderr).toBe(2);
      expect(explicit.stderr).toContain("refs/private");
    },
  );

  it("Claude file_path と Codex patch を整形し生成コアは除外する", () => {
    const { dir } = repo();
    mkdirSync(join(dir, "src/core"), { recursive: true });
    mkdirSync(join(dir, "bin"));
    for (const path of ["src/example.ts", "src/second.ts", "src/core/camo.js"])
      writeFileSync(join(dir, path), "fixture");
    writeFileSync(join(dir, "bin/pnpm"), '#!/bin/sh\nprintf "%s\\n" "$*" >> calls.txt\nexit 0\n', {
      mode: 0o755,
    });
    const env = { PATH: `${join(dir, "bin")}:${process.env.PATH}` };
    expect(
      hook("format", { cwd: dir, tool_input: { file_path: join(dir, "src/example.ts") } }, dir, env)
        .status,
    ).toBe(0);
    expect(
      hook(
        "format",
        {
          cwd: dir,
          tool_input: {
            command:
              "*** Begin Patch\n*** Update File: src/second.ts\n*** Update File: src/core/camo.js\n*** End Patch",
          },
        },
        dir,
        env,
      ).status,
    ).toBe(0);
    const calls = readFileSync(join(dir, "calls.txt"), "utf8");
    expect(calls).toContain("example.ts");
    expect(calls).toContain("second.ts");
    expect(calls).not.toContain("camo.js");
  });

  it.each(["command", "cmd"])("両 Bash 入力 (%s) の参照画像混入を停止する", (key) => {
    const { dir, git } = repo();
    mkdirSync(join(dir, "refs/private"), { recursive: true });
    writeFileSync(join(dir, "refs/private/test.png"), "fixture");
    git("add", "refs/private/test.png");
    const result = hook(
      "pre-push-guard",
      { cwd: dir, tool_input: { [key]: "git push origin feature" } },
      dir,
    );
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("refs/private");
  });
  it("main の無関係操作は通し、暗黙 push は止める", () => {
    const { dir, git } = repo();
    git("branch", "-m", "main");
    // Claude Code はフック実行時に CLAUDE_PROJECT_DIR を渡す。fixture が実リポジトリへ漏れないよう cwd を明示する。
    expect(
      hook("pre-push-guard", { cwd: dir, tool_input: { command: "git status" } }, dir).status,
    ).toBe(0);
    expect(
      hook("pre-push-guard", { cwd: dir, tool_input: { command: "git push origin" } }, dir).status,
    ).toBe(2);
    const missing = hook("check-on-stop", { cwd: join(dir, "missing") }, dir);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("検査未実施");
  });
  it("Stop はイベント cwd の worktree を検査し、依存不足を成功扱いしない", () => {
    const { dir, git } = repo();
    const worktree = join(dir, "arbitrary-worktree");
    git("worktree", "add", "-b", "work", worktree);
    mkdirSync(join(worktree, "src"));
    writeFileSync(join(worktree, "src/change.ts"), "export {};");
    const event = { cwd: worktree };
    const result = hook("check-on-stop", event, dir, { CLAUDE_PROJECT_DIR: dir });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("検査未実施");
    const retry = hook("check-on-stop", { ...event, stop_hook_active: true }, dir);
    expect(retry.status).toBe(0);
    expect(retry.stdout).toContain("再検査していません");
  });
  it("検査コマンド失敗を差し戻し、3 検査を実行する", () => {
    const { dir } = repo();
    mkdirSync(join(dir, "src"));
    mkdirSync(join(dir, "node_modules"));
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "src/change.ts"), "export {};");
    writeFileSync(join(dir, "bin/pnpm"), '#!/bin/sh\necho "fixture $1"\nexit 1\n', { mode: 0o755 });
    const result = hook("check-on-stop", { cwd: dir }, dir, {
      PATH: `${join(dir, "bin")}:${process.env.PATH}`,
    });
    expect(result.status).toBe(2);
    for (const name of ["check", "typecheck", "test"])
      expect(result.stderr).toContain(`fixture ${name}`);
  });
  it("PR 成功時だけ共通スキルの通知を返す", () => {
    const { dir } = repo();
    const event = {
      cwd: dir,
      tool_input: { command: "gh pr create --body-file /tmp/body" },
      tool_response: { exit_code: 0, output: "https://github.com/example/repo/pull/12" },
    };
    const success = hook("pr-created", event, dir);
    expect(success.status).toBe(0);
    expect(JSON.parse(success.stdout).hookSpecificOutput.additionalContext).toContain(
      ".agents/skills/review-pr/SKILL.md",
    );
    expect(
      hook("pr-created", { ...event, tool_response: { ...event.tool_response, exit_code: 1 } }, dir)
        .stdout,
    ).toBe("");
    expect(
      hook("pr-created", { ...event, tool_input: { command: "gh pr view 12" } }, dir).stdout,
    ).toBe("");
  });
  it("任意ディレクトリのマージ済み worktree を通知する", () => {
    const { dir, git } = repo();
    const worktree = join(dir, "custom-location");
    git("worktree", "add", "-b", "merged-branch", worktree);
    mkdirSync(join(dir, "bin"));
    writeFileSync(join(dir, "bin/gh"), '#!/bin/sh\necho \'[{"headRefName":"merged-branch"}]\'\n', {
      mode: 0o755,
    });
    const result = hook("session-start-worktrees", { cwd: worktree }, dir, {
      PATH: `${join(dir, "bin")}:${process.env.PATH}`,
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).hookSpecificOutput.additionalContext).toContain(worktree);
  });
});
