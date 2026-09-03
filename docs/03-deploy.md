# デプロイ運用ガイド

`main` にマージされた変更は GitHub Actions が自動で本番（`https://camo-generator.suemura.app`）へデプロイする。本書はその仕組み・初期設定・日常運用・障害時の対処をまとめる。方針の決定経緯は `docs/02-spec.md` §5。

## 1. 全体の流れ

```
PR 作成 ──► CI (ci.yml): check → test → build          ← 失敗すればマージ前に気づける
   │
   ▼ マージ
main push ─► Deploy (deploy.yml): check → test → build → wrangler deploy
                                                            │
                                                            ▼
                                   Cloudflare Workers (Static Assets) camo-generator
                                   custom domain: camo-generator.suemura.app
```

- **CI**（`.github/workflows/ci.yml`）: `pull_request`（main 向け）で `pnpm check` → `pnpm test` → `pnpm build`。デプロイはしない
- **Deploy**（`.github/workflows/deploy.yml`）: `push` to `main` と `workflow_dispatch`。マージコミットは PR 時点と内容が異なりうるため、CI と同じ検証を再実行してから `cloudflare/wrangler-action` で `wrangler deploy` する
- Deploy は `concurrency: deploy-production` で直列化し、途中キャンセルはしない（`cancel-in-progress: false`）。連続マージ時は順番に実行される
- GitHub Environment `production` に URL を紐付けているので、Actions の実行画面からサイトへ直接飛べる
- ビルドに秘密情報は不要。Secrets はデプロイ用の Cloudflare 認証のみ

## 2. 初期設定（済。再構築時の手順）

### 2.1 Cloudflare API トークン

Cloudflare ダッシュボード → Manage Account → **Account API Tokens** → Create Token（カスタム）。権限は次の最小構成にする。

| スコープ | 権限（ダッシュボード表記） | 用途 |
|---------|--------------------------|------|
| Account（対象アカウントのみ） | **Workers Scripts / Write** | スクリプトと Static Assets のアップロード |
| Account（対象アカウントのみ） | **Account Settings / Read** | wrangler のアカウント解決 |
| Zone（`suemura.app` のみ） | **Workers ルート（Workers Routes）/ Write** | `wrangler.jsonc` の `routes`（custom domain）反映 |
| Zone（`suemura.app` のみ） | **DNS / Write** | custom domain の DNS レコード管理 |

- Zone 権限は「すべてのゾーン」でも動くが、`suemura.app` に限定する
- Account API Token（アカウント所有）なので User スコープの権限は付けられない。`wrangler deploy` 実行時に「Unable to get membership roles」と警告が出るが、デプロイには影響しない
- テンプレート「Edit Cloudflare Workers」でも動作するが、KV / R2 / D1 など不要な権限が付くため使わない
- 権限不足のときの症状は §4 を参照

### 2.2 GitHub Secrets

| 名前 | 値 |
|------|----|
| `CLOUDFLARE_API_TOKEN` | 上記トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID（`npx wrangler whoami` で確認できる） |

```sh
gh secret set CLOUDFLARE_API_TOKEN          # 対話入力
gh secret set CLOUDFLARE_ACCOUNT_ID --body <account id>
```

トークンの権限を後から追加した場合、トークン値は変わらないので Secrets の再登録は不要。トークンをローテーション（Roll）した場合だけ `CLOUDFLARE_API_TOKEN` を更新する。

### 2.3 ブランチ保護（任意）

main の Branch protection で `ci` ジョブを required にすると、CI が落ちた PR をマージできなくなる。現状は未設定。

## 3. 日常運用

- **通常のリリース**: PR をマージするだけ。Actions の「Deploy」が成功すれば本番反映済み
- **手動で再デプロイ**（Secrets 変更後の確認、Cloudflare 側の障害復旧後など）:
  ```sh
  gh workflow run deploy.yml --ref main
  gh run watch $(gh run list --workflow Deploy --limit 1 --json databaseId --jq '.[0].databaseId')
  ```
- **ローカルから緊急デプロイ**: `pnpm deploy`（`wrangler login` 済み前提、ask 権限）。Actions が使えないときの退避手段であり、通常は使わない
- **反映確認**:
  ```sh
  npx wrangler deployments list        # 最新 Version ID が Actions ログの "Current Version ID" と一致するか
  curl -sI https://camo-generator.suemura.app | head -1
  ```
- **ロールバック**: `npx wrangler rollback`（直前の Version に戻す）または `npx wrangler versions list` で Version ID を選んで `npx wrangler rollback <version id>`。Static Assets も Version に含まれるので、コードと静的ファイルはまとめて戻る。恒久対応は revert PR を main にマージする

## 4. トラブルシューティング

### `Authentication error [code: 10000]`

wrangler が叩いた API パスで、どの権限が足りないか判別できる。

| 失敗した API パス | 足りない権限 |
|------------------|-------------|
| `/accounts/<id>/workers/services/camo-generator` | Account: Workers Scripts / Write |
| `/accounts/<id>` | Account: Account Settings / Read |
| `/zones/<zone id>/workers/routes` | Zone: Workers ルート / Write |
| `/zones/<zone id>/dns_records` | Zone: DNS / Write |

トークン単体で権限を確かめるには、ローカルで環境変数を渡して実行する:

```sh
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler whoami
curl -s https://api.cloudflare.com/client/v4/accounts/<id>/workers/services/camo-generator \
  -H "Authorization: Bearer <token>" | head -c 300
```

初回導入時は Account 権限の欠落（1 回目）と Zone: Workers ルートの欠落（2 回目）で失敗し、追加して 3 回目で成功した。ダッシュボードの日本語 UI では Workers Routes が「Workers ルート」と表示される。

### `Test timed out in 5000ms`

GitHub Actions のランナーはローカルの 2〜3 倍遅く、ノイズ系プリセット（woodland / aor1 / aor2）の継ぎ目テストが 5〜7 秒かかる。`vite.config.ts` の `testTimeout` を 60 秒にして対処済み。さらに重いテストを追加する場合は個別に `{ timeout }` を指定する（`tests/progress.test.ts` の `SLOW` を参照）。

### `Node.js 20 is deprecated` の警告

GitHub 側の runtime 非推奨。使用している action（`actions/checkout` / `actions/setup-node` / `pnpm/action-setup` / `cloudflare/wrangler-action`）のメジャーバージョンを上げる。

### Deploy が動かない

- `workflow_dispatch` は `deploy.yml` が **default ブランチ（main）に存在するときだけ** 実行できる。ブランチ上で編集中のワークフローは PR マージ後に試す
- `pnpm install --frozen-lockfile` が失敗する場合は `pnpm-lock.yaml` が `package.json` と不整合。ローカルで `pnpm install` してロックファイルをコミットする

## 5. 変更履歴

- 2026-09-03: 導入（PR #17）。手動 `pnpm deploy` 運用から移行。Workers Builds（Cloudflare 側 Git 連携）案はテスト失敗時のゲートを CI と一本化するため不採用
