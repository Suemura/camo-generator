# Claude Code 用の入口

@AGENTS.md

共通規約・手順は `AGENTS.md` と `.agents/` が正本。参照先はリポジトリルート基準。

- `.claude/commands/` は既存スラッシュコマンドの入口。引数を共通スキルへ渡す。
- `.claude/agents/` は Claude 用のモデル・ツール・ターン上限と共通役割の読込指示。
- `.claude/settings.json` は Claude 用の権限・フック登録。個人設定は `settings.local.json`。
- 承認質問には利用可能なら `AskUserQuestion`、作業ディレクトリの切替には利用可能なら `EnterWorktree` を使う。共通手順の Git 実体確認は省略しない。
- ブランチは既存の `feat/` / `fix/` / `docs/` / `chore/` 等の命名を使える。

個人の口調やグローバルスキルの設定はホーム配下で管理し、リポジトリに個人絶対パスを記載しない。
