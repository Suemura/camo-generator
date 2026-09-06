# アーキテクチャ

実装上の境界と生成手法の参照資料。共通の作業規約は `AGENTS.md`、仕様は `docs/02-spec.md` を参照。

- `src/core/camo.js` — 生成コア（旧 `prototype/camo.js`）。**browser / Node 共用の ES module、外部依存ゼロ、JS のまま**。型は `camo.d.ts` で与える。この制約は維持すること
  - すべての乱数は座標ハッシュ (`hash2`) または `mulberry32` によるシード決定的生成。`Math.random` 禁止（同一シード→同一出力の保証が製品要件）
  - 「形状（index マップ: `Uint8Array` の色インデックス）」と「色（パレット）」を分離。`generate()` → `{w, h, index, grid?}`、着色は `toRGBA()`。この分離がパレット自由変更の根拠なので崩さない
  - 手法は5系統: `genQuilt`（ブロブパッチ合成、M81 主力）/ `genGrowth`（クラスタ成長。デジタル系・ステンシル版系など複数用途に対応。MARPAT / UCP のクラスタ構造や、ベリョースカの階段輪郭など、色インデックスの成長で形状を表現できるパターン向け）/ `genSpots`（斑点配置、フロッグスキン系。地色に版ごとの丸い斑点を刷り重ねる手続き生成でソース図案を持たない。層の `halo` で「暗色の斑をひと回り大きい別の版が縁取る」重ね刷り構造を、`clump` で「版ごとの低周波な偏在」を表現する。`clump` の塊寸法 `cell` は 512px・scale 1.0 基準の px で、斑と同じ単位なのでスケールに追従する。同一図案の配色替えは `FLECKTARN_LAYERS` のように層定義を 1 か所に置いて参照で共有し、`colors`（色数が減るなら `remap`）だけ差し替える）/ `genSplinter`（幾何ハードエッジ、スプリンター系。周期境界のパワー図で直線多角形セルに分割し、面積目標と確率 `merge` の統合で色を割り当てる。ソース図案を持たない手続き生成。`P.rain` で雨線）/ `genWoodland`・`genDigital`（ノイズ閾値、従来手法・比較用）
  - プリセットは `PRESETS` に集約。`kind` で生成関数にディスパッチ
  - `generate(key, w, h, seed, scale, opt)`。`opt.tileable`（既定 true）/ `opt.progress(0..1)` / `opt.baseMax`（長辺がこれを超えると縮小生成 → 拡大 → 実寸で後処理。v17）
  - クイルト系のソース異方サンプリングは**プリセット側**の `P.srcAspect`（既定 1.0 = 等方、`>1` で横に伸びる。CCE は M81 ソースを 1.5 倍伸長）。`opt` ではない（図案固有の性質なので URL 状態に持たせない）。ノイズ周波数倍率の `P.aspectX` / `aspectY` とは別物
  - 縞図案向け knob `P.slopeLock`（既定 false）: ソース参照の x 反転 `mx` と y 反転 `my` を独立に振ると `mx·my = -1` のパッチだけ縞の傾きが逆転し、隣接パッチで縞が折れて長距離の流れが消える。true のとき `my = mx` に固定して傾きの符号を保ち、連続する縞の流れを作る（タイガーストライプ等に必須）
- `src/core/kmeans.js` — パレット抽出の k-means（依存ゼロ JS + `kmeans.d.ts`）。ブラウザの抽出ワーカーと `tools/extract-palette.mjs` で共用
- `src/core/m81src.js` / `dcusrc.js` / `jgsdf2src.js` / `dpmsrc.js` / `auscamsrc.js` / `tigerstripesrc.js` / `brushstrokesrc.js` / `lizardsrc.js` / `digsrc.js` — 実物図案のインデックスマップ（RLE + base64）。M81 ウッドランド（`m81src.js`、4値・24KB）/ DCU（`dcusrc.js`、3値・18KB）/ 陸自迷彩 2 型（`jgsdf2src.js`、4値・24KB）/ DPM（`dpmsrc.js`、4値・22KB。DDPM は同ソースを `P.remap` で 2 値に統合）/ Auscam DPCU（`auscamsrc.js`、5値・20KB。クイルト系で唯一の 5 値で RLE は値 3bit）/ タイガーストライプ（`tigerstripesrc.js`、4値・45KB）/ ブラッシュストローク（`brushstrokesrc.js`、4値・46KB）/ リザード（`lizardsrc.js`、4値・47KB）は `camo.js` から静的 import。AOR1 / AOR2（`digsrc.js`、4値・280KB）はサイズが大きいため動的 import し、利用側が `registerSources()` で渡す（ブラウザは `src/lib/generate.ts` の `ensureSources`、Node は `tools/render.mjs` / テストで先頭登録）。目安: 数十 KB オーダー（初期バンドルへの影響が小さい）なら静的 import、100KB を大きく超えるなら動的 import。`dcusrc.js` / `jgsdf2src.js` / `dpmsrc.js` / `auscamsrc.js` / `tigerstripesrc.js` / `brushstrokesrc.js` / `lizardsrc.js` の再生成は `tools/gen-src.mjs`、m81src / digsrc は docs 記載の Python 手順
- `src/app/` — App シェル（`/about` 分岐、URL 状態フック、テーマ）。`src/components/` — UI 部品（`PresetPickerDrawer.tsx` で 4 軸タブ + タグチップ + 検索）。`src/lib/` — 状態 ⇄ URL、単位換算、生成の非同期窓口、PNG pHYs、エクスポート、共有、k-means、3D プレビュー（`scene3d.ts` が three 依存を閉じ込め、`Preview3D` が動的 import）。`src/data/` — プリセット表示メタ（`PRESET_META`: `group` で見出し、`env`/`era` で絞り込み軸、`country` は国コード。計 4 軸）+ 国コードラベル（`countries.ts`）、100 色以上のカラーライブラリ（`palette-library.json`。出典は `docs/design/palette-library-sources.md`、新プリセット追加時の登録手順は `docs/04-add-preset.md` §3）
- `src/workers/generate.worker.ts` — 生成を UI スレッドから分離する Worker。`src/lib/generate.ts` が起動・要求 ID・進捗・結果の受け渡しを管理し、Worker が利用できない場合のフォールバックも提供する。
- `src/styles/tokens/` がデザイントークン（`.agents/skills/design-system/SKILL.md` 参照）、`src/styles/ui.scss` が共通クラス。コンポーネントの色・余白は `var(--…)` のみ、生値禁止。新しい余白値が要るときは `_semantic.scss` の `$static` に追加してから使う（未定義 var は無効値になり潰れる）
- `tools/render.mjs` — Node レンダリングハーネス。`tools/image.mjs` — Node の画像読込（sharp を動的 import）と `refs/private/` 探索。`tools/extract-palette.mjs` — パレット実測。`tools/analyze-spots.mjs` — 斑点配置系の色の空間分布の検証（参照との突き合わせ）。`tools/gen-src.mjs` — 参照画像からインデックスマップ生成（新プリセット追加時）。`tools/gen-thumbs.mjs` — 全プリセットのサムネイル JPG 生成（256px）。`tools/check-private-refs.sh` — `refs/private/` 混入検査。`tools/gen-tokens.mjs` — トークン生成
- `refs/` — 実物リファレンス画像の置き場（開発時専用、アプリ非同梱）。**画像はライセンスによらずすべて `refs/private/` に置き、リポジトリでは管理しない**。gitignore 対象で **絶対にコミット・push しない**（`.githooks/pre-push` / PreToolUse / CI の 4 層で防ぐ）
- `public/thumbs/` — プリセット選択ドロワーのサムネイル JPG（256px）。生成は `tools/gen-thumbs.mjs`（生成器自身の出力なので参照画像とは無関係）。実行時生成ではなく静的アセットとして git 管理し、新プリセット追加時・生成手法変更時にだけ再生成する（開きはじめの生成コストを避けるため）
- `prototype/app-template.html` — 検証プロトタイプの UI。`//__INLINE_CAMO__` / `//__INLINE_REFS__` マーカーに build.mjs がインライン展開する。**index.html を直接編集しない**（ビルドで上書きされる）。UI 自体を変えるのはここ
- `prototype/index.html` — ビルド成果物。単一ファイルで動く精度検証環境で、ローカル Camo Lab と追加 Artifact 公開の実体（`docs/04-add-preset.md` §5）。`prototype/refs.js` は参照画像の data URI 置き場だが、リポジトリでは常に空（画像を同梱しないため）
- `prototype/index.local.html` — 同じビルドの手元用。`build.mjs` が `refs/private/` の画像を 420px JPEG に落として埋め込むので実物と左右比較できる。gitignore 対象で**コミット・Artifact 再デプロイの対象にしない**
- `prototype/experimental/` — 手法探索の原本。本体に移植済みだが履歴として保持
