# フェーズ2: 仕様設計（初期リリース）

フェーズ1 のプロトタイプ（`prototype/index.html`）を、Cloudflare にホストする本番 Web アプリへ移行するための仕様。
機能の仕分け（初期 / 今後 / 対象外）の結論を先頭に置き、以降は初期リリースに絞って画面・データ・技術・デプロイ・デザインシステムを定める。

---

## 1. 機能の仕分け

### 1.1 初期リリース（本ドキュメントの対象）

| # | 機能 | 要点 |
|---|------|------|
| A1 | URL パーマリンク | 全生成状態を URL クエリに符号化。共有・再現・ブックマークの基盤 |
| A2 | Web Share | `navigator.share` で PNG と URL を共有（スマホ向け）。非対応環境は「リンクをコピー」 |
| A3 | 出力強化 | 縦横自由サイズ、WebP 追加。SVG はセルグリッド系のみ継続 |
| A4 | 実寸モード | DPI × 物理サイズ（mm / inch）から px を算出。PNG に pHYs チャンクを埋め込む |
| A5 | カラーパレットライブラリ | FS595 / RAL 等の規格名ベース。色味・用途・国の 3 軸タグ |
| A6 | シームレスタイリング | 生地印刷・3D テクスチャの前提。全手法でタイル境界を連続させる |
| A7 | 画像からパレット抽出 | 画像ドロップ → k-means → スロットへ流し込み |
| A8 | ライト / ダークテーマ | デザイントークンを CSS カスタムプロパティ化して切替 |

### 1.2 今後の開発予定（GitHub Issues に登録済み）

#1 3D プレビュー（段階①実装済）/ #2 有機系 SVG / #3 Web Worker 化 / #4 PBR マップ / #5 布地ポストエフェクト / #6 カスタム迷彩 / #7 MARPAT クイルト化 / #8 パレットファイル出力 / #9 英語 UI / #10 履歴・お気に入り / #11 PWA / #12 実寸スケール校正 / #21 迷彩プリセットの拡充（親。サブ Issue #22〜#64。#22 共通基盤は実装済: 実物比較 UI 廃止・`refs/` 運用・プリセット選択のグループ化。#23 DCU / #24 DBDU / #25 CCE / #27 Auscam / #28 陸自 Type 2 / #31 タイガーストライプ / #32 ブラッシュストローク・リザード / #64 ベリョースカ / #53 NWU Type I / #36 スプリンター は実装済）

### 1.3 対象外

- ユーザーアカウント・クラウド保存（静的ホスティング方針と衝突。パーマリンクで代替）
- サーバーサイド生成・公開 API
- CMYK / TIFF 出力（ブラウザで色管理不能。RGB PNG + DPI で足りる）
- 実物迷彩の「完全複製」を謳う表示。MARPAT 等は商標のため、UI・文書では「〜風」「inspired by」表記で統一する（表記ルールとして仕様に含める）

---

## 2. 画面構成

### 2.1 方針: 1 画面構成

生成 → 調整 → 書き出し、が単一のワークフローであり、状態（パターン・シード・パレット…）を画面間で持ち回る必要がない。
**メイン 1 画面 + 補助 UI（ドロワー / モーダル）** とし、ルーティングは持たない。「クレジット・ライセンス」だけ独立ページ（`/about`）を用意する（同梱する派生データ・3D アセットのクレジット表示のため）。

### 2.2 レイアウト

**デスクトップ（≥ 1024px）**

```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー: ロゴ / テーマ切替 / 共有 / About                      │
├──────────────┬──────────────────────────────────────────────┤
│ コントロール  │  プレビュー                                    │
│ パネル       │  ┌────────────────────────────────────────┐   │
│ (固定幅      │  │                                        │   │
│  360px,      │  │        生成キャンバス                    │   │
│  縦スクロール)│  │                                        │   │
│              │  └────────────────────────────────────────┘   │
│              │  表示モード: [単一] [タイル 2×2] [3D]          │
│              │  ステータス: 出力 px / 実寸 / 生成時間           │
└──────────────┴──────────────────────────────────────────────┘
```

**モバイル（< 1024px）**

- プレビューを上部に固定（幅 100%、正方形〜出力比率）
- コントロールは下部シート。セクションをタブ化（パターン / 色 / 出力）
- 共有ボタンをシート上部の目立つ位置に置く（A2 の主用途がスマホ）

### 2.3 コントロールパネルのセクション

上から下へ「何を → どう見せる → どう出す」の順。

1. **パターン**
   - プリセット選択（ドロワー型ピッカー。4 軸タブで絞り込み: 「すべて」「用途別」「国別」「系統別」「年代別」。タグチップ + 検索で複合絞り込み。各プリセットに 256px サムネイル JPG を表示。選択中プリセットはカード 1 枚で表示、ドロワー開閉から選び直し可。名称は「〜風」表記）
   - シード（数値入力 + ランダム + 前後ステップ）
   - 模様スケール（スライダー 0.4〜2.5）
   - 「シームレス」トグル（A6。既定 ON。OFF で継ぎ目検証）
2. **パレット**
   - 色スロット（プリセットの色数分。クリックでカラーピッカー）
   - スロットごとに「ライブラリから選ぶ」ボタン → パレットライブラリドロワー（A5）
   - 「画像から抽出」ボタン / ドロップゾーン（A7）
   - 「既定色に戻す」
3. **出力**
   - サイズ指定モード切替: **ピクセル** / **実寸**（A4）
     - ピクセル: 幅 × 高さ（px、比率ロックトグル、プリセット 512/1024/2048/4096）
     - 実寸: 幅 × 高さ（mm または inch）+ DPI（72/150/300/自由入力）+ 用紙プリセット（A4 / A3 / Letter / 生地幅 1100・1500mm）。算出 px を常時表示
   - 形式: PNG / JPG / WebP / SVG（SVG は非対応プリセットではボタン無効 + 理由をツールチップ）
   - 上限: 長辺 8192px。超過は警告して抑制
4. **共有**（ヘッダーにも同じ操作を置く）
   - 「リンクをコピー」（A1）
   - 「共有」（A2。`navigator.share` 対応時のみ表示）

### 2.4 `/about` ページ（独立ページ）

生成画面から切り離す理由: 法的表示のためにコントロールパネルを圧迫したくない。内容は次の 4 点。

1. **3D プレビューのアセットのクレジット**: HDRI / 布地マップ（CC0）の出典。実物リファレンス画像はアプリに同梱しない（#22 で実物比較モードを廃止。開発時専用の `refs/` に置き、出典は README「クレジット・ライセンス注記」に記載）ため、アプリ側の表示義務は発生しない
2. **アルゴリズムの出典**: camogen（MIT）参照の明記、M81 ソースマップが米政府図案（パブリックドメイン）であること
3. **商標に関する注記**: MARPAT / MultiCam 等は各権利者の商標であり、本アプリは「〜風」の生成であって公式図案の複製ではない
4. **プライバシー**: 画像からのパレット抽出を含め、すべてブラウザ内で処理しサーバーへ送信しない

### 2.5 補助 UI

- **パレットライブラリ ドロワー**（右から）: 検索 + タグフィルタ（色味 / 用途 / 国）+ 色チップ一覧。チップクリックで対象スロットへ適用
- **画像からパレット抽出 モーダル**: 画像プレビュー、抽出色 k 個（k = スロット数）、スロットへの対応をドラッグで並べ替え、適用
- ~~実物比較モード~~: #22 で廃止。実物との比較は開発時に `node tools/render.mjs --compare`（`refs/` の画像と左右並べた PNG）で行う。権利上再配布できない参照画像も `refs/private/`（gitignore、push 防止 4 層）に置けば同じループで使える
- **タイル 2×2 モード**: 同じ出力を 2×2 に並べて表示。A6 の境界検証をユーザーにも開放する
- **3D モード**: three.js を選択時のみ動的 import。シームレスプレビュー（768px）を CanvasTexture にして 3 種プリミティブ（球 Ø300mm / 波打ち布 600×600mm / 箱型ポーチ 200×150×80mm、mm 単位シーン）に貼る。HDRI 環境光（Poly Haven CC0）と布地 normal/roughness マップ（ambientCG CC0、512px）を `public/3d/` に同梱。実寸モード使用時は、模様の物理サイズからリピート数を算出して表示。px モードでは長辺 300mm を仮定。パレット変更は再生成せず CanvasTexture を再アップロード。WebGL 非対応時はフォールバック文言を表示

### 2.6 状態と URL（A1）

URL クエリが正本。状態変更は `history.replaceState` で即時反映（履歴は汚さない）。

| キー | 意味 | 例 |
|------|------|-----|
| `p` | プリセット ID | `m81` |
| `s` | シード（整数） | `1234` |
| `k` | 模様スケール | `1.2` |
| `c` | パレット（`#` 抜き hex をカンマ区切り。既定色なら省略） | `4a5a3b,6b5a3a,...` |
| `w`,`h` | 出力サイズ px | `2048`,`1024` |
| `u` | 単位。`px`（既定） / `mm` / `in` | `mm` |
| `d` | DPI（`u` が px 以外のとき） | `300` |
| `t` | シームレス。`0` で OFF（既定 ON なら省略） | `0` |

- 不正値は既定値にフォールバックし、URL を正規化して書き戻す
- プリセット ID は将来も不変とする（過去に共有された URL を壊さない）。パレット ID 同様
- 表示モード（タイル / 3D）・3D モデル選択・テーマは URL に含めない。表示モード・3D モデルの `localStorage` 保持は未実装（別 Issue）

---

## 3. 機能仕様（初期リリース）

### 3.1 シームレスタイリング（A6）— **実装・検証済（v15、`docs/01-tech-verification.md`）**

生成コアの変更で、フェーズ1 と同じ「レンダ → 目視」検証ループを実施した。

- クイルト方式（M81 / AOR1 / AOR2 / CCE）: パッチ配置と領域成長シームをトーラス座標で行う（`x mod w`, `y mod h`）。多数決ミップマップ・フラグメント除去も周期境界で
- クラスタ成長（MARPAT / UCP）: 隣接参照をラップ。境界ディザ・スペックルの座標ハッシュは周期化した座標で引く
- 受け入れ基準: タイル 2×2 表示で境界が視認できない。`docs/01-tech-verification.md` の既知アーティファクトが再発しない
- `generate()` にオプション `{ tileable: boolean }` を追加。既定 `true`。形状 / 色分離は維持
- 出力の最小サイズは 512px とする（小キャンバスではクイルトのブロブ境界切断が継ぎ目に乗ることがある。v15 参照。v18 でブロブ境界の円弧切断そのものは解消）

### 3.2 実寸モードと pHYs（A4）

- px = round(mm / 25.4 × dpi)。inch は × dpi
- PNG 出力時、`canvas.toBlob` の結果に `pHYs` チャンク（pixels per metre = dpi / 0.0254、unit=1）を挿入する。IHDR 直後に挿入、CRC32 を計算。自前実装（〜60 行）。JPG / WebP は DPI メタデータを付けない（仕様上の制約として明記）
- UI には「Photoshop 等で開くと 300dpi の実寸として扱われます」の補足

### 3.3 パレットライブラリ（A5）

データは静的 JSON（`src/data/palette-library.json`）。1 エントリ:

```json
{
  "id": "fs34079",
  "name": "Dark Green",
  "std": "FS 595",
  "code": "34079",
  "hex": "#3a4a2f",
  "tags": { "hue": "green", "use": ["aircraft", "camo-m81"], "country": ["us"] },
  "note": "M81 ウッドランドの緑に相当"
}
```

- 名称・コードは公的規格（FS 595 / RAL / BS 381C / ソ連規格名 4BO 等）のみ。模型塗料の品番（TS-xx / C-xx）は `note` の参考情報に留め、商標名を主キーにしない
- 初期収録は 30〜50 色。カテゴリ軸: 色味（green / brown / tan / grey / black / other）、用途（camo-*, tank, aircraft, ship）、国（us / ru / uk / de / jp / other）
- hex は規格の公称値または信頼できる換算値を採用し、`source` フィールドで出典を残す
- 収録数は 100 色以上（公的規格色 + 各プリセットの実測色）。正確な内訳と出典は `docs/design/palette-library-sources.md`
- 迷彩プリセットを追加したら、その既定色もライブラリに登録する（公的規格の色番号が無い色は「〜 (実測)」エントリ、ある色は既存エントリに `camo-<key>` タグ）。手順は `docs/04-add-preset.md` §3

### 3.4 画像からパレット抽出（A7）

- 入力: ドロップまたはファイル選択（JPEG / PNG / WebP、長辺 512px に縮小してから処理）
- k-means（k = 現プリセットのスロット数、固定シードで決定的に）。Web Worker で実行し UI をブロックしない
- 結果は明度順に並べ、既定パレットの明度順に対応づけて初期割り当て。ユーザーがドラッグで入れ替え可能
- 画像はブラウザ外に送信しない（プライバシー表記）

### 3.5 共有（A1 / A2）

- リンクコピー: `navigator.clipboard.writeText(location.href)`。トースト表示
- Web Share: `navigator.canShare({ files })` が真なら PNG（現在の出力設定、ただし長辺 2048px 上限）と URL を `share()`。偽なら URL のみ、それも不可ならボタン非表示
- OGP: 動的 OGP 画像はサーバーが要るため初期は静的 1 枚。動的化は Workers で可能だが対象外

### 3.6 テーマ（A8）

- `data-theme="light" | "dark"` を `<html>` に付与。初期値は `prefers-color-scheme`、切替は `localStorage` に保存
- 生成キャンバス周辺（プレビュー背景）はテーマに追従させる。ただしキャンバス自体の色は当然テーマ非依存

### 3.7 パフォーマンス目標

- 1024px 生成: 300ms 以内（現状同等）
- 4096px: 進捗表示付きで約 10 秒以内に完了（v17 多段解像度）。生成は Web Worker で UI をブロックしない（Issue #3 対応済）。プレビューは粗い結果を先に出す
- 初期表示: JS 総量 300KB gzip 以下を目標。`digsrc.js`（AOR 実物マップ、約 280KB）はプリセット選択時に動的 import。three.js（約 135KB gzip）は 3D モード選択時のみ動的ロード

---

## 4. 技術選定

### 4.1 結論

| 項目 | 選定 | 理由 |
|------|------|------|
| フレームワーク | **React 19 + Vite 6 + TypeScript**（SPA） | サーバー処理が一切ない。Next.js の SSR / RSC / ルーティングは不要で、ビルド・デプロイの複雑さだけ増える。Vite は Worker・動的 import・SCSS を標準サポート |
| 状態管理 | `useReducer` + URL 同期フック | 状態は 1 画面分。URL が正本なのでストアより「URL ⇄ state」の 1 本道を作る方が単純。必要になれば Zustand |
| スタイル | **SCSS（`sass-embedded`）+ CSS Modules** | デザイントークンを SCSS map で持ち CSS カスタムプロパティを生成（§6）。Tailwind は spacious のトークンを二重管理することになるため不採用 |
| 生成コア | `prototype/camo.js` をそのまま `src/core/` へ移動、`.ts` 化は型定義（`.d.ts`）の追加のみ | 「browser / Node 共用、依存ゼロ」の制約を維持。render.mjs の検証ループも続ける |
| ルーティング | なし（`/about` のみ静的 2 ページ目 or モーダル） | 1 画面構成 |
| テスト | **Vitest** | 決定性テスト: 各プリセット × 固定シードで `index` マップのハッシュをスナップショット。タイリングの境界連続性テスト（左端列と右端列の隣接を検証）。UI は最小限 |
| Lint / Format | Biome | 1 ツールで完結 |
| パッケージ管理 | pnpm | 環境に導入済み（v10） |

### 4.2 ディレクトリ構成（案）

```
src/
  core/            camo.js, m81src.js, dcusrc.js, digsrc.js (依存ゼロ維持), camo.d.ts
  workers/         palette-extract.worker.ts, (将来) generate.worker.ts
  lib/             url-state.ts, png-phys.ts, share.ts, kmeans.ts, scene3d.ts, preview3d-math.ts, webgl.ts
  components/      ControlPanel/, Preview/, Preview3D/, PaletteLibrary/, ExportPanel/ ...
  data/            palette-library.json, presets-meta.ts (サムネ・表記名)
  styles/          tokens/ (§6), base/, themes/
  app/             App.tsx, About.tsx
tools/             render.mjs (検証ハーネス、prototype から移動), gen-tokens.mjs, gen-src.mjs
public/3d/         env.hdr, fabric_normal.jpg, fabric_rough.jpg, ripstop_normal.jpg, ripstop_rough.jpg
.claude/skills/design-system/SKILL.md   spacious (LLM 向けデザインルール)
docs/design/spacious-DESIGN.md          spacious トークンの原本
```

`prototype/` はフェーズ1 の記録として残し、`src/core` へ移した時点で README に「参照のみ」と明記する。

---

## 5. Cloudflare ホスティング・デプロイ

### 5.1 結論: Workers（Static Assets）+ GitHub Actions からの `wrangler deploy`

- 生成は完全クライアントサイドなので静的配信で足りる
- Cloudflare は新規プロジェクトに **Workers + Static Assets** を推奨している。将来 OGP 動的生成などを足す場合も同じ Worker に関数を追加できる
- デプロイは GitHub Actions から `wrangler deploy` で行う（当初案は Workers Builds の Git 連携だったが、テスト失敗時にデプロイを止めるゲートを CI と一本化するため変更。フェーズ4で確定）
- Pages でも成立するが、新規に選ぶ理由はない

### 5.2 構成

`wrangler.jsonc`（案）:

```jsonc
{
  "name": "camo-generator",
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "html_handling": "auto-trailing-slash"
  },
  "routes": [
    { "pattern": "camo-generator.suemura.app", "custom_domain": true }
  ]
}
```

- ビルドコマンド: `pnpm build`（Vite → `dist/`）
- キャッシュ: ハッシュ付きアセットは Vite 既定で immutable 扱い。`index.html` は no-cache（Static Assets の既定挙動）
- ヘッダー: `public/_headers` で `X-Content-Type-Options`, `Referrer-Policy`, CSP（`default-src 'self'`、`font-src 'self' data:`。インライン script 不可のためテーマ初期化は `public/theme.js`）
- Cloudflare の Web Analytics ビーコン自動注入は CSP で遮断される（プライバシー表記と整合）。コンソールエラーを消すなら Worker 設定で Web Analytics を無効化する
- カスタムドメイン: **`camo-generator.suemura.app`**（既存の `image-converter.suemura.app` と同じ命名）。`suemura.app` ゾーンは Cloudflare 管理下なので、`wrangler.jsonc` の `routes` に `custom_domain: true` で宣言すれば DNS レコードと証明書は自動発行される。ダッシュボード操作は不要
- 環境: `production`（main）のみ。PR プレビュー URL は持たない（必要になれば `wrangler versions upload` のプレビュー URL を検討）。ビルド時の環境変数は不要（秘密情報を持たない）

### 5.3 CI

- `.github/workflows/ci.yml`（`pull_request`）: `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm test` → `pnpm build`
- `.github/workflows/deploy.yml`（`push` to `main` / `workflow_dispatch`）: 同じ検証を再実行してから `cloudflare/wrangler-action` で `wrangler deploy`。マージコミットが PR 時点と異なりうるため CI の結果は再利用しない。`concurrency` で直列化し途中キャンセルはしない
- Secrets: `CLOUDFLARE_API_TOKEN`（最小権限の Custom Token）/ `CLOUDFLARE_ACCOUNT_ID`。権限一覧・運用手順・障害対処は `docs/03-deploy.md`
- 決定性テストが落ちたら生成結果が変わったことを意味する。意図した変更なら `docs/01-tech-verification.md` へ追記してスナップショット更新

---

## 6. デザインシステム: spacious の取り込み

### 6.1 取り込み方（調査結果）

- 配布元: [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills)（MIT）。`skills/spacious/SKILL.md`（LLM 向けルール）と `DESIGN.md`（トークン定義、YAML frontmatter）の 2 ファイル
- CLI: `npx typeui.sh pull spacious -p claude-code -f skill` → `.claude/skills/design-system/SKILL.md` に配置される（**実施済み**、コミット対象）。`-p claude` は無効なプロバイダ名で、`claude-code` が正しい。`.agents/` にも複製されるが Claude Code では不要なので削除した
- `DESIGN.md` は CLI がプロジェクト直下に置こうとするため、手動で `docs/design/spacious-DESIGN.md` に保存した（トークンの原本）
- 更新: `SKILL.md` は `TYPEUI_SH_MANAGED_START/END` マーカー内が CLI 管理領域。プロジェクト固有の追記（迷彩ジェネレータの UI 語彙、「〜風」表記ルール、キャンバス周辺の配色ルール等）はマーカーの**外**に書く。再 pull しても消えない

### 6.2 spacious の中身と、足りないもの

spacious が定義しているのは以下だけで、コンポーネント仕様やダーク配色は含まない。

- 色: primary `#3B82F6` / secondary `#8B5CF6` / success `#16A34A` / warning `#D97706` / danger `#DC2626` / surface `#FFFFFF` / text `#111827`
- 文字: Open Sans（本文）/ Montserrat（見出し）/ IBM Plex Mono（ラベル・数値）。スケール 12/14/16/18/24/30/36
- 余白: 8pt グリッド。角丸 sm 4px / md 8px
- ルール: セマンティックトークン優先、状態を明示、WCAG 2.2 AA、44px タッチターゲット、reduced-motion 対応

したがって次を**自作**する必要がある。

- ニュートラルスケール（surface / text の間の階調。境界線・無効状態・二次テキスト用）
- **ダークテーマ配色**（spacious はライトのみ）
- 迷彩ジェネレータ固有: プレビュー背景（チェッカー / 中性グレー）、カラースロットの枠、キャンバス周辺は彩度を持たせない（迷彩色の見えを汚さないため）

### 6.3 実装方式: SCSS map → CSS カスタムプロパティ

要件「後からテーマ切替・部分的な色変更をしやすく」を満たすには、SCSS 変数だけでは不足する（ビルド時に値が消え、実行時切替ができない）。**トークンは SCSS map で一元管理し、CSS カスタムプロパティとして出力、コンポーネントは `var(--…)` だけを参照**する。

```
src/styles/tokens/
  _primitives.scss   spacious 原本値（色・フォント・スケール）。DESIGN.md から生成。手で触らない
  _semantic.scss     役割名 → プリミティブの対応（light / dark の 2 map）
  _emit.scss         map を :root / [data-theme="dark"] に @each で書き出す
  index.scss         公開エントリ（@use "tokens" で mixin と関数を提供）
```

- `_primitives.scss` は `tools/gen-tokens.mjs` が `docs/design/spacious-DESIGN.md` の frontmatter から生成する。spacious が更新されたら再生成
- `_semantic.scss` の例:

```scss
$themes: (
  light: (
    color-bg: primitives.$surface,
    color-fg: primitives.$text,
    color-fg-muted: primitives.$neutral-600,
    color-border: primitives.$neutral-200,
    color-accent: primitives.$primary,
    color-preview-bg: primitives.$neutral-100,
  ),
  dark: (
    color-bg: primitives.$neutral-950,
    color-fg: primitives.$neutral-50,
    /* … */
  ),
);
```

- コンポーネント側は `color: var(--color-fg); padding: var(--space-3);` のみ。プリミティブ直接参照は Biome / stylelint 相当のルールで禁止
- 部分的な色変更 = `_semantic.scss` の 1 行変更。テーマ追加 = map に 1 エントリ追加
- LLM 向けルールと実装を一致させるため、`SKILL.md` のマーカー外に「トークン名一覧は `src/styles/tokens/_semantic.scss` を正とする。生値を書かない」と追記する

### 6.4 フォント配信の比較

Open Sans / Montserrat / IBM Plex Mono はいずれも SIL OFL で自前配信可。

| 観点 | Google Fonts（CDN） | 自前配信（`@fontsource/*`） |
|------|------|------|
| 導入手間 | `<link>` 1 行 | `pnpm add @fontsource/open-sans` + `import` 1 行。Vite がハッシュ付きで `dist/` に同梱 |
| CSP | `fonts.googleapis.com` / `fonts.gstatic.com` を許可する必要あり | `self` のみで閉じられる |
| プライバシー | 閲覧者 IP が Google に送られる。EU では GDPR 訴訟事例（2022 ミュンヘン地裁）あり | 第三者送信なし。`/about` の「サーバーへ送信しない」表記と整合 |
| 表示速度 | 別ドメインへの接続が 1 往復増える。フォント自体はキャッシュされにくい（ブラウザのキャッシュ分離で他サイトと共有されない） | 同一オリジン。preload 可 |
| オフライン（将来 PWA #11） | 別途キャッシュ戦略が必要 | そのまま動く |
| フォント更新 | 自動 | パッケージ更新 |

決定: **自前配信**。手間はほぼ同じで、CSP・プライバシー・将来の PWA すべてで有利。

---

## 7. 未決事項

なし（フェーズ2 完了）。

決定済み: フォントは自前配信（`@fontsource/open-sans` / `@fontsource/montserrat` / `@fontsource/ibm-plex-mono`、§6.4）。カスタムドメインは `camo-generator.suemura.app`（§5.2）。`/about` は独立ページ（§2.4）。パレット初期リストは 50 色、`docs/design/palette-library.json` に調査エージェントが作成。

## 8. フェーズ3（設計）への引き継ぎ

- §3.1 シームレスタイリング: 完了（`tools/render.mjs --tile`、`tests/tiling.test.ts`）
- §6.3 のトークン生成スクリプトとテーマ切替は、コンポーネント実装前に骨格として先に作る
