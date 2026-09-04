# 迷彩プリセット追加ガイド

新しい迷彩プリセットを 1 つ追加して main にマージするまでの手順とチェックリスト。
Issue #21（迷彩プリセットの拡充）のサブ Issue を `/start-issue <N>` で進めるときの正本で、
DCU（#23 / PR #39）・CCE（#25 / PR #40）・DBDU（#24 / PR #41）の 3 件を追加したセッションから、
「毎回やること」と「ユーザーに指摘されて後追いになったこと」を抽出して手順化した。

CLAUDE.md の各節（検証ワークフロー / 検証プロトタイプ / 規約）はこのガイドの要約であり、食い違ったら本ガイドを直してから CLAUDE.md を合わせる。

## 0. 全体の流れ

```
Issue（#21 のサブ Issue）
  → /start-issue <N>        worktree 作成 → planner → 実装 → 検証 → docs-sync → PR 作成 → 自動レビュー
  → ユーザーの精度検証        Artifact（Camo Lab）でシード・スケールを変えながら実物と比較。指摘はスクショ + シード + スケールで来る
  → 精度改善ループ            指摘 → 原因分析 → 修正 → render --compare → 01-tech-verification に vN 追記 → プロトタイプ再ビルド + 再デプロイ → push
  → /resolve-conflicts <PR>  並列 Issue が先に main に入っていればマージ取り込み（スナップショット再生成）
  → /land <N>                ユーザーが PR を特定して「マージして」と言ったときだけ。AskUserQuestion で承認を得てからマージ
```

1 サブ Issue = 1 PR = 1 プリセット。新しい生成関数（`genStripe` 等）が要る迷彩は「手法 + 代表迷彩 1 種」を同じ PR にする（#21 の B 群）。

## 1. 着手前に確認すること

- **リファレンス画像が用意できるか**。リファレンス無しの実装は不可（Issue #21 共通ルール）。画像はライセンスによらず `refs/private/<key>.<ext>` に置いて手元だけで使う。リポジトリには入れない（`refs/README.md`）
- **ライセンスが派生物に及ぶか**。参照画像そのものはリポジトリに入れないが、量子化したソースマップをアプリに同梱すると派生物になる（CC BY-SA なら share-alike、CC BY / OGL なら帰属表示）。DBDU・ベリョースカは参照画像が CC BY-SA / CC BY-SA 4.0 であり、インデックスマップを同梱する派生物扱いを避けるため、参照画像を目視比較とパレット実測にのみ使い、ソースマップを作らない選択をした。代わりに `genGrowth` など既存手法のパラメータのみで生成する（`docs/01-tech-verification.md` v24 v30）。同梱する派生データが出る場合は README「クレジット・ライセンス注記」と `src/app/About.tsx` に帰属を書く。同じ判断が要る迷彩は Issue の段階で方針を決める
- **商標・意匠**。MultiCam / CADPAT / M05 などは図案の複製ではなく特徴の再現にとどめ、名称は「〜風」表記にする（`src/data/presets-meta.ts` の方針、Issue #21「知的財産の注意」）
- **既存手法で作れるか**。`genQuilt`（ブロブ系）/ `genGrowth`（デジタル系）の流用で足りるなら A 群、新手法なら B 群。`docs/01-tech-verification.md` の該当手法の節を読み、解消済みアーティファクトを再発させない

## 2. 追加の 8 点セット（コードと資産）

| # | 何を | どこに | 備考 |
|---|------|--------|------|
| 1 | 生成パラメータ | `src/core/camo.js` の `PRESETS[key]` | `kind` で生成関数にディスパッチ。`ref` は参照画像のキー（= `key`）。コメントには「実物のどの特徴を再現する意図か」を書く |
| 2 | 表示メタ | `src/data/presets-meta.ts` の `PRESET_META[key]` | `label`（「〜風」表記）/ `note`（年代・色数・形状）/ `country`（国コード: `us`, `fr`, `jp` など）/ `group`（選択 UI の見出し）/ `env`（配備地域: 配列、1 件以上。`forest`/`jungle`/`arid`/`urban`/`transitional` から選択）/ `era`（採用年代: `1950s`/`1960s`/`1980s`/`1990s`/`2000s` から選択）/ `svg` |
| 3 | 参照画像 | `refs/private/<key>.<ext>`（手元のみ・非コミット） | ファイル名は `PRESETS` のキーに一致させる |
| 4 | パレット既定値 | `PRESETS[key].colors` | `node tools/extract-palette.mjs refs/private/<key>.<ext> <k>` の実測値。感覚で決めない。`k` は色数と一致させるのが基本だが、小面積の色が分離しないときは大きめの `k` で測って選ぶ（DBDU は k=8） |
| 5 | **カラーライブラリ登録** | `src/data/palette-library.json` + `docs/design/palette-library.json` + `src/data/palette.ts` + `docs/design/palette-library-sources.md` | §3 参照。**PR に含める**（後追いにしない） |
| 6 | **サムネイル生成** | `public/thumbs/<key>.jpg` | `node tools/gen-thumbs.mjs [--force] [--preset=key]`。既定は既存ファイルを skip。既存プリセットは再生成不要（JPEG エンコーダ差での無意味な diff を避けるため）。生成手法を変えて見た目が変わったときだけ `--force` で全体再生成 |
| 7 | 決定性スナップショット | `tests/__snapshots__/determinism.test.ts.snap` | `pnpm test -u`。差分が新プリセットの 1 行追加だけであることを確認する（既存プリセットの行が変わっていたら共通ロジックに触っている） |
| 8 | 検証プロトタイプ | `node prototype/build.mjs` + Artifact 再デプロイ | §5 参照 |

必要に応じて:

- **ソース図案**（クイルト系で実物図案を使う場合）: `node tools/gen-src.mjs refs/private/<key>.<ext> src/core/<key>src.js <k> <PREFIX>`。`k` は値数（2..8）で、RLE ビット幅は自動選択（k≤4 なら 2bit、k>4 なら 3bit）。サイズが大きければ `digsrc.js` と同じく動的 import + `registerSources()` にする（目安: 数十 KB なら静的 import、100KB 超なら動的）。既存図案の流用（CCE は M81 を `srcAspect: 1.5` で横伸長、DBDU は DCU 図案を `src: 'dcu'` で共有）も選択肢
- **専用テスト**: 新しい層や後処理を足したら、既存プリセットに波及しないことをテストで固定する（DBDU の `tests/chips.test.ts` は「`chips` を持つのは `dbdu` だけ」を検証している）
- **README**: 冒頭の対応迷彩一覧、「生成手法」表の対象列（同梱する派生データが出る場合はクレジット節も）

## 3. カラーライブラリへの登録（忘れやすい）

新プリセットの既定色はカラーライブラリ（ドロワーの規格色一覧）にも登録する。
DCU / DBDU はこの手順が PR に含まれておらず、ユーザーの指摘で後追いになった（コミット `a7f5abc`）。
CCE の 4 色は 2026-09-04 時点で未登録（残課題、§9）。

### 3.1 登録の要否と規格番号の探し方

- **公的規格の色番号が既に存在する色**（M81 / UCP の FS 595 色など）は既存エントリで代表させる。新規追加はしない。`tags.use` に新しい `camo-<key>` を足すだけでよい
- **規格番号が無い色**は「〜 (実測)」エントリとして追加する（MARPAT / AOR1 / AOR2 / DCU / DBDU がこの方式）
- 公式の色呼称・色番号（Natick color designation、陸軍色呼称など）が一次資料で見つかれば `code` に入れ、`source` に出典 URL を書く。hex は測色データではなく参照画像からの k-means 実測値である旨を `source` に明記する
- 参照画像が退色していて分離できない色は無理に登録せず、`note` に「分離できなかった」と書く（DBDU の Khaki 384）

### 3.2 エントリの書き方

```json
{
  "id": "dcu-tan492",
  "name": "DCU タン (Tan 492)",
  "std": "DCU (実測)",
  "code": "492",
  "hex": "#e9d1ae",
  "tags": { "hue": "tan", "use": ["camo-3color-desert"], "country": ["us"] },
  "note": "3 色デザート (DCU) の地色。最大面積",
  "source": "app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から k-means 抽出)。色番号は 3 色デザートの陸軍色呼称 (https://ciehub.info/glossary/ThreeColorDesertCamouflagePattern.html)"
}
```

- `id`: `<presetKey>-<色名><番号>`。既存と重複しない
- `std`: `"<迷彩名> (実測)"`。商標名を規格のように見せない（`palette-library-sources.md`「商標・名称について」）
- `hex`: `PRESETS[key].colors` の値と**完全一致**させる（URL には hex しか無いので、`libraryByHex` の逆引きで名称を復元できるのはこの一致があるとき）
- `tags.hue`: `green | brown | tan | grey | black | other`。`tags.country`: `COUNTRY_LABEL` のキー（無ければ `src/data/palette.ts` に追加）

### 3.3 変更するファイル（4 か所を同期する）

1. `src/data/palette-library.json` にエントリを追加（末尾追記。既存エントリの順序は変えない）
2. `docs/design/palette-library.json` を同じ内容にする（`src/data` 側のコピー元。`src/data` 側は Biome が整形するため byte 一致はしない。JSON としてパースして等価かを確認する）
3. `src/data/palette.ts` の `USE_LABEL` に `camo-<key>` のラベルを追加（用途タブの見出しになる。無いとタグ名がそのまま表示される）
4. `docs/design/palette-library-sources.md` の「出典一覧」表に行を追加（**総数は書かない**。「100 色以上」で足りる。数値を書くと追加のたびに 4 箇所を直す羽目になり、直し漏れで嘘になる）

総数（「132 色」等）はどこにも書かない。README・CLAUDE.md・`docs/02-spec.md`・`palette-library-sources.md` の 4 箇所に散り、色を 1 つ足すたびに全部を直す羽目になる（実際に直し漏れて食い違った）。「100 色以上」で必要な情報は伝わる。

### 3.4 確認

`pnpm dev --port 5199` + Playwright（`channel: "chrome"`）でカラーライブラリのドロワーを開き、検索（プリセット名で件数が合うか）・用途タブに新ラベルが出ることを 1440 / light で確認する。

## 4. 検証（生成品質）

CLAUDE.md「検証ワークフロー」の具体化。出力先はリポジトリ外（例: `/tmp/camo-render/`）。

```bash
# 複数シード × 複数スケール（512px）
for s in 1234 777 211025; do for k in 0.7 1.0 1.5 2.0; do
  node tools/render.mjs /tmp/camo-render/$s-$k $s $k --preset=<key>; done; done
node tools/render.mjs /tmp/camo-render/cmp 1234 --compare --preset=<key>     # 左=生成 / 右=実物
node tools/render.mjs /tmp/camo-render/tile 1234 --tile --preset=<key>       # 2×2 タイル継ぎ目
node tools/render.mjs /tmp/camo-render/hi 1234 --size=2048x2048 --crop=512 --preset=<key>   # 等倍クロップ（階段・ギザ）
```

- 出力 PNG を Read で目視し、既知アーティファクト（ブロック感・境界急変・切断面・鏡映対称・市松ノイズ・微小点）の再発を確認する
- 面積比を 3 シードで記録する（`gen-src.mjs` が出すソース図案の面積比と比べる）
- 性能: 512px の生成時間を既存プリセットと比較して記録する
- `docs/01-tech-verification.md` に **vN 節を追記**（目的 / 手法の選択理由 / パラメータ / 検証 / 残課題）。節番号は main の最新 +1。並列 Issue が先にマージされて番号が衝突したら、自分の節を繰り下げる（DBDU は v20 → v24）
- **`pnpm test -u` は追記の後**。先にスナップショットを更新しない

### 布地写真をソースにするときの前処理（`--blur` / `--flatten`）とパラメータの決め方

参照がフラットなスウォッチではなく布地の写真の場合、`tools/gen-src.mjs` の前処理と `PRESETS` のパラメータを
**図案のスケールに合わせて**選ぶ必要がある。値は前例からコピーせず、毎回 stderr の量子化パレットと `frac` を見て決める。

- **`--blur=SIGMA`**（織り目の除去）: 織り目の斜め筋が色の分散として効き、k-means が設計色ではなく明度で切ってしまうのを防ぐ。
  1.0〜2.0 を試し、量子化パレットが実物の設計色に収束し、かつ RLE のラン数が落ちる値を採る（jgsdf2 は 1.2、DPM は 1.5）
- **`--flatten=SIGMA`**（照明ムラ・周辺減光の平坦化）: **sigma は図案のブロブ幅より十分大きく取る**。
  実体は「強くぼかした自分自身で割る」フラットフィールド補正なので、sigma がブロブ幅と同程度だと
  図案そのものが照明成分として推定され、大面積色の内部が補正されて色が潰れる。
  jgsdf2（ブロブ幅 50px 前後）は sigma 80 で成立したが、DPM（同 200px 前後）に 80 を使うと**砂色の面積比が 3% に潰れた**。
  DPM は 250 で安定し、400 との面積比の差は 1pt 未満（`docs/01-tech-verification.md` v25 / v26 に条件別の比較表がある）
- **`kBase`**: `patchR` と**ソース図案上のブロブ幅の比**で決まる。パッチがブロブより小さいと継ぎ目がブロブ内部を横切り、
  内容の合わない箇所がパッチ輪郭の形（直線・矩形）でそのまま出る。寄って撮られた参照ほど `kBase` を上げてブロブを縮小参照する
  （M81 / jgsdf2 は 0.95〜1.1、DPM は 1.5）。1 未満（= ソースの拡大参照）にすると最近傍サンプリングで輪郭が階段化するので下限は 1
- **`topLayer` の使用可否**: `applyTopLayer` は**ソース画像の縁に接する連結成分を除外する**（縁で切れた成分を丸ごと刷ると
  直線的な断面が出るため）。参照が図案 1 リピートより狭く切り出されていると刷れる成分が枯渇し、**同じ成分が何度も反復する**
  （鏡映を含む）。採否は成分の数ではなく **usable 成分の合計面積 / 目標面積**で判断する。M81 は 0.82 で成立、DPM は 0.15 で破綻した
  （比率は `gen-src.mjs` の出力ではなくソースマップを直接ラベリングして数える。v26 に両者の比較表がある）

### 線が主体の図案（縞・細線）での追加留意点

- **パレット実測は原寸で行う**: `extract-palette.mjs` の `--max-edge` 既定 256px は、UI の抽出結果と揃えるための値で、ブロブが大きい図案（M81 等）では問題にならない。しかし数 px 幅の細線が版の 1 つになっている図案では、縮小時に細線が周囲と混色して消え、**全色が中間色側へ寄る**。`--max-edge=<参照画像の長辺>` を明示して原寸で測ること（タイガーストライプの実例は `docs/01-tech-verification.md` v30）
- **`patchR` を大きくしすぎない**: クイルト系の色比フィードバック（`deficit` → 候補スコアの `div` 項、重みは `divw`）はパッチを 1 枚貼るごとに働くので、**パッチ枚数が少ないと収束しない**。パッチ枚数は `2.2·(w·h)/(π·R²)`（`R = patchR / k`）でおおよそ決まり、512px キャンバスで `patchR 200` / `kBase 0.95` だと 5 枚しか貼られず、`divw` を変えても出力が 1px も変わらなくなる。線図案はソースの局所形状が「面」でないぶんパッチを大きく取る誘惑があるが、面積比を合わせたいなら 10 枚以上になる `patchR` を選ぶ
- **ソース参照の反転は `P.slopeLock` で連動させる**: 既定では x 反転と y 反転を独立に振るため、`mx·my = -1` のパッチだけ縞の傾きが逆転する。ブロブ図案では無害だが、縞図案では隣接パッチで縞が折れて長距離の流れが消える

## 5. 検証プロトタイプ（Artifact）の更新

ユーザーが精度を確認する環境は Artifact "Camo Lab"（URL は CLAUDE.md「検証プロトタイプ」）。**PR 作成前に必ず更新する**。更新が無いと「これどこで確認すればいいの?」で止まる。

1. 参照画像は**プロトタイプに入れない**（`prototype/refs.js` は空の `REFS` を保ち、`prototype/index.html` は git 管理）。左右比較は `node prototype/build.mjs` が同時に出力する `prototype/index.local.html`（gitignore、`refs/private/` の画像を 420px JPEG の data URI で埋め込む）で行う
2. `node prototype/build.mjs` で `prototype/index.html` を再ビルドする（直接編集しない）
3. `Artifact` ツールに `file_path: prototype/index.html` と既存 URL を `url` で渡し、同じ URL に再デプロイする
4. 報告に Artifact の URL を書く

精度改善ループの各イテレーションでも 2 と 3 を繰り返す。別 Issue のユーザー検証が Artifact 上で進行中なら、再デプロイのタイミングだけユーザーに合わせる（生成コアは共通なので、再ビルドは常に行う）。

## 6. PR 本文

`.claude/commands/start-issue.md` 手順 10 に加えて、迷彩追加の PR では以下を書く。

- 何を追加したか、実物のどの特徴をどの手法で再現したか（手法の選択理由、見送った案とその理由）
- リファレンス画像のライセンス判断（派生物の扱い）
- パラメータと `colors` の実測方法（`extract-palette.mjs` の `k`）
- **生成結果への影響**: 既存プリセットの index マップが不変であること（スナップショット差分が新プリセットの 1 行のみ）、render.mjs で確認したシード × スケール、面積比、性能
- カラーライブラリの登録内容（追加した色数と `std` / `code` の根拠）
- Artifact の URL

### 検証画像を PR に貼る

レンダ結果を PR 本文に埋め込むと、レビュアーもユーザーも生成結果をその場で見られる（DBDU の PR #41 で導入）。画像は main に入れず、専用の孤立ブランチ `verify-assets` に置く。

```bash
# 1. 貼る画像を作る（--compare / 複数スケールの並置 / --tile と --crop を sharp で 1 枚ずつに結合）
#    ファイル名は <key>-compare.png / <key>-scales.png / <key>-tile-crop.png に揃える
# 2. verify-assets ブランチに Issue 番号のディレクトリで置く（作業ツリーを汚さないよう一時 worktree を使う）
git fetch origin verify-assets
git worktree add /tmp/verify-assets origin/verify-assets
mkdir -p /tmp/verify-assets/issue-<N> && cp /tmp/camo-render/pr/*.png /tmp/verify-assets/issue-<N>/
git -C /tmp/verify-assets add issue-<N> && git -C /tmp/verify-assets commit -m "chore: Issue #<N> (<迷彩名>) の検証画像を追加"
git -C /tmp/verify-assets push origin HEAD:verify-assets
git worktree remove /tmp/verify-assets
# 3. PR 本文から参照する
#    ![生成 vs 実物](https://raw.githubusercontent.com/Suemura/camo-generator/verify-assets/issue-<N>/<key>-compare.png)
```

`verify-assets` は main にマージしない置き場。初回作成時は `git checkout --orphan verify-assets` で作った。

## 7. 精度改善ループ（PR 作成後）

PR を作ったら終わりではない。ユーザーが Artifact で確認し、違和感をスクリーンショット + シード + スケールで伝えてくる。CCE では PR 作成後に 3 回の改善（v21 → v22 → v23）が入った。

- 指摘は `docs/01-tech-verification.md` の既知アーティファクト一覧と照合してから着手する（同じ轍を踏まない）
- 原因を構造的に説明できるまで分析する。「パラメータを少し変える」で済ませない（CCE の黒が緑に削られる問題は、黒を最上層の版として刷り直す `P.topLayer` という構造の変更で解消した）
- **同じ問題を持つ既存プリセットにも同じ対策を適用する**。ユーザーは「M81 でも同じ問題がある」と横展開を求める。共通ロジックを変えると既存プリセットのハッシュが変わるので、その旨を vN 節と PR に書く
- 「改善したが残った」指摘（CCE の平行な細線）は、対策の効いていない原因を別に探す。修正前後の直接比較（同シード）を vN 節に載せる
- 各イテレーションで: render 目視 → vN 追記 → `node prototype/build.mjs` → Artifact 再デプロイ → `pnpm test -u` → push。コミットは 1 イテレーション 1 コミットにして、レビューで差し戻せるようにする

## 8. 並列 Issue との統合とマージ

複数のサブ Issue を並列に進めると、「一覧の末尾に 1 行足す」型の変更がぶつかってコンフリクトする。
機械的に解けるものは `.gitattributes` で自動解決してあるので、手で解くのは残りだけでよい。

| ファイル | マージ方針 |
| --- | --- |
| `tests/__snapshots__/*.snap` | `merge=union`（自動）。両側の行が残る。解消後に `pnpm test` で妥当性を検証する |
| `prototype/refs.js` | `merge=union`（自動） |
| `prototype/index.html` | `merge=ours`（自動）。**マージ後に必ず `node prototype/build.mjs` で再生成する**（`tests/prototype-sync.test.ts` が忘れを検出する） |
| `src/core/camo.js` / `presets-meta.ts` / `palette.ts` / `camo.d.ts` | 手で解く。**両側を残す**（DBDU の `applyChips` と CCE の `cleanupSlivers`、`PRESETS` の両エントリなど） |
| `docs/01-tech-verification.md` | 手で解く。時系列に両方残し、自分の節番号を繰り下げる |
| `README.md` / `CLAUDE.md` / その他 docs | 手で解く。両側の記述を統合する |

`merge=ours` は git 組み込みではないため `git config merge.ours.driver true` が要る。`pnpm install` の
`prepare` が設定するので、worktree を作ったら一度 `pnpm install` すること。

- `/resolve-conflicts <PR>` で origin/main をマージ取り込みする（rebase しない）
- スナップショットは手で統合せず、マージ後に `pnpm test -u`。**自分のプリセットのハッシュが相手側の共通ロジック変更で変わる**ことがある（DBDU は CCE 側の 1px 筋除去で変わった）。`--compare` / `--tile` で劣化がないことを目視し、vN 節に「統合」小節として書く
- マージ後にプロトタイプを再ビルドし、Artifact を再デプロイする
- **マージはユーザーが PR を特定して明示的に依頼したときだけ**。「精度検証 OK、マージして」が合図。`/land <N>` の中で `AskUserQuestion` により PR 番号・タイトル・マージ方式を提示して承認を得る。「デプロイして」「進めて」からマージを推測しない（`.claude/rules/workflow-orchestration.md`）
- マージ後は GitHub Actions の Deploy 成功を確認し、`/land` で worktree とブランチを片付ける

## 9. チェックリスト（PR 作成前に自己チェック）

```
- [ ] リファレンス画像を refs/private/ に用意し（コミットしない）、同梱する派生データのライセンスを判断した
- [ ] PRESETS / PRESET_META を追加し、env / era / country（国コード）を付与、名称は「〜風」表記
- [ ] colors は extract-palette.mjs の実測値
- [ ] カラーライブラリに登録した（palette-library.json ×2 / USE_LABEL / palette-library-sources.md の出典表）
- [ ] node tools/gen-thumbs.mjs でサムネイルを生成（public/thumbs/<key>.jpg）
- [ ] render.mjs: 3 シード × 4 スケール / --compare / --tile / --size=2048 --crop=512 を目視、既知アーティファクトなし
- [ ] 既存プリセットのスナップショットが不変（差分は新プリセットの 1 行のみ）。共通ロジックを変えた場合はその旨を明記
- [ ] docs/01-tech-verification.md に vN 節を追記してから pnpm test -u
- [ ] node prototype/build.mjs → Artifact を同じ URL に再デプロイ（refs.js は空のまま）
- [ ] README の対応迷彩一覧・生成手法表を更新（派生データを同梱するならクレジット節と About.tsx も）
- [ ] PR 本文: 生成結果への影響 / ライセンス判断 / カラーライブラリ登録 / 検証画像（verify-assets）/ Artifact URL
- [ ] pnpm check / typecheck / test 成功
```

## 残課題

- CCE の 4 色（ライトカーキ / グリーン / ブラウン / ブラック）がカラーライブラリに未登録。フランス CE 迷彩の色に公的規格番号は見つかっていないため、「CCE (実測)」+ `camo-cce` タグで登録する
- 検証画像の結合（`--compare` / スケール並置 / タイル + クロップ）は毎回 sharp のスクリプトを書いている。`tools/` に定型化する余地がある
