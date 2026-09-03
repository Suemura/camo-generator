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

- **リファレンス画像が用意できるか**。リファレンス無しの実装は不可（Issue #21 共通ルール）。Wikimedia Commons で自由ライセンスの画像を探し、無ければ再配布不可の画像を `refs/private/<key>.<ext>` に置いて手元だけで使う（`refs/README.md`）
- **ライセンスが派生物に及ぶか**。CC BY-SA の画像を量子化したソースマップをアプリに同梱すると share-alike の派生物になる。DBDU ではこの理由で参照画像を目視比較とパレット実測にのみ使い、ブロブ層はパブリックドメインの DCU 図案を共有した（`docs/01-tech-verification.md` v24）。同じ判断が要る迷彩は Issue の段階で方針を決める
- **商標・意匠**。MultiCam / CADPAT / M05 などは図案の複製ではなく特徴の再現にとどめ、名称は「〜風」表記にする（`src/data/presets-meta.ts` の方針、Issue #21「知的財産の注意」）
- **既存手法で作れるか**。`genQuilt`（ブロブ系）/ `genGrowth`（デジタル系）の流用で足りるなら A 群、新手法なら B 群。`docs/01-tech-verification.md` の該当手法の節を読み、解消済みアーティファクトを再発させない

## 2. 追加の 7 点セット（コードと資産）

| # | 何を | どこに | 備考 |
|---|------|--------|------|
| 1 | 生成パラメータ | `src/core/camo.js` の `PRESETS[key]` | `kind` で生成関数にディスパッチ。`ref` は参照画像のキー（= `key`）。コメントには「実物のどの特徴を再現する意図か」を書く |
| 2 | 表示メタ | `src/data/presets-meta.ts` の `PRESET_META[key]` | `label`（「〜風」表記）/ `note`（年代・色数・形状）/ `country` / `group`（選択 UI の見出し）/ `svg` |
| 3 | 参照画像 | `refs/<key>.<ext>`（自由ライセンス）または `refs/private/<key>.<ext>` | ファイル名は `PRESETS` のキーに一致させる。`refs/` に置いたら README「クレジット・ライセンス注記」に Commons ページ・作者・ライセンスを追記 |
| 4 | パレット既定値 | `PRESETS[key].colors` | `node tools/extract-palette.mjs refs/<key>.<ext> <k>` の実測値。感覚で決めない。`k` は色数と一致させるのが基本だが、小面積の色が分離しないときは大きめの `k` で測って選ぶ（DBDU は k=8） |
| 5 | **カラーライブラリ登録** | `src/data/palette-library.json` + `docs/design/palette-library.json` + `src/data/palette.ts` + `docs/design/palette-library-sources.md` | §3 参照。**PR に含める**（後追いにしない） |
| 6 | 決定性スナップショット | `tests/__snapshots__/determinism.test.ts.snap` | `pnpm test -u`。差分が新プリセットの 1 行追加だけであることを確認する（既存プリセットの行が変わっていたら共通ロジックに触っている） |
| 7 | 検証プロトタイプ | `prototype/refs.js` の data URI + `node prototype/build.mjs` + Artifact 再デプロイ | §5 参照 |

必要に応じて:

- **ソース図案**（クイルト系で実物図案を使う場合）: `node tools/gen-src.mjs refs/<key>.<ext> src/core/<key>src.js <k> <PREFIX>`。サイズが大きければ `digsrc.js` と同じく動的 import + `registerSources()` にする。既存図案の流用（CCE は M81 を `srcAspect: 1.5` で横伸長、DBDU は DCU 図案を `src: 'dcu'` で共有）も選択肢
- **専用テスト**: 新しい層や後処理を足したら、既存プリセットに波及しないことをテストで固定する（DBDU の `tests/chips.test.ts` は「`chips` を持つのは `dbdu` だけ」を検証している）
- **README**: 冒頭の対応迷彩一覧、「生成手法」表の対象列、クレジット節

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
4. `docs/design/palette-library-sources.md` の「出典一覧」表に行を追加し、冒頭の総数（「128 色」等）を更新

総数を書いている場所も直す: README 冒頭（「〜色の規格色ライブラリ」）と CLAUDE.md「アーキテクチャ」（「〜色ライブラリ」）。

### 3.4 確認

`pnpm dev --port 5199` + Playwright（`channel: "chrome"`）でカラーライブラリのドロワーを開き、総数・検索（プリセット名で件数が合うか）・用途タブに新ラベルが出ることを 1440 / light で確認する。

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

## 5. 検証プロトタイプ（Artifact）の更新

ユーザーが精度を確認する環境は Artifact "Camo Lab"（URL は CLAUDE.md「検証プロトタイプ」）。**PR 作成前に必ず更新する**。更新が無いと「これどこで確認すればいいの?」で止まる。

1. `prototype/refs.js` に参照画像の data URI を追加する。既存と同じ 420px・JPEG quality 82 程度。`refs/<key>.<ext>` から sharp で生成し、キー名は `PRESETS[key].ref` と一致させる。`refs/private/` の画像は**プロトタイプにも入れない**（`prototype/index.html` は git 管理）
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

複数のサブ Issue を並列に進めると、`camo.js` の同じ位置への関数追加や `01-tech-verification.md` の節番号、スナップショットでコンフリクトする。

- `/resolve-conflicts <PR>` で origin/main をマージ取り込みする（rebase しない）。`camo.js` は**両側の関数を残す**（DBDU の `applyChips` と CCE の `cleanupSlivers`）。`01-tech-verification.md` は時系列に両方残し、自分の節番号を繰り下げる
- スナップショットは手で統合せず、マージ後に `pnpm test -u`。**自分のプリセットのハッシュが相手側の共通ロジック変更で変わる**ことがある（DBDU は CCE 側の 1px 筋除去で変わった）。`--compare` / `--tile` で劣化がないことを目視し、vN 節に「統合」小節として書く
- マージ後にプロトタイプを再ビルドし、Artifact を再デプロイする
- **マージはユーザーが PR を特定して明示的に依頼したときだけ**。「精度検証 OK、マージして」が合図。`/land <N>` の中で `AskUserQuestion` により PR 番号・タイトル・マージ方式を提示して承認を得る。「デプロイして」「進めて」からマージを推測しない（`.claude/rules/workflow-orchestration.md`）
- マージ後は GitHub Actions の Deploy 成功を確認し、`/land` で worktree とブランチを片付ける

## 9. チェックリスト（PR 作成前に自己チェック）

```
- [ ] リファレンス画像を用意し、ライセンスと派生物の扱いを判断した（refs/ なら README クレジット節を更新）
- [ ] PRESETS / PRESET_META を追加し、名称は「〜風」表記
- [ ] colors は extract-palette.mjs の実測値
- [ ] カラーライブラリに登録した（palette-library.json ×2 / USE_LABEL / palette-library-sources.md / 総数表記）
- [ ] render.mjs: 3 シード × 4 スケール / --compare / --tile / --size=2048 --crop=512 を目視、既知アーティファクトなし
- [ ] 既存プリセットのスナップショットが不変（差分は新プリセットの 1 行のみ）。共通ロジックを変えた場合はその旨を明記
- [ ] docs/01-tech-verification.md に vN 節を追記してから pnpm test -u
- [ ] prototype/refs.js に data URI 追加 → node prototype/build.mjs → Artifact を同じ URL に再デプロイ
- [ ] README の対応迷彩一覧・生成手法表・クレジット節を更新
- [ ] PR 本文: 生成結果への影響 / ライセンス判断 / カラーライブラリ登録 / 検証画像（verify-assets）/ Artifact URL
- [ ] pnpm check / typecheck / test 成功
```

## 残課題

- CCE の 4 色（ライトカーキ / グリーン / ブラウン / ブラック）がカラーライブラリに未登録。フランス CE 迷彩の色に公的規格番号は見つかっていないため、「CCE (実測)」+ `camo-cce` タグで登録する
- 検証画像の結合（`--compare` / スケール並置 / タイル + クロップ）は毎回 sharp のスクリプトを書いている。`tools/` に定型化する余地がある
