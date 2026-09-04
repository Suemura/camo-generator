# Camo Generator

迷彩模様をプロシージャル生成する Web アプリ。

デモ（フェーズ1 プロトタイプ）: `prototype/index.html` をブラウザで開くだけで動作（依存なし・単一ファイル）。
本実装: **https://camo-generator.suemura.app** （`pnpm install && pnpm dev` でローカル起動）。

## 概要

- ウッドランド (M81) / CCE（フランス） / 3 カラーデザート (DCU) / 6 カラーデザート (DBDU) / 陸自迷彩 2 型（日本） / DPM・デザート DPM（英国） / オーストラリア DPCU（Auscam） / フロッグスキン (M1942 ジャングル面・ビーチ面) / MARPAT (ウッドランド・デザート) / AOR1 / AOR2 / UCP / CADPAT TW（カナダ） / 07 式 通用迷彩（中国） / EMR（ロシア） / ベリョースカ (KLMK、ソ連) の迷彩に近い模様を計算で生成する
- シード値により、同じアルゴリズムから無数のバリエーションを決定的に再現できる
- 各パターンのパレット（例: ウッドランドの緑・茶・サンド・黒）を自由な色にその場で差し替えられる
- 生成結果を PNG / JPG / WebP / SVG（デジタル系のみ）で任意サイズ・実寸（mm / inch × DPI、PNG に DPI 埋込）でエクスポートできる
- 全状態が URL に入るので、リンク 1 本で同じ模様を共有・再現できる。100 色以上の規格色ライブラリ（FS 595 / RAL / BS 381C / RLM … + 各プリセットの実測色）と画像からのパレット抽出
- 実物リファレンス画像との目視比較は開発時専用（`node tools/render.mjs --compare`）。アプリには同梱しない

## 生成手法（フェーズ1 で確立）

パターンごとに最適な手法が異なることが検証で判明し、4系統を実装している。

| 手法 | 対象 | 概要 |
|------|------|------|
| **ブロブパッチ合成（クイルト）** | M81 ウッドランド / CCE / DCU 3 カラーデザート / DBDU 6 カラーデザート / 陸自迷彩 2 型 / DPM / DDPM / オーストラリア DPCU / AOR1 / AOR2 | 実物図案のインデックスマップから、有機輪郭のパッチを領域成長型シームで貼り合わせる。局所形状・色・面積比は実物の設計言語そのもの。多数決ミップマップ・フラグメント除去・シェイプ完走成長などの後処理を含む。**主力手法**（ユーザー評価 88+） |
| **クラスタ成長** | MARPAT (ウッドランド/デザート) / UCP / CADPAT TW / 07 式 通用迷彩 / EMR / ベリョースカ (KLMK) | セルグリッド上で色ごとに面積予算つきシード成長。蛇行ドリフト・seedNear 連鎖・境界ディザ・スペックルで実物のクラスタ構造を再現。クラスタの異方性は `elongX` / `elongY`（UCP は横長、EMR は縦長） |
| **斑点配置** | フロッグスキン (M1942 ジャングル面 / ビーチ面) | 地色の上に、版（色）ごとに独立した丸い斑点を刷り重ねる手続き生成。輪郭は極座標の低次高調波で作る解析形状で、Mitchell のベストキャンディデート法で間隔を均す。実物図案を使わないため、参照画像のライセンスが派生物に及ぶ迷彩でも実装できる。層に `halo` を指定すると、斑を刷る直前に同じ輪郭をひと回り大きく別の版で刷り、重ね刷りで下の版が縁として残る構造を再現する |
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
  image.mjs         Node 側の画像読込 (sharp を動的 import。refs/ の探索)
  check-private-refs.sh  refs/private/ がリポジトリに混入していないか検査 (pre-push / CI / Claude フックから呼ぶ)
  gen-tokens.mjs    docs/design/spacious-DESIGN.md → _primitives.scss
refs/               実物リファレンス画像 (開発時専用、アプリ非同梱。refs/README.md)
  <presetKey>.<ext>   自由ライセンス (Wikimedia Commons)。git 管理、出典は本 README のクレジット節
  private/            再配布不可の画像。gitignore + 4 層の push 防止で絶対にコミットしない
                      (フロッグスキン ビーチ面の参照スウォッチがここ。生成は手続き的なので画像なしでも動く)
.gitattributes      マージ方針 (snap / refs.js は union、prototype/index.html は ours)
.githooks/pre-push  refs/private/ を含む push を拒否 (pnpm install の prepare が core.hooksPath を設定)
tests/              Vitest (決定性・回帰スナップショット)
prototype/          フェーズ1 プロトタイプ (参照のみ。build.mjs は src/core を読む)
  app-template.html / build.mjs / refs.js / index.html / experimental/
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
node tools/render.mjs <出力dir> <seed> --compare  # 左=生成 / 右=実物リファレンス (refs/) を並べた PNG。精度改善の基本ループ
node tools/extract-palette.mjs refs/<key>.png 4    # 参照画像からパレット既定値を実測 (PRESETS.colors 用スニペットを出力)
#   オプション: --core[=R] (領域内部の中央値で測る。輪郭の混色を除く) / --flatten=SIGMA (周辺減光の平坦化)
node tools/gen-src.mjs refs/<key>.png src/core/<key>src.js <k> <PREFIX>   # 参照画像 → クイルト用インデックスマップ (新プリセットの図案化)
#   オプション: --resize=N (長辺を縮小) / --blur=SIGMA (織り目を落とす) / --flatten=SIGMA (周辺減光の平坦化)
#             / --thin=N (皺の稜線・影が残す幅 2N px 未満の細帯をオープニングで除去)
#             いずれも布地の写真をリファレンスにする場合に必要。既定オフで従来と同一出力
#   k は 2..8。5 以上では RLE を値 3bit で符号化する (4 以下は従来の 2bit で既存ソースと互換)
bash tools/check-private-refs.sh [rev-range]      # refs/private/ の混入検査 (CI と pre-push が自動実行)
```

### リファレンス画像の運用（`refs/`）

- 実物リファレンスは**開発時専用**。アプリには同梱せず、UI の「実物比較」モードは廃止した。比較は `render.mjs --compare`、パレット実測は `extract-palette.mjs`
- 自由ライセンス（Wikimedia Commons 等）の画像は `refs/<presetKey>.<ext>` に置いて git 管理し、下記クレジット節に出典・作者・ライセンスを書く
- 権利上再配布できない画像は `mkdir -p refs/private` して `refs/private/<presetKey>.<ext>` に置く。`.gitignore` 対象で、`.githooks/pre-push` / Claude Code の PreToolUse フック / CI・Deploy の 4 層が混入を止める。**`git add -f` しないこと**
- 新プリセット追加の手順は `docs/04-add-preset.md`（7 点セット: `PRESETS` / `PRESET_META` / `refs/<key>.<ext>` / パレット既定値の実測 / カラーライブラリ登録 / 決定性スナップショット / 検証プロトタイプ。加えてクレジット節の更新と PR への検証画像貼付）

### 検証プロトタイプ（`prototype/`）

`prototype/index.html` は `app-template.html` に `src/core/*` をインライン展開した単一ファイルの精度検証環境で、生成結果と実物リファレンスを左右に並べて比較できる。生成ロジックは `src/core/camo.js` の 1 本が正本で、本アプリ（`src/lib/generate.ts` が ESM で import）とプロトタイプ（ビルド時にインライン展開）が同じ実装を共有する。二重実装はない。

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
- M81 / AOR1 / AOR2 ソースマップ（`src/core/m81src.js` / `digsrc.js`）は下記 Wikimedia Commons 画像から生成した 4 値インデックス（いずれも米政府図案でパブリックドメイン）。DCU ソースマップ（`src/core/dcusrc.js`）は `refs/dcu.png` から生成した 3 値インデックス、陸自迷彩 2 型ソースマップ（`src/core/jgsdf2src.js`）は `refs/jgsdf2.jpg`（CC BY 3.0、下記クレジット）から生成した 4 値インデックス、DPM ソースマップ（`src/core/dpmsrc.js`）は `refs/dpm.jpg`（OGL v1.0、下記クレジット）から生成した 4 値インデックス、オーストラリア DPCU ソースマップ（`src/core/auscamsrc.js`）は `refs/auscam.jpg`（パブリックドメイン）から生成した 5 値インデックス（クイルト系で唯一の 5 値なので RLE は値 3bit で符号化する）。DDPM は専用ソースマップを持たず、`dpmsrc.js` を 4 値のまま合成して明 2 色 → サンド / 暗 2 色 → ブラウンに統合する。CCE は専用ソースマップを持たず、`m81src.js` を横方向に伸長サンプリングして生成する。DBDU も専用ソースマップを持たず、ブロブ層は `dcusrc.js` を共有し小石層を手続き生成する。フロッグスキン (M1942) の両面はソースマップを持たず、斑点を完全に手続き生成する（ジャングル面は参照画像が CC BY-SA、ビーチ面は参照画像が再配布不可のため、いずれも図案の派生データを同梱しない）。CADPAT / 07 式 / EMR / ベリョースカ (KLMK) はクラスタ成長（`genGrowth`）なのでソースマップ自体を持たない（ベリョースカは参照画像が CC BY-SA なので、この選択で派生データの同梱も避けている）
- 実物リファレンス画像（`refs/`、開発時専用・アプリ非同梱）の出典。いずれも Wikimedia Commons。米政府図案はパブリックドメイン、`cce.png` / `emr.png` は CC0、`dbdu.jpg` と `frogskin.jpg` は CC BY-SA 3.0、`jgsdf2.jpg` は CC BY 3.0、`pla07.jpg` は CC BY-SA 4.0、`dpm.jpg` / `ddpm.jpg` は英国政府の Open Government Licence v1.0（OGL）
  - `woodland.png` — [File:"M81" U.S. woodland camouflage pattern swatch.png](https://commons.wikimedia.org/wiki/File:%22M81%22_U.S._woodland_camouflage_pattern_swatch.png)（U.S. Army）
  - `cce.png` — [File:Bariolage Centre-Europe.png](https://commons.wikimedia.org/wiki/File:Bariolage_Centre-Europe.png)（Commons 利用者 Youri BRIAND による作図、CC0）
  - `marpat.jpg` — [File:MARPAT woodland pattern.jpg](https://commons.wikimedia.org/wiki/File:MARPAT_woodland_pattern.jpg)（Henrik Clausen 撮影、パブリックドメイン）
  - `marpat_desert.jpg` — [File:Desert MARPAT camouflage pattern swatch.jpg](https://commons.wikimedia.org/wiki/File:Desert_MARPAT_camouflage_pattern_swatch.jpg)（USMC）
  - `aor1.png` — [File:Navy Working Uniform (NWU) Type III camouflage pattern swatch, AOR-1.png](https://commons.wikimedia.org/wiki/File:Navy_Working_Uniform_(NWU)_Type_III_camouflage_pattern_swatch,_AOR-1.png)（U.S. Navy）
  - `aor2.png` — [File:NWU Type III camouflage pattern swatch, AOR-2.png](https://commons.wikimedia.org/wiki/File:NWU_Type_III_camouflage_pattern_swatch,_AOR-2.png)（U.S. Navy）
  - `auscam.jpg` — [File:DPCU closeup, 2005.jpg](https://commons.wikimedia.org/wiki/File:DPCU_closeup,_2005.jpg)（Larry Edmond 撮影、U.S. Army、パブリックドメイン）
  - `ucp.jpg` — [File:Universal Camouflage Pattern (UCP).jpg](https://commons.wikimedia.org/wiki/File:Universal_Camouflage_Pattern_(UCP).jpg)（Commons 利用者 Doubleailes、パブリックドメイン）
  - `dcu.png` — [File:DCU camo swatch.png](https://commons.wikimedia.org/wiki/File:DCU_camo_swatch.png)（U.S. Army）
  - `dbdu.jpg` — [File:Six-Color Desert Pattern.jpg](https://commons.wikimedia.org/wiki/File:Six-Color_Desert_Pattern.jpg)（撮影: Wikipedia 利用者 Pretzelpaws、**CC BY-SA 3.0**）。**目視比較とパレット実測にのみ使う開発時専用の画像で、この画像から派生したデータはアプリに同梱していない**（DBDU のブロブ層はパブリックドメインの DCU 図案 `src/core/dcusrc.js` を共有し、小石層は手続き生成）
  - `cadpat.png` — [File:Temperate CADPAT camouflage pattern swatch.png](https://commons.wikimedia.org/wiki/File:Temperate_CADPAT_camouflage_pattern_swatch.png)（Canadian government、`PD-ineligible`）。CADPAT の図案自体はカナダ政府の権利なので、生成は図案の複製ではなくパラメータによる「CADPAT 風」であり、この画像から派生したデータはアプリに同梱していない（`genGrowth` はソースマップを持たない）
  - `pla07.jpg` — [File:Type 07 universal.jpg](https://commons.wikimedia.org/wiki/File:Type_07_universal.jpg)（Commons 利用者 GTRus、**CC BY-SA 4.0**。無改変で収録）
  - `emr.png` — [File:Russian Armed Forces EMR patten.png](https://commons.wikimedia.org/wiki/File:Russian_Armed_Forces_EMR_patten.png)（Commons 利用者 Grieferus、CC0）
  - `jgsdf2.jpg` — [File:迷彩服2型の迷彩パターン.jpg](https://commons.wikimedia.org/wiki/File:%E8%BF%B7%E5%BD%A9%E6%9C%8D2%E5%9E%8B%E3%81%AE%E8%BF%B7%E5%BD%A9%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3.jpg)（Crescent moon 撮影、**CC BY 3.0**。無改変で収録）
  - `dpm.jpg` — [File:DPM Combat 95 Camouflage Material MOD 45149982.jpg](https://commons.wikimedia.org/wiki/File:DPM_Combat_95_Camouflage_Material_MOD_45149982.jpg)（Cpl Adrian Harlen RLC 撮影、UK MOD、**OGL v1.0**。長辺 1600px に縮小して収録。Contains public sector information licensed under the Open Government Licence v1.0）
  - `ddpm.jpg` — [File:Desert pattern camouflage material MOD 45148363.jpg](https://commons.wikimedia.org/wiki/File:Desert_pattern_camouflage_material_MOD_45148363.jpg)（Graeme Main 撮影、UK MOD、**OGL v1.0**。長辺 1600px に縮小して収録。目視比較とパレット実測にのみ使用）
  - `frogskin.jpg` — [File:Frog Skin camouflage pattern.jpg](https://commons.wikimedia.org/wiki/File:Frog_Skin_camouflage_pattern.jpg)（Commons 利用者 IQ125 撮影、**CC BY-SA 3.0**。無改変で収録）。**目視比較とパレット実測にのみ使う開発時専用の画像で、この画像から派生したデータはアプリに同梱していない**（フロッグスキンの斑点は手続き生成）
- `experimental/` の一部は [camogen](https://github.com/glederrey/camogen) (MIT) のアルゴリズムを参考にした
