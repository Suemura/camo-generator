# Camo Generator

迷彩模様をプロシージャル生成する Web アプリ。

デモ（フェーズ1 プロトタイプ）: `prototype/index.html` をブラウザで開くだけで動作（依存なし・単一ファイル）。
本実装: **https://camo-generator.suemura.app** （`pnpm install && pnpm dev` でローカル起動）。

## 概要

- ウッドランド (M81) / CCE（フランス） / 3 カラーデザート (DCU) / 6 カラーデザート (DBDU) / 陸自迷彩 2 型（日本） / DPM・デザート DPM（英国） / オーストラリア DPCU（Auscam） / フロッグスキン (M1942 ジャングル面・ビーチ面) / タイガーストライプ（南ベトナム） / ローデシアン・ブラッシュストローク / リザード TAP47（フランス） / MARPAT (ウッドランド・デザート) / AOR1 / AOR2 / UCP / CADPAT TW（カナダ） / 07 式 通用迷彩（中国） / EMR（ロシア） / ベリョースカ (KLMK、ソ連) / NWU Type I（米海軍） / スプリンター（ドイツ WWII） / マルチカム風 の迷彩に近い模様を計算で生成する
- シード値により、同じアルゴリズムから無数のバリエーションを決定的に再現できる
- 各パターンのパレット（例: ウッドランドの緑・茶・サンド・黒）を自由な色にその場で差し替えられる
- 生成結果を PNG / JPG / WebP / SVG（デジタル系のみ）で任意サイズ・実寸（mm / inch × DPI、PNG に DPI 埋込）でエクスポートできる
- 全状態が URL に入るので、リンク 1 本で同じ模様を共有・再現できる。100 色以上の規格色ライブラリ（FS 595 / RAL / BS 381C / RLM … + 各プリセットの実測色）と画像からのパレット抽出
- 実物リファレンス画像との目視比較は開発時専用（`node tools/render.mjs --compare`）。アプリには同梱しない

## 生成手法（フェーズ1 で確立）

パターンごとに最適な手法が異なることが検証で判明し、5系統を実装している。

| 手法 | 対象 | 概要 |
|------|------|------|
| **ブロブパッチ合成（クイルト）** | M81 ウッドランド / CCE / DCU 3 カラーデザート / DBDU 6 カラーデザート / 陸自迷彩 2 型 / DPM / DDPM / オーストラリア DPCU / タイガーストライプ / ローデシアン・ブラッシュストローク / リザード TAP47 / AOR1 / AOR2 | 実物図案のインデックスマップから、有機輪郭のパッチを領域成長型シームで貼り合わせる。局所形状・色・面積比は実物の設計言語そのもの。多数決ミップマップ・フラグメント除去・シェイプ完走成長などの後処理を含む。**主力手法**（ユーザー評価 88+）。縞図案では `slopeLock` でソース参照の反転を連動させ、縞の傾きの向きを揃える |
| **クラスタ成長** | MARPAT (ウッドランド/デザート) / UCP / CADPAT TW / 07 式 通用迷彩 / EMR / ベリョースカ (KLMK) / NWU Type I | セルグリッド上で色ごとに面積予算つきシード成長。蛇行ドリフト・seedNear 連鎖・境界ディザ・スペックルで実物のクラスタ構造を再現。クラスタの異方性は `elongX` / `elongY`（UCP は横長、EMR は縦長） |
| **斑点配置** | フロッグスキン (M1942 ジャングル面 / ビーチ面) | 地色の上に、版（色）ごとに独立した丸い斑点を刷り重ねる手続き生成。輪郭は極座標の低次高調波で作る解析形状で、Mitchell のベストキャンディデート法で間隔を均す。実物図案を使わないため、参照画像のライセンスが派生物に及ぶ迷彩でも実装できる。層に `halo` を指定すると、斑を刷る直前に同じ輪郭をひと回り大きく別の版で刷り、重ね刷りで下の版が縁として残る構造を再現する |
| **幾何ハードエッジ** | スプリンター (Splittertarn) | 周期境界のパワー図（重み付きボロノイ）で平面を多角形セルに分割し、面積目標と確率 `merge` でセルへ色を割り当てる。輪郭が全て直線で三重点が多い実物の構造をそのまま作る。`P.rain` で縦の雨線（Regenmuster）を重ねる。ソース図案を持たない手続き生成 |
| **多層グラデーション** | マルチカム風 | 周期ノイズを分位点で量子化した横方向のグラデーション帯（`P.bg`。境界は等方ノイズで島状に混ぜ、画素ディザは使わない）の上に、斑点層（genSpots と同じ解析形状、`halo.shift` で芯を片寄せ）と筆線層（`type: 'stroke'`。方向付きの太い曲線で、横向きなら虫状の斑、縦向きなら草の茎状の縦棒）を重ねる。層は `P.layers` で独立に on/off でき、派生（OCP / MTP）は同じエンジンにプリセットを足すだけで作れる。ソース図案を持たない手続き生成 |
| **ノイズ閾値（従来手法）** | （選択肢からは退役） | シード付き値ノイズ + fBm + ドメインワープ + 分位点閾値。到達上限 ~75点。コードは保持し、フェーズ2 のカスタム迷彩生成の基盤候補 |

技術詳細・検証履歴（v1〜v14 の全反復記録）は `docs/01-tech-verification.md` を参照。

## ディレクトリ構成

```
src/
  core/             生成コア (camo.js: browser/node 共用 ES module、依存なし) + 実物インデックスマップ + 型定義
  app/              React UI
  styles/tokens/    デザイントークン (spacious 由来。primitives → semantic → CSS カスタムプロパティ)
tools/
  render.mjs        Node レンダリングハーネス (PNG 出力、目視検証ループ用。--compare で refs/ の実物と左右比較)
  extract-palette.mjs  参照画像からパレット既定値を k-means で実測 (UI の抽出と同じ実装)
  gen-src.mjs       参照画像 → クイルト用インデックスマップ (RLE + base64) を生成 (src/core/*src.js)
  image.mjs         Node 側の画像読込 (sharp を動的 import。refs/private/ の探索)
  check-private-refs.sh  refs/private/ がリポジトリに混入していないか検査 (pre-push / CI / Claude フックから呼ぶ)
  gen-tokens.mjs    docs/design/spacious-DESIGN.md → _primitives.scss
refs/               実物リファレンス画像の置き場 (開発時専用、アプリ非同梱。refs/README.md)
  private/            画像はすべてここ。gitignore + 4 層の push 防止でリポジトリに入れない
                      (各自が手元に置く。生成は画像なしでも動く)
.gitattributes      マージ方針 (snap / refs.js は union、prototype/index.html は ours)
.githooks/pre-push  refs/private/ を含む push を拒否 (pnpm install の prepare が core.hooksPath を設定)
tests/              Vitest (決定性・回帰スナップショット)
prototype/          フェーズ1 プロトタイプ (参照のみ。build.mjs は src/core を読む)
  app-template.html / build.mjs / refs.js / index.html / index.local.html (gitignore) / experimental/
docs/
  01-tech-verification.md  フェーズ1 検証記録 (手法変遷・自己改善ループ全履歴)
  02-spec.md               フェーズ2 仕様設計 (機能仕分け・画面・技術選定・Cloudflare・デザインシステム)
  03-deploy.md             自動デプロイの運用 (GitHub Actions / Cloudflare)
  04-add-preset.md         迷彩プリセット追加ガイド (7 点セット・カラーライブラリ登録・検証・PR・マージまで)
  design/                  spacious トークン原本 / パレットライブラリ (palette-library.json + 出典 palette-library-sources.md)
.claude/skills/design-system/SKILL.md  LLM 向けデザインルール (spacious, typeui.sh で取得)
wrangler.jsonc      Cloudflare Workers (Static Assets) 設定
```

## 開発コマンド

```bash
pnpm install
pnpm dev          # 開発サーバー
pnpm build        # dist/ 生成 (tokens → tsc → vite)
pnpm test         # 決定性テスト
pnpm check        # Biome
pnpm typecheck    # tsc
pnpm thumbs       # プリセットのサムネイル JPG を生成 (public/thumbs/<key>.jpg)。既定は新規のみ。--force で全体再生成
pnpm deploy       # 手動デプロイ (wrangler login 済み前提)。通常は main マージで GitHub Actions が自動デプロイ

node tools/render.mjs <出力dir> <seed> [scale]   # 全プリセットを PNG レンダ (目視検証用)
node tools/render.mjs <出力dir> <seed> --compare  # 左=生成 / 右=実物リファレンス (refs/private/) を並べた PNG。精度改善の基本ループ
node tools/extract-palette.mjs refs/private/<key>.png 4    # 参照画像からパレット既定値を実測 (PRESETS.colors 用スニペットを出力)
#   オプション: --core[=R] (領域内部の中央値で測る。輪郭の混色を除く) / --flatten=SIGMA (周辺減光の平坦化)
node tools/gen-src.mjs refs/private/<key>.png src/core/<key>src.js <k> <PREFIX>   # 参照画像 → クイルト用インデックスマップ (新プリセットの図案化)
#   オプション: --resize=N (長辺を縮小) / --blur=SIGMA (織り目を落とす) / --flatten=SIGMA (周辺減光の平坦化)
#             / --thin=N (皺の稜線・影が残す幅 2N px 未満の細帯をオープニングで除去)
#             いずれも布地の写真をリファレンスにする場合に必要。既定オフで従来と同一出力
#   k は 2..8。5 以上では RLE を値 3bit で符号化する (4 以下は従来の 2bit で既存ソースと互換)
bash tools/check-private-refs.sh [rev-range]      # refs/private/ の混入検査 (CI と pre-push が自動実行)
```

### リファレンス画像の運用（`refs/`）

- 実物リファレンスは**開発時専用**。アプリには同梱せず、UI の「実物比較」モードは廃止した。比較は `render.mjs --compare`、パレット実測は `extract-palette.mjs`
- **リファレンス画像はリポジトリで管理しない**。ライセンスの種類にかかわらず `mkdir -p refs/private` して `refs/private/<presetKey>.<ext>` に各自で置く。`.gitignore` 対象で、`.githooks/pre-push` / Claude Code の PreToolUse フック / CI・Deploy の 4 層が混入を止める。**`git add -f` しないこと**
- 新プリセット追加の手順は `docs/04-add-preset.md`（`PRESETS` / `PRESET_META` / 手元のリファレンス画像 / パレット既定値の実測 / カラーライブラリ登録 / 決定性スナップショット / 検証プロトタイプ。加えて PR への検証画像貼付）

### 検証プロトタイプ（`prototype/`）

`prototype/index.html` は `app-template.html` に `src/core/*` をインライン展開した単一ファイルの精度検証環境。参照画像を含まないので実物比較ペインは空で、`node prototype/build.mjs` が同時に出力する `index.local.html`（gitignore、`refs/private/` の画像を data URI で埋め込む）を開くと左右に並べて比較できる。生成ロジックは `src/core/camo.js` の 1 本が正本で、本アプリ（`src/lib/generate.ts` が ESM で import）とプロトタイプ（ビルド時にインライン展開）が同じ実装を共有する。二重実装はない。

ただしプロトタイプは `camo.js` の**スナップショット**なので、生成コアを変えたら `node prototype/build.mjs` で再ビルドする。忘れると古い実装が焼き付いたまま残るため、`tests/prototype-sync.test.ts` が `index.html` と `src/core/*` の現状を byte 比較して落とす。

## 進め方と進捗

| フェーズ | 内容 | 状態 |
|---------|------|------|
| 1. 技術検証 | 生成精度の検証・手法確立（自己改善ループ計40周超 + 並行手法探索） | **完了** |
| 2. 仕様整理 | 機能仕分け・画面構成・技術選定・Cloudflare 構成・デザインシステム（`docs/02-spec.md`） | **完了** |
| 3. 設計 | React + Vite プロジェクト骨格・トークン生成・シームレスタイリング（v15） | **完了** |
| 4. 実装 | UI 本実装・初回デプロイ（`camo-generator.suemura.app`） | **完了** |
| 4. 実装 | main マージ時の自動デプロイ（GitHub Actions → `wrangler deploy`） | **完了** |

### デプロイ

`main` への push（PR マージ）で `.github/workflows/deploy.yml` が `pnpm check` → `pnpm test` → `pnpm build` → `wrangler deploy` を実行し、`https://camo-generator.suemura.app` に反映する。PR では `ci.yml` が同じ検証だけを行う。
初期設定（Cloudflare API トークンの権限・GitHub Secrets）、手動再デプロイ、ロールバック、権限エラーの切り分けは `docs/03-deploy.md` を参照。

### フェーズ1 の到達点

- M81 ウッドランド（クイルト）: ユーザー評価 88+。指摘された全アーティファクト（ブロック感・境界急変・切断面・直線的境目・市松ノイズ・微小点）を解消済み
- デジタル系（クラスタ成長）: 実物のクラスタ構造・ツイッグ・スペックルを再現
- シード再現性: 全手法で座標ハッシュ/シード付き PRNG による完全決定的生成
- シームレスタイリング（フェーズ3 v15）: 全手法でトーラス生成、既定 ON。`--tile` で 2×2 検証
- パレット: 実物参照画像からの k-means 抽出値を既定色に。全スロット自由変更可
- エクスポート: PNG/JPG 任意サイズ（〜4096）、SVG はセルグリッド系（MARPAT/UCP）のみ（クイルト系のベクタ化はフェーズ2 検討）

### フェーズ2 への持ち越し課題（仕分け結果: 3 は初期リリース、他は GitHub Issues #1〜#12）

1. クイルト方式の MARPAT への展開検討（現状は布地写真ソースのみのため成長方式）
2. 有機系パターンの SVG 出力（marching squares によるベクタ化）
3. ~~シームレスタイリング（生地印刷用途）~~ → v15 で実装済（既定 ON）
4. 高解像度時のパフォーマンス（Web Worker / WebGL 化。現状 scale 2 で ~2s）
5. Cloudflare 構成の確定（生成は完全クライアントサイド → 静的ホスティングで足りる見込み）
6. カスタムオリジナル迷彩機能（experimental/polygon.js のポリゴン分割方式が候補）

## クレジット・ライセンス注記

- 3D プレビューの環境光 HDRI は Poly Haven「Kloofendal 48d Partly Cloudy (Pure Sky)」（Greg Zaal / Jarod Guest、CC0）、布地の normal / roughness マップは ambientCG「Fabric 036」「Fabric 062」（CC0）を 512px に縮小して `public/3d/` に同梱。3D 描画は three.js（MIT）
- 実物リファレンス画像はリポジトリに含めない（`refs/private/`、gitignore）。アプリにも同梱していない
- アプリに同梱するソースマップ（`src/core/*src.js`）のうち、下記 2 つは第三者のライセンス画像を 4 値インデックス化した派生データなので帰属を表示する。他のソースマップはパブリックドメイン図案由来、それ以外のプリセットは手続き生成（`genSpots` / `genGrowth` / `genSplinter` / `genLayered`）でソースマップを持たない
  - `src/core/jgsdf2src.js`（陸自迷彩 2 型） — [File:迷彩服2型の迷彩パターン.jpg](https://commons.wikimedia.org/wiki/File:%E8%BF%B7%E5%BD%A9%E6%9C%8D2%E5%9E%8B%E3%81%AE%E8%BF%B7%E5%BD%A9%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3.jpg)（Crescent moon 撮影、**CC BY 3.0**）に基づく
  - `src/core/dpmsrc.js`（DPM / DDPM） — [File:DPM Combat 95 Camouflage Material MOD 45149982.jpg](https://commons.wikimedia.org/wiki/File:DPM_Combat_95_Camouflage_Material_MOD_45149982.jpg)（Cpl Adrian Harlen RLC 撮影、UK MOD）に基づく。Contains public sector information licensed under the Open Government Licence v1.0
- `experimental/` の一部は [camogen](https://github.com/glederrey/camogen) (MIT) のアルゴリズムを参考にした
