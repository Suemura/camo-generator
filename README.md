# Camo Generator

迷彩模様をプロシージャル生成する Web アプリ。

検証プロトタイプ: `prototype/index.html` をブラウザで開くだけで動作（依存なし・単一ファイル）。
本実装: **https://camo-generator.suemura.app** （`pnpm install && pnpm dev` でローカル起動）。

## 概要

- ウッドランド (M81) / CCE（フランス） / 3 カラーデザート (DCU) / 6 カラーデザート (DBDU) / 陸自迷彩 2 型（日本） / DPM・デザート DPM（英国） / オーストラリア DPCU（Auscam） / フロッグスキン (M1942 ジャングル面・ビーチ面) / タイガーストライプ（南ベトナム） / ローデシアン・ブラッシュストローク / リザード TAP47（フランス） / MARPAT (ウッドランド・デザート) / AOR1 / AOR2 / UCP / CADPAT TW（カナダ） / 07 式 通用迷彩・海洋迷彩（中国） / EMR（ロシア） / ベリョースカ (KLMK、ソ連) / NWU Type I（米海軍） / スプリンター（ドイツ WWII） / シュトリヒタルン（東ドイツ） / フレックターン・ヴュステンターン（ドイツ）とその配色替え（Tibetarn（中国）/ M/84・M/01・T/99（デンマーク）/ Flectar-D（ロシア）/ Schneetarn ほか） の迷彩に近い模様を計算で生成する
- シード値により、同じアルゴリズムから無数のバリエーションを決定的に再現できる
- 各パターンのパレット（例: ウッドランドの緑・茶・サンド・黒）を自由な色にその場で差し替えられる
- 生成結果を PNG / JPG / WebP / SVG（デジタル系のみ）で任意サイズ・実寸（mm / inch × DPI、PNG に DPI 埋込）でエクスポートできる
- 全状態が URL に入るので、リンク 1 本で同じ模様を共有・再現できる。100 色以上の規格色ライブラリ（FS 595 / RAL / BS 381C / RLM … + 各プリセットの実測色）と画像からのパレット抽出
- 実物リファレンス画像との目視比較は開発時専用（`node tools/render.mjs --compare`）。アプリには同梱しない

## 生成手法

パターンごとに最適な手法が異なるため、複数の系統を実装している。実物の特徴と手法の対応は `docs/01-tech-verification.md`「手法の選び方」。

| 手法 | 対象 | 概要 |
|------|------|------|
| **ブロブパッチ合成（クイルト）** | M81 ウッドランド / CCE / DCU 3 カラーデザート / DBDU 6 カラーデザート / 陸自迷彩 2 型 / DPM / DDPM / オーストラリア DPCU / タイガーストライプ / ローデシアン・ブラッシュストローク / リザード TAP47 / AOR1 / AOR2 | 実物図案のインデックスマップから、有機輪郭のパッチを領域成長型シームで貼り合わせる。局所形状・色・面積比は実物の設計言語そのもの。多数決ミップマップ・フラグメント除去・シェイプ完走成長などの後処理を含む。縞図案では `slopeLock` でソース参照の反転を連動させ、縞の傾きの向きを揃える |
| **クラスタ成長** | MARPAT (ウッドランド/デザート) / UCP / CADPAT TW / 07 式 通用迷彩・海洋迷彩 / EMR / ベリョースカ (KLMK) / NWU Type I | セルグリッド上で色ごとに面積予算つきシード成長。蛇行ドリフト・seedNear 連鎖・境界ディザ・スペックルで実物のクラスタ構造を再現。クラスタの異方性は `elongX` / `elongY`（UCP は横長、EMR は縦長） |
| **斑点配置** | フロッグスキン (M1942 ジャングル面 / ビーチ面) / フレックターン / ヴュステンターン | 地色の上に、版（色）ごとに丸い斑点を刷り重ねる手続き生成。輪郭は極座標の低次高調波で作る解析形状で、Mitchell のベストキャンディデート法で間隔を均す。実物図案を使わないため、参照画像のライセンスが派生物に及ぶ迷彩でも実装できる。層に `halo` を指定すると、斑を刷る直前に同じ輪郭をひと回り大きく別の版で刷り、重ね刷りで下の版が縁として残る構造を再現する。`gap` を負にすると同じ版の斑が接触・融合して「円弧が連なった塊」になり（フレックターン系）、`clump` を指定すると斑の中心をトーラス周期の低周波ノイズで間引いて、版ごとの偏在（フレックターンの暗色域）を作る（塊の差し渡しは 512px・scale 1.0 基準の px で指定し、スケール変更に追従）。同一図案の配色替えは層定義を参照で共有し `colors` だけ差し替える。色数が減る派生（M/84 系はドイツ 5 版を 3 群に統合）は `remap` で写像する |
| **幾何ハードエッジ** | スプリンター (Splittertarn) | 周期境界のパワー図（重み付きボロノイ）で平面を多角形セルに分割し、面積目標と確率 `merge` でセルへ色を割り当てる。輪郭が全て直線で三重点が多い実物の構造をそのまま作る。`P.rain` で縦の雨線（Regenmuster）を重ねる。ソース図案を持たない手続き生成 |
| **雨線（レインパターン）** | シュトリヒタルン (東ドイツ) | 無地の地色に、周期境界の格子 + 座標ハッシュで細く短い縦ダッシュをカプセル形に刷る。列レーン・列位相・列内非重複で「縦の列に緩く揃い、上下は接触しない」実物の並びを、太さ・長さ・傾きの一様な散らしで手刷りのばらつきを再現する。ソース図案を持たない手続き生成 |
| **ノイズ閾値（従来手法）** | （選択肢からは退役） | シード付き値ノイズ + fBm + ドメインワープ + 分位点閾値。実物の設計言語にならないため退役。コードは保持し、カスタム迷彩生成の基盤候補 |

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
  analyze-spots.mjs  斑点配置系の色の空間分布 (面積比 / 等価半径 / 塊り比) を参照と突き合わせる
  analyze-rain.mjs  雨線図案系の縦ダッシュ幾何を参照と突き合わせる
  image.mjs         Node 側の画像読込 (sharp を動的 import。refs/private/ の探索)
  check-private-refs.sh  refs/private/ がリポジトリに混入していないか検査 (pre-push / CI / Claude フックから呼ぶ)
  gen-tokens.mjs    docs/design/spacious-DESIGN.md → _primitives.scss
refs/               実物リファレンス画像の置き場 (開発時専用、アプリ非同梱。refs/README.md)
  private/            画像はすべてここ。gitignore + 4 層の push 防止でリポジトリに入れない
                      (各自が手元に置く。生成は画像なしでも動く)
.gitattributes      マージ方針 (snap / refs.js は union、prototype/index.html は ours)
.githooks/pre-push  refs/private/ を含む push を拒否 (pnpm install の prepare が core.hooksPath を設定)
tests/              Vitest (決定性・回帰スナップショット)
prototype/          検証プロトタイプ (build.mjs は src/core を読む)
  app-template.html / build.mjs / refs.js / index.html / index.local.html (gitignore) / experimental/
docs/
  01-tech-verification.md  生成手法の判断カタログ (手法の選び方・既知アーティファクト・捨てた案・実測の罠)
  02-spec.md               仕様 (機能仕分け・画面・URL 状態・技術選定・Cloudflare・デザインシステム)
  03-deploy.md             自動デプロイの運用 (GitHub Actions / Cloudflare)
  04-add-preset.md         迷彩プリセット追加ガイド (8 点セット・カラーライブラリ登録・検証・PR・マージまで)
  design/                  spacious トークン原本 / パレットライブラリの収録方針 (palette-library-sources.md)
AGENTS.md          Claude Code / Codex 共通の作業規約と参照先
.agents/           共通スキル・役割・ワークフロー規則（デザインもここが正本）
.claude/           Claude Code の設定・コマンド・エージェント入口
.codex/            Codex のフック設定・エージェント入口
wrangler.jsonc      Cloudflare Workers (Static Assets) 設定
```

## 開発コマンド

```bash
pnpm install --frozen-lockfile
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
node tools/analyze-spots.mjs ref refs/private/<key>.jpg <k>   # 斑点配置系の「色の空間分布」を参照と突き合わせる
node tools/analyze-spots.mjs gen <key> 0.7 1.0 2.0            # 版ごとの面積比 / 等価半径の地色比 / 塊り比 (低周波の偏在)
#   kind: 'spots' のプリセットでは必須。目視では L.clump の効きすぎとスケール追従漏れを検出できない (docs/01-tech-verification.md「計測と指標」)
#   r50 は参照が JPEG だとアンチエイリアスで中央値が下がる。絶対値ではなく地色比で見ること
node tools/analyze-rain.mjs ref refs/private/<key>.jpg        # 雨線図案系の「ダッシュ幾何」を参照と突き合わせる
node tools/analyze-rain.mjs gen <key> 0.7 1.0 2.0             # 版ごとの縦ダッシュの密度・傾き・長さ分布を測定
#   kind: 'rain' のプリセットでは推奨。目視では列位相・列内非重複・統計的ばらつきを検出できない
bash tools/check-private-refs.sh [rev-range]      # refs/private/ の混入検査 (CI と pre-push が自動実行)
```

### Claude Code / Codex での開発

共通規約は [AGENTS.md](AGENTS.md)、モジュール構成は [docs/architecture.md](docs/architecture.md)。手順・役割・デザインは `.agents/` を正本とし、製品側には読込の入口と固有設定を置く。導入、スキルの使い方、フックの検証は [共用ハーネスガイド](docs/05-agent-workflow.md) を参照。

### リファレンス画像の運用（`refs/`）

- 実物リファレンスは**開発時専用**。アプリには同梱せず、UI の「実物比較」モードは廃止した。比較は `render.mjs --compare`、パレット実測は `extract-palette.mjs`
- **リファレンス画像はリポジトリで管理しない**。ライセンスの種類にかかわらず `mkdir -p refs/private` して `refs/private/<presetKey>.<ext>` に各自で置く。`.gitignore` 対象で、`.githooks/pre-push` / Claude Code / Codex の PreToolUse 補助フック / CI・Deploy の 4 層が混入を止める。**`git add -f` しないこと**
- 新プリセット追加の手順は `docs/04-add-preset.md`（`PRESETS` / `PRESET_META` / 手元のリファレンス画像 / パレット既定値の実測 / カラーライブラリ登録 / サムネイル / 決定性スナップショット / 検証プロトタイプ。加えて PR への検証画像貼付）

### 検証プロトタイプ（`prototype/`）

`prototype/index.html` は `app-template.html` に `src/core/*` をインライン展開した単一ファイルの精度検証環境。参照画像を含まないので実物比較ペインは空で、`node prototype/build.mjs` が同時に出力する `index.local.html`（gitignore、`refs/private/` の画像を data URI で埋め込む）を開くと左右に並べて比較できる。生成ロジックは `src/core/camo.js` の 1 本が正本で、本アプリ（`src/lib/generate.ts` が ESM で import）とプロトタイプ（ビルド時にインライン展開）が同じ実装を共有する。二重実装はない。

ただしプロトタイプは `camo.js` の**スナップショット**なので、生成コアを変えたら `node prototype/build.mjs` で再ビルドする。忘れると古い実装が焼き付いたまま残るため、`tests/prototype-sync.test.ts` が `index.html` と `src/core/*` の現状を byte 比較して落とす。

## デプロイ

`main` への push（PR マージ）で `.github/workflows/deploy.yml` が `pnpm check` → `pnpm test` → `pnpm build` → `wrangler deploy` を実行し、`https://camo-generator.suemura.app` に反映する。PR では `ci.yml` が同じ検証だけを行う。
初期設定（Cloudflare API トークンの権限・GitHub Secrets）、手動再デプロイ、ロールバック、権限エラーの切り分けは `docs/03-deploy.md` を参照。

## クレジット・ライセンス注記

- 3D プレビューの環境光 HDRI は Poly Haven「Kloofendal 48d Partly Cloudy (Pure Sky)」（Greg Zaal / Jarod Guest、CC0）、布地の normal / roughness マップは ambientCG「Fabric 036」「Fabric 062」（CC0）を 512px に縮小して `public/3d/` に同梱。3D 描画は three.js（MIT）
- 実物リファレンス画像はリポジトリに含めない（`refs/private/`、gitignore）。アプリにも同梱していない
- アプリに同梱するソースマップ（`src/core/*src.js`）のうち、下記 2 つは第三者のライセンス画像を 4 値インデックス化した派生データなので帰属を表示する。他のソースマップはパブリックドメイン図案由来、それ以外のプリセットは手続き生成（`genSpots` / `genGrowth`）でソースマップを持たない
  - `src/core/jgsdf2src.js`（陸自迷彩 2 型） — [File:迷彩服2型の迷彩パターン.jpg](https://commons.wikimedia.org/wiki/File:%E8%BF%B7%E5%BD%A9%E6%9C%8D2%E5%9E%8B%E3%81%AE%E8%BF%B7%E5%BD%A9%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3.jpg)（Crescent moon 撮影、**CC BY 3.0**）に基づく
  - `src/core/dpmsrc.js`（DPM / DDPM） — [File:DPM Combat 95 Camouflage Material MOD 45149982.jpg](https://commons.wikimedia.org/wiki/File:DPM_Combat_95_Camouflage_Material_MOD_45149982.jpg)（Cpl Adrian Harlen RLC 撮影、UK MOD）に基づく。Contains public sector information licensed under the Open Government Licence v1.0
- `experimental/` の一部は [camogen](https://github.com/glederrey/camogen) (MIT) のアルゴリズムを参考にした
