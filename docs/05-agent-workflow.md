# Claude Code / Codex 共用ハーネス

このリポジトリは両製品で同じ規約・手順を使います。モデルは利用者の選択を継承します。GPT-6 Astra を使う場合も専用のプロンプト複製は不要です。

## 構成と編集先

| 正本 | 内容 | 製品側の入口 |
| --- | --- | --- |
| `AGENTS.md` | 重要な不変条件と必読資料 | Codex は自動読込、Claude は `CLAUDE.md` から import |
| `.agents/rules/` | ワークフロー・レビュー起動条件 | AGENTS の読込指示、Claude の rules ラッパー |
| `.agents/skills/` | デザインと5つの開発手順 | Codex のスキル、Claude の commands。デザインは相対 symlink |
| `.agents/roles/` | planner / reviewer / docs-sync / PR レビュー・対応の本文 | Claude の `.md` と Codex の `.toml` |
| `tools/agent-harness/run.mjs` | フックの共通処理 | 両製品の小さな shell 入口 |
| `.claude/settings.json` / `.codex/hooks.json` | 製品ごとの権限・イベント登録 | 各製品の設定読込 |
| `.codex/config.toml` | Codex のプロジェクトローカルな承認・サンドボックス設定 | Codex の設定読込 |

共通の内容を両製品側へコピーして編集しないでください。`.agents/rules/` と `.agents/roles/` は本プロジェクトの参照資料であり、このディレクトリ名だけで自動注入される仕組みではありません。各入口で読むように指示しています。

`docs/architecture.md` は詳しいモジュール構成、`docs/04-add-preset.md` は生成品質検証の正本です。AGENTS には毎回必要な規約と参照だけを置きます。個人の口調、グローバルスキル、モデル設定、絶対パスはリポジトリへ持ち込まずホーム側で管理します。例外として、このリポジトリの `.codex/config.toml` は `approval_policy = "never"` と `sandbox_mode = "danger-full-access"` を設定しています。信頼できるコードと依頼だけを扱い、Codex がホスト全体を変更できることを理解した上で使用してください。

## 始め方

1. Node.js 22 以上と pnpm を用意し、リポジトリで `pnpm install --frozen-lockfile` を実行します。worktree ごとにも必要です。
2. Claude Code または Codex でリポジトリを開きます。設定変更後は新しいセッションで確認します。
3. 「このプロジェクトの規約と利用できる作業スキルを説明して」と依頼し、AGENTS、共通 rules、スキルを読めることを確認します。
4. Codex のプロジェクトローカルフックは信頼された設定層でのみ動きます。アプリのフック承認・プロジェクト信頼設定を確認してください。権限設定は製品ごとに独立しており、Claude の allow/ask が Codex に移るわけではありません。
5. 通常の依頼例は「Issue #N に着手して」「PR #N をレビューして」。Claude の `/start-issue N` なども残しています。Codex では `$start-issue` 等、または自然文で指定できます。

スキルは名前と説明から選択され、本文は必要時に読まれます。Codex の役割定義は `.codex/agents/*.toml`。Claude 側のモデル・ツール・maxTurns は `.claude/agents/*.md` に残し、Codex は親のモデル設定を継承します。存在しないツールや固定ターン数を共通本文で仮定しません。

## フックと検証

- `PreToolUse`: push 前の補助検査。私有参照画像の本来の検査は `.githooks/pre-push` と `tools/check-private-refs.sh` で行い、CI / Deploy でも確認します。
- `PostToolUse`: 対応する編集の Biome 整形と、PR 作成成功時のレビュー開始案内。
- `SessionStart`: Git に登録された worktree とマージ済み PR を照合し、残っている作業木を案内。削除はしません。
- `Stop`: 対象ソースの未コミット変更があれば check / typecheck / test。失敗や依存不足を成功扱いせず報告します。フックからの再入ではループを避け、手動での完了確認を促します。

フックは共通手順を補助します。コミット済み差分だけの変更や Markdown / 設定のみの変更を Stop が検出しなくても、完了前の必須検証は省略できません。PR フックは通知だけで、親がレビュー担当を一度起動します。同じ PR / HEAD の通知で重複投稿しないでください。

イベント入力の `cwd`（実行ツールに `workdir` がある場合はそれ）から作業木を特定します。Claude の `command` と Codex の正規化された `command` / `cmd` を受け付けます。push の補助ガードはシェルの全構文・任意 ref を解析するセキュリティ境界ではありません。実際の push 対象 ref は Git pre-push が検査します。

```bash
pnpm exec vitest run tests/agent-harness.test.ts
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

フックの fixture テストと実際の製品によるイベント発火は別の検証です。新規セッションで入口・役割・フックを認識するか確認し、未確認の製品やイベントは未確認として報告します。

## worktree と公開

worktree は `git worktree list --porcelain` が正本。Claude / Codex の作成場所や名前を前提にせず、対象ブランチから探します。既存の dirty / locked 作業木やローカル追加コミットを保護します。PR 作成後は保持し、明示依頼後だけ後片付けします。

共通の Camo Lab は `node prototype/build.mjs` で出力するローカル HTML です。参照画像付きの `prototype/index.local.html` は公開しません。Claude Artifact の既存 URL は `docs/04-add-preset.md` §5 に保持し、利用可能かつ依頼・既存運用の範囲で追加公開します。更新できない場合に別製品の URL へ置換したり、公開済みと報告したりしません。

main マージはユーザーの対象 PR を特定した明示依頼と実行直前の承認が必要です。`land` はマージコミットに対応する Deploy run の完了まで確認します。PR 作成依頼からマージを推測しません。

## 公式仕様

2026-09-06 確認。ローカル Codex CLI は 0.153.4。設定形式は更新されるため、変更時は公式と利用中のバージョンを確認してください。

- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [スキル](https://learn.chatgpt.com/docs/build-skills)
- [独自エージェント](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [フック](https://learn.chatgpt.com/docs/hooks)
- [GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra)
