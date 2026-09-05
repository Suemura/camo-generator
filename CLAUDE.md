# CLAUDE.md

このリポジトリで作業する際のガイド。

## プロジェクト概要

迷彩模様のプロシージャル生成 Web アプリ。シード決定的生成・パレット自由変更・PNG/JPG/SVG エクスポートが核。
フェーズ1（技術検証）完了、フェーズ2（仕様整理）の成果は `docs/02-spec.md`。全体の進め方と進捗は README の「進め方と進捗」を参照。
UI 実装時のデザインルールは `.claude/skills/design-system/SKILL.md`（spacious）。今後の開発予定は GitHub Issues。

## コマンド

```bash
pnpm dev                              # Vite 開発サーバー
pnpm build                            # tokens 生成 → tsc → vite build (dist/)
pnpm test                             # Vitest: 決定性テスト + index マップのハッシュスナップショット
pnpm check                            # Biome lint + format (--write で自動整形)
pnpm typecheck                        # tsc -b (noEmit)
pnpm tokens                           # docs/design/spacious-DESIGN.md → src/styles/tokens/_primitives.scss
pnpm thumbs                           # 全プリセットのサムネイル JPG を生成 (public/thumbs/<key>.jpg)。既定は新規のみ。--force で全体再生成
node tools/render.mjs <outdir> <seed> [scale]   # 全プリセットを 512px PNG で出力（目視検証用）
#   オプション: --tile (2×2 タイル) / --size=WxH / --preset=key / --crop=512 (中央を等倍切出し、高解像度の階段確認)
#             --compare (左=生成 / 右=refs/private/ の実物リファレンス。精度改善の基本ループ)
node tools/extract-palette.mjs refs/private/<key>.png 4   # 参照画像からパレット既定値を実測（UI の抽出と同じ k-means）
#   オプション: --core[=R]（領域内部の中央値）/ --flatten=SIGMA（周辺減光の平坦化）/ --blur=SIGMA（織り目の平坦化。布地写真で版の色が複数クラスタに割れるのを防ぐ）
#   オプション: --core[=R]（領域内部の中央値。輪郭の混色を除く）/ --flatten=SIGMA（周辺減光の平坦化）
node tools/analyze-spots.mjs ref refs/private/<key>.jpg <k>   # 斑点配置系の「色の空間分布」を参照と突き合わせる
node tools/analyze-spots.mjs gen <key> 0.7 1.0 2.0            # 版ごとの面積比 / 等価半径の地色比 / 塊り比（低周波の偏在）
#   kind: 'spots' のプリセットでは必須。目視では L.clump の効きすぎとスケール追従漏れを検出できない（docs/01-tech-verification.md v36）
#   r50 は参照が JPEG だとアンチエイリアスで中央値が下がる。絶対値ではなく地色比で見ること
node tools/gen-src.mjs refs/private/<key>.png src/core/<key>src.js <k> <PREFIX>   # 参照画像 → クイルト用インデックスマップ（新プリセットの図案化。面積比も出力）。k は 2..8（値数）に応じて RLE ビット幅を自動選択（k≤4 で 2bit / k>4 で 3bit）
#   オプション: --resize=N / --blur=SIGMA（織り目を落とす）/ --flatten=SIGMA / --thin=N（形態学的オープニング、幅 2N px 未満の細帯・縁取りを除去）。布地写真をリファレンスにする場合に必要（既定オフ = 従来と同一出力）
bash tools/check-private-refs.sh [rev-range]     # refs/private/ の混入検査（pre-push / PreToolUse / CI が自動で呼ぶ）
pnpm deploy                           # 緊急用の手動デプロイ。通常は main マージで .github/workflows/deploy.yml が自動デプロイ（運用は docs/03-deploy.md）
node prototype/build.mjs              # 検証プロトタイプの再ビルド (src/core を参照)。新迷彩追加・精度改善では必須（§検証プロトタイプ）
#   index.html（git 管理・参照画像なし）と index.local.html（gitignore・refs/private/ を data URI 埋め込み）を同時に出力する。
#   実物と左右比較したいときは index.local.html を開く
```

検証は「`render.mjs --compare` でレンダ → 実物リファレンスと目視比較」が基本ループ。リファレンス画像はアプリに同梱しない（UI の実物比較は廃止。`refs/README.md`）。Vitest は生成結果の**変化検知**のみ（品質は測れない）。
スナップショットが落ちたら生成結果が変わった証拠。意図した変更なら `docs/01-tech-verification.md` に追記して `pnpm test -u`。

## アーキテクチャ

- `src/core/camo.js` — 生成コア（旧 `prototype/camo.js`）。**browser / Node 共用の ES module、外部依存ゼロ、JS のまま**。型は `camo.d.ts` で与える。この制約は維持すること
  - すべての乱数は座標ハッシュ (`hash2`) または `mulberry32` によるシード決定的生成。`Math.random` 禁止（同一シード→同一出力の保証が製品要件）
  - 「形状（index マップ: `Uint8Array` の色インデックス）」と「色（パレット）」を分離。`generate()` → `{w, h, index, grid?}`、着色は `toRGBA()`。この分離がパレット自由変更の根拠なので崩さない
  - 手法は5系統: `genQuilt`（ブロブパッチ合成、M81 主力）/ `genGrowth`（クラスタ成長。デジタル系・ステンシル版系など複数用途に対応。MARPAT / UCP のクラスタ構造や、ベリョースカの階段輪郭など、色インデックスの成長で形状を表現できるパターン向け）/ `genSpots`（斑点配置、フロッグスキン系。地色に版ごとの丸い斑点を刷り重ねる手続き生成でソース図案を持たない。層の `halo` で「暗色の斑をひと回り大きい別の版が縁取る」重ね刷り構造を表現する）/ `genSplinter`（幾何ハードエッジ、スプリンター系。周期境界のパワー図で直線多角形セルに分割し、面積目標と確率 `merge` の統合で色を割り当てる。ソース図案を持たない手続き生成。`P.rain` で雨線）/ `genWoodland`・`genDigital`（ノイズ閾値、従来手法・比較用）
  - プリセットは `PRESETS` に集約。`kind` で生成関数にディスパッチ
  - `generate(key, w, h, seed, scale, opt)`。`opt.tileable`（既定 true）/ `opt.progress(0..1)` / `opt.baseMax`（長辺がこれを超えると縮小生成 → 拡大 → 実寸で後処理。v17）
  - クイルト系のソース異方サンプリングは**プリセット側**の `P.srcAspect`（既定 1.0 = 等方、`>1` で横に伸びる。CCE は M81 ソースを 1.5 倍伸長）。`opt` ではない（図案固有の性質なので URL 状態に持たせない）。ノイズ周波数倍率の `P.aspectX` / `aspectY` とは別物
  - 縞図案向け knob `P.slopeLock`（既定 false）: ソース参照の x 反転 `mx` と y 反転 `my` を独立に振ると `mx·my = -1` のパッチだけ縞の傾きが逆転し、隣接パッチで縞が折れて長距離の流れが消える。true のとき `my = mx` に固定して傾きの符号を保ち、連続する縞の流れを作る（タイガーストライプ等に必須）
- `src/core/kmeans.js` — パレット抽出の k-means（依存ゼロ JS + `kmeans.d.ts`）。ブラウザの抽出ワーカーと `tools/extract-palette.mjs` で共用
- `src/core/m81src.js` / `dcusrc.js` / `jgsdf2src.js` / `dpmsrc.js` / `auscamsrc.js` / `tigerstripesrc.js` / `brushstrokesrc.js` / `lizardsrc.js` / `digsrc.js` — 実物図案のインデックスマップ（RLE + base64）。M81 ウッドランド（`m81src.js`、4値・24KB）/ DCU（`dcusrc.js`、3値・18KB）/ 陸自迷彩 2 型（`jgsdf2src.js`、4値・24KB）/ DPM（`dpmsrc.js`、4値・22KB。DDPM は同ソースを `P.remap` で 2 値に統合）/ Auscam DPCU（`auscamsrc.js`、5値・20KB。クイルト系で唯一の 5 値で RLE は値 3bit）/ タイガーストライプ（`tigerstripesrc.js`、4値・45KB）/ ブラッシュストローク（`brushstrokesrc.js`、4値・46KB）/ リザード（`lizardsrc.js`、4値・47KB）は `camo.js` から静的 import。AOR1 / AOR2（`digsrc.js`、4値・280KB）はサイズが大きいため動的 import し、利用側が `registerSources()` で渡す（ブラウザは `src/lib/generate.ts` の `ensureSources`、Node は `tools/render.mjs` / テストで先頭登録）。目安: 数十 KB オーダー（初期バンドルへの影響が小さい）なら静的 import、100KB を大きく超えるなら動的 import。`dcusrc.js` / `jgsdf2src.js` / `dpmsrc.js` / `auscamsrc.js` / `tigerstripesrc.js` / `brushstrokesrc.js` / `lizardsrc.js` の再生成は `tools/gen-src.mjs`、m81src / digsrc は docs 記載の Python 手順
- `src/app/` — App シェル（`/about` 分岐、URL 状態フック、テーマ）。`src/components/` — UI 部品（`PresetPickerDrawer.tsx` で 4 軸タブ + タグチップ + 検索）。`src/lib/` — 状態 ⇄ URL、単位換算、生成の非同期窓口、PNG pHYs、エクスポート、共有、k-means、3D プレビュー（`scene3d.ts` が three 依存を閉じ込め、`Preview3D` が動的 import）。`src/data/` — プリセット表示メタ（`PRESET_META`: `group` で見出し、`env`/`era` で絞り込み軸、`country` は国コード。計 4 軸）+ 国コードラベル（`countries.ts`）、100 色以上のカラーライブラリ（`palette-library.json`。出典は `docs/design/palette-library-sources.md`、新プリセット追加時の登録手順は `docs/04-add-preset.md` §3）
- `src/styles/tokens/` がデザイントークン（§デザイン参照）、`src/styles/ui.scss` が共通クラス。コンポーネントの色・余白は `var(--…)` のみ、生値禁止。新しい余白値が要るときは `_semantic.scss` の `$static` に追加してから使う（未定義 var は無効値になり潰れる）
- `tools/render.mjs` — Node レンダリングハーネス。`tools/image.mjs` — Node の画像読込（sharp を動的 import）と `refs/private/` 探索。`tools/extract-palette.mjs` — パレット実測。`tools/analyze-spots.mjs` — 斑点配置系の色の空間分布の検証（参照との突き合わせ）。`tools/gen-src.mjs` — 参照画像からインデックスマップ生成（新プリセット追加時）。`tools/gen-thumbs.mjs` — 全プリセットのサムネイル JPG 生成（256px）。`tools/check-private-refs.sh` — `refs/private/` 混入検査。`tools/gen-tokens.mjs` — トークン生成
- `refs/` — 実物リファレンス画像の置き場（開発時専用、アプリ非同梱）。**画像はライセンスによらずすべて `refs/private/` に置き、リポジトリでは管理しない**。gitignore 対象で **絶対にコミット・push しない**（`.githooks/pre-push` / PreToolUse / CI の 4 層で防ぐ）
- `public/thumbs/` — プリセット選択ドロワーのサムネイル JPG（256px）。生成は `tools/gen-thumbs.mjs`（生成器自身の出力なので参照画像とは無関係）。実行時生成ではなく静的アセットとして git 管理し、新プリセット追加時・生成手法変更時にだけ再生成する（開きはじめの生成コストを避けるため）
- `prototype/app-template.html` — 検証プロトタイプの UI。`//__INLINE_CAMO__` / `//__INLINE_REFS__` マーカーに build.mjs がインライン展開する。**index.html を直接編集しない**（ビルドで上書きされる）。UI 自体を変えるのはここ
- `prototype/index.html` — ビルド成果物。単一ファイルで動く精度検証環境で、Artifact の実体（§検証プロトタイプ）。`prototype/refs.js` は参照画像の data URI 置き場だが、リポジトリでは常に空（画像を同梱しないため）
- `prototype/index.local.html` — 同じビルドの手元用。`build.mjs` が `refs/private/` の画像を 420px JPEG に落として埋め込むので実物と左右比較できる。gitignore 対象で**コミット・Artifact 再デプロイの対象にしない**
- `prototype/experimental/` — 手法探索の原本。本体に移植済みだが履歴として保持

## デザイン

- ルール: `.claude/skills/design-system/SKILL.md`（spacious）。マーカー内は `npx typeui.sh pull spacious -p claude-code -f skill` の管理領域、プロジェクト固有ルールはマーカー外に書く
- トークン 3 層: `_primitives.scss`（生成物、編集禁止）→ `_semantic.scss`（役割名、light/dark map。**色を変えるのはここ**）→ `_emit.scss`（CSS カスタムプロパティ出力）
- テーマは `<html data-theme>` で切替。`index.html` の inline script が描画前に確定する

## UI の実画面確認

`pnpm dev --port 5199` を起動し、Playwright（`channel: "chrome"` でシステムの Chrome を使う、ブラウザダウンロード不要）でスクリーンショットと書き出しファイルを検証する。デスクトップ 1440 / モバイル 390、ライト / ダーク、書き出した PNG の pHYs と SVG の rect 数を見る。各表示モード（単一 / タイル 2×2 / 3D）とモデル切り替え、WebGL 非対応時のフォールバック（Chrome の `--disable-webgl --disable-webgl2` で再現）も確認する。

## 検証ワークフロー（重要）

生成品質の変更を入れたら必ず:
1. `node tools/render.mjs <outdir> <seed> [scale]` を複数シード（1234 / 777 / 211025 など）× 複数スケール（0.7 / 1.0 / 1.5 / 2.0）で実行
2. 出力 PNG を Read で目視し、`docs/01-tech-verification.md` 記載の既知アーティファクト（ブロック感・境界急変・切断面・鏡映対称・市松ノイズ・微小点）が再発していないか確認
3. 変更内容と判断を `docs/01-tech-verification.md` に追記
4. **検証プロトタイプを更新**（下記「検証プロトタイプ（Artifact）」）

過去に解消済みの問題と対策の全履歴が同ドキュメントにある。**同じ轍を踏む前に必ず読むこと**。

## 検証プロトタイプ（Artifact）— 新迷彩の追加・精度改善では必須

生成結果をユーザーがブラウザで確認する環境は Artifact **https://claude.ai/code/artifact/3bbf14ba-1a62-4a9c-917e-0c6fbbbebfa1** （"Camo Lab"）。
実体は `prototype/index.html`（`app-template.html` に `src/core/*` をインライン展開したビルド成果物）で、生成結果と実物リファレンスを左右に並べ、シード / スケール / パレットをその場で変えられる。

**新プリセットの追加または生成精度の変更を行ったら、必ず以下を完了させてからユーザーに報告する**（プロトタイプは `camo.js` のスナップショットなので、再ビルドしないと古い生成コアが焼き付いたまま残り、検証環境とアプリの出力がずれる）:

1. `prototype/refs.js` は空のまま（参照画像は同梱しない）。左右比較は `build.mjs` が同時に出力する `index.local.html` で行う
2. `node prototype/build.mjs` で `prototype/index.html` を再ビルドする（**index.html を直接編集しない**）
3. `Artifact` ツールで `file_path: prototype/index.html` と上記 `url` を渡して**同じ URL に再デプロイ**する（`url` を省くと別 Artifact ができてリンクが変わる）
4. 報告に Artifact の URL を含める

`tests/prototype-sync.test.ts` が `index.html` と `src/core/*` の現状を byte 比較しており、再ビルド忘れは `pnpm test` で落ちる（ただし Artifact への再デプロイはテストでは検出できない）。

## 開発ハーネス（`.claude/`）

Issue → PR の定型フローは commands / agents / hooks で自走する。手順の正本は各 command ファイル。

- コマンド: `/start-issue <N>`（worktree 作成 → planner → 実装 → 検証 → docs-sync → PR 作成 → 自動レビュー）/ `/review-pr <PR>` / `/resolve-pr-comments <PR>` / `/resolve-conflicts [PR]` / `/land <N>`（マージ + worktree 後片付け）
- エージェント: `planner`（計画 + Sprint Contract）/ `pr-reviewer` → `pr-comment-resolver`（PR 作成後に自動起動）/ `reviewer`（PR を作らないタスクの独立レビュー）/ `docs-sync`（起動条件は `rules/self-review.md`）
- フック: Stop 時に `src/ tests/ tools/` のソース変更があれば `pnpm check` / `pnpm typecheck` / `pnpm test` を実行し失敗を差し戻す。`gh pr create` 成功で自動レビューフローを指示。`git push*` の前に `refs/private/` の混入を検査してブロック（`pre-push-guard.sh`）。Write/Edit 後に Biome 整形。SessionStart でマージ済み worktree を通知
- ルール: `rules/workflow-orchestration.md`（planner / subagent / 検証）、`rules/self-review.md`（独立レビューの二本立て・docs-sync ホワイトリスト）
- マージ方針: リポジトリ直下の `.gitattributes` が、行単位で独立したファイル（`tests/__snapshots__/*.snap` / `prototype/refs.js`）を `merge=union`、ビルド成果物 `prototype/index.html` を `merge=ours` にしている。並列でプリセットを追加したときの「一覧の末尾を取り合う」衝突を機械的に消すため。`merge=ours` には `git config merge.ours.driver true` が要るので、worktree を作ったら `pnpm install`（`prepare` が設定する）を必ず走らせる。詳細は `docs/04-add-preset.md` §8
- 完了条件は上記 3 コマンド成功。生成結果が変わる変更は加えて「検証ワークフロー」（render 目視 → `docs/01-tech-verification.md` 追記 → プロトタイプ再ビルド + Artifact 再デプロイ → `pnpm test -u`）。スナップショット更新と手動デプロイは ask 権限
- デプロイは main マージで GitHub Actions が自動実行する（`docs/03-deploy.md`）。`/land` でマージしたら Actions の「Deploy」が成功したことを確認する
- **main へのマージ（`gh pr merge`）は自己判断で行わない（最重要）**。ユーザーが「マージして」「land して」と PR を特定して明示的に依頼した場合に限り、実行直前に `AskUserQuestion` で PR 番号・タイトル・マージ方式を示して承認を得てから実行する。「デプロイして」「反映して」「進めて」等の間接的な依頼からマージを推測してはならない（その場合は「マージが必要。実行してよいか」を確認して止まる）。permissions の ask ダイアログは承認の代替にならない
- **main への直接 push も原則禁止**。作業は必ずブランチ + PR 経由。ユーザーから「main に直接 push して」と明示指示があった場合でも、実行前に `AskUserQuestion` で対象コミット・件数・理由を示して一度確認し、承認後にのみ実行する（`git push origin main` 等は settings の ask 権限と `pre-push-guard.sh`（main チェックアウト中の引数なし push をブロック）で二重に守っているが、ダイアログは確認の代替にならない）

## 規約

- ドキュメント・コミットメッセージは通常の日本語
- 生成アルゴリズムのコメントは「実物のどの特徴を再現する意図か」を書く（パラメータの意味だけでなく）
- リファレンス画像は全プリセットで必須（リファレンス無しの実装は不可）。ただし**リポジトリでは一切管理しない**。ライセンスによらず `refs/private/` に置き、精度改善時だけ手元で使う
- **新プリセット追加の手順は `docs/04-add-preset.md` が正本**（Issue → PR → 精度改善ループ → マージまで。チェックリスト付き）。8 点セット: `PRESETS`（camo.js）/ `PRESET_META`（presets-meta.ts、`group`・`country`（国コード: us/fr/jp など）・`env`/`era`（4 軸タグ））/ `refs/private/<key>.<ext>` / パレット既定値の実測 / **カラーライブラリ登録**（`palette-library.json` ×2 + `USE_LABEL` + `palette-library-sources.md`。同じ PR に含める）/ **サムネイル生成**（`node tools/gen-thumbs.mjs --preset=<key>`）/ 決定性スナップショット（`pnpm test -u`）/ `node prototype/build.mjs` 再ビルド + Artifact 再デプロイ（§検証プロトタイプ）。`node tools/render.mjs <out> <seed> --compare --preset=<key>` で実物と並べて確認し、検証画像は `verify-assets` ブランチに置いて PR 本文に貼る
- パレット既定値は参照画像からの実測抽出値。感覚で変えない。新プリセットの既定色はカラーライブラリにも「〜 (実測)」エントリとして登録する（公的規格の色番号が既にある色は既存エントリに `camo-<key>` タグを足す）

## 技術方針（`docs/02-spec.md` で確定）

- React 19 + Vite + TypeScript の SPA。状態の正本は URL クエリ（§2.6）
- ホスティング: Cloudflare Workers Static Assets、`camo-generator.suemura.app`。生成は完全クライアントサイド
- 高解像度対応: Web Worker 化は Issue #3。`generate()` 呼び出しは非同期の窓口関数に隠して差し替え可能にする
- デプロイ: GitHub Actions（`ci.yml` / `deploy.yml`）。手順と権限は `docs/03-deploy.md`
