# 迷彩プリセット追加ガイド

新しい迷彩プリセットを 1 つ追加して main にマージするまでの手順とチェックリスト。
Issue #21（迷彩プリセットの拡充）のサブ Issue を `/start-issue <N>` で進めるときの正本。

`AGENTS.md` は共通規約の入口。このガイドがプリセット追加・生成品質検証の正本であり、手順が変わる場合は本ガイドと関連する共通スキルを合わせる。

## 0. 全体の流れ

```
Issue（#21 のサブ Issue）
  → /start-issue <N>        worktree 作成 → planner → 実装 → 検証 → docs-sync → PR 作成 → 自動レビュー
  → ユーザーの精度検証        ローカル Camo Lab でシード・スケールを変えながら実物と比較。指摘はスクショ + シード + スケールで来る
  → 精度改善ループ            指摘 → 原因分析 → 修正 → render --compare → プロトタイプ再ビルド・ローカル確認 → push（Artifact は §5 の追加手順）
  → /resolve-conflicts <PR>  並列 Issue が先に main に入っていればマージ取り込み（スナップショット再生成）
  → /land <N>                ユーザーが PR を特定して「マージして」と言ったときだけ。AskUserQuestion で承認を得てからマージ
```

1 サブ Issue = 1 PR = 1 プリセット。新しい生成関数（`genStripe` 等）が要る迷彩は「手法 + 代表迷彩 1 種」を同じ PR にする（#21 の B 群）。

## 1. 着手前に確認すること

- **リファレンス画像が用意できるか**。リファレンス無しの実装は不可（Issue #21 共通ルール）。画像はライセンスによらず `refs/private/<key>.<ext>` に置いて手元だけで使う。リポジトリには入れない（`refs/README.md`）
- **ライセンスが派生物に及ぶか**。参照画像そのものはリポジトリに入れないが、量子化したソースマップをアプリに同梱すると派生物になる（CC BY-SA なら share-alike、CC BY / OGL なら帰属表示）。DBDU・ベリョースカは参照画像が CC BY-SA / CC BY-SA 4.0 であり、インデックスマップを同梱する派生物扱いを避けるため、参照画像を目視比較とパレット実測にのみ使い、ソースマップを作らない選択をした。代わりに `genGrowth` など既存手法のパラメータのみで生成する。同梱する派生データが出る場合は README「クレジット・ライセンス注記」と `src/app/About.tsx` に帰属を書く。同じ判断が要る迷彩は Issue の段階で方針を決める
- **商標・意匠**。MultiCam / CADPAT / M05 などは図案の複製ではなく特徴の再現にとどめ、名称は「〜風」表記にする（`src/data/presets-meta.ts` の方針、Issue #21「知的財産の注意」）
- **既存手法で作れるか**。`genQuilt`（ブロブ系）/ `genGrowth`（デジタル系）の流用で足りるなら A 群、新手法なら B 群。`docs/01-tech-verification.md`「手法の選び方」で手法を決め、「既知アーティファクト」を再発させない

## 2. 追加の 8 点セット（コードと資産）

| # | 何を | どこに | 備考 |
|---|------|--------|------|
| 1 | 生成パラメータ | `src/core/camo.js` の `PRESETS[key]` | `kind` で生成関数にディスパッチ。`ref` は参照画像のキー（= `key`）。コメントには「実物のどの特徴を再現する意図か」を書く |
| 2 | 表示メタ | `src/data/presets-meta.ts` の `PRESET_META[key]` | `label`（`{ ja, en }` 型。ja は「〜風」表記、en は `"<Name>-inspired (<designation>)"`）/ `note`（`{ ja, en }` 型。年代・色数・形状など）/ `country`（国コード: `us`, `fr`, `jp` など）/ `group`（系統: `woodland`/`desert`/`digital`/`stroke`/`geometric`/`other`）/ `env`（配備地域: 配列、1 件以上。`forest`/`jungle`/`arid`/`urban`/`marine`/`snow`/`transitional` から選択）/ `era`（採用年代: `1930s`/`1940s`/`1950s`/`1960s`/`1980s`/`1990s`/`2000s` から選択）/ `svg` |
| 3 | 参照画像 | `refs/private/<key>.<ext>`（手元のみ・非コミット） | ファイル名は `PRESETS` のキーに一致させる |
| 4 | パレット既定値 | `PRESETS[key].colors` | `node tools/extract-palette.mjs refs/private/<key>.<ext> <k> --core --spread` の実測値。感覚で決めない。`k` は製造元が公表する色数に合わせる（§4「色と版の構造を 1 回で決める」）。小面積の色が分離しないときは大きめの `k` で測って選ぶ（DBDU は k=8）。製造元の Pantone 等の色仕様は色数・名称・明度順の裏取りに使い、その sRGB 換算値は採らない |
| 5 | **カラーライブラリ登録** | `src/data/palette-library.json` + `src/data/palette.ts` | §3 参照。**PR に含める**（後追いにしない） |
| 6 | **サムネイル生成** | `public/thumbs/<key>.jpg` | `node tools/gen-thumbs.mjs [--force] [--preset=key]`。既定は既存ファイルを skip。既存プリセットは再生成不要（JPEG エンコーダ差での無意味な diff を避けるため）。生成手法を変えて見た目が変わったときだけ `--force` で全体再生成 |
| 7 | 決定性スナップショット | `tests/__snapshots__/determinism.test.ts.snap` | `pnpm test -u`。差分が新プリセットの 1 行追加だけであることを確認する（既存プリセットの行が変わっていたら共通ロジックに触っている） |
| 8 | 検証プロトタイプ | `node prototype/build.mjs` + ローカル Camo Lab 確認 | §5 参照 |

必要に応じて:

- **ソース図案**（クイルト系で実物図案を使う場合）: `node tools/gen-src.mjs refs/private/<key>.<ext> src/core/<key>src.js <k> <PREFIX>`。`k` は値数（2..8）で、RLE ビット幅は自動選択（k≤4 なら 2bit、k>4 なら 3bit）。サイズが大きければ `digsrc.js` と同じく動的 import + `registerSources()` にする（目安: 数十 KB なら静的 import、100KB 超なら動的）。既存図案の流用（CCE は M81 を `srcAspect: 1.5` で横伸長、DBDU は DCU 図案を `src: 'dcu'` で共有）も選択肢
- **色役割名**: 新しい色役割名（`PRESETS[key].colors` のインデックスに対応する名称）を `src/core/camo.js` で定義したら、`src/i18n/color-roles.ts` にも `ja → en` 対応を追加（テストが検出する）
- **専用テスト**: 新しい層や後処理を足したら、既存プリセットに波及しないことをテストで固定する（DBDU の `tests/chips.test.ts` は「`chips` を持つのは `dbdu` だけ」を検証している）
- **README**: 冒頭の対応迷彩一覧、「生成手法」表の対象列（同梱する派生データが出る場合はクレジット節も）

## 3. カラーライブラリへの登録（忘れやすい）

新プリセットの既定色はカラーライブラリ（ドロワーの規格色一覧）にも登録する。後追いにせず同じ PR に含める。

### 3.1 登録の要否と規格番号の探し方

- **公的規格の色番号が既に存在する色**（M81 / UCP の FS 595 色など）は既存エントリで代表させる。新規追加はしない。`tags.use` に新しい `camo-<key>` を足すだけでよい
- **規格番号が無い色**は「〜 (実測)」エントリとして追加する（MARPAT / AOR1 / AOR2 / DCU / DBDU がこの方式）
- 公式の色呼称・色番号（Natick color designation、陸軍色呼称など）が一次資料で見つかれば `code` に入れ、`source` に出典 URL を書く。見つからなければ index 値の順に `<key>-1`〜 を振る。hex は測色データではなく参照画像からの k-means 実測値である旨、実測コマンド、参照画像とライセンスを `source` に書く（**`source` が出典の正本**。別の文書に出典表を作らない）。探して見つからなかった規格は `docs/design/palette-library-sources.md`「公的な色番号を探して見つからなかった迷彩」に 1 行足す
- 参照画像が退色していて分離できない色は無理に登録せず、`note` に「分離できなかった」と書く（DBDU の Khaki 384）

### 3.2 エントリの書き方

```json
{
  "id": "dcu-tan492",
  "name": "DCU タン (Tan 492)",
  "nameEn": "DCU Tan (Tan 492)",
  "std": "DCU (実測)",
  "stdEn": "DCU (measured)",
  "code": "492",
  "codeEn": "492",
  "hex": "#e9d1ae",
  "tags": { "hue": "tan", "use": ["camo-3color-desert"], "country": ["us"] },
  "note": "3 色デザート (DCU) の地色。最大面積",
  "noteEn": "Ground color of 3-color desert (DCU). Largest area",
  "source": "app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から k-means 抽出)。色番号は 3 色デザートの陸軍色呼称 (https://ciehub.info/glossary/ThreeColorDesertCamouflagePattern.html)"
}
```

- `id`: `<presetKey>-<色名><番号>`。既存と重複しない
- `std`: `"<迷彩名> (実測)"`。商標名を規格のように見せない（`palette-library-sources.md`「商標・名称について」）
- `hex`: `PRESETS[key].colors` の値と**完全一致**させる（URL には hex しか無いので、`libraryByHex` の逆引きで名称を復元できるのはこの一致があるとき）
- `tags.hue`: `green | brown | tan | grey | blue | black | other`。`tags.country`: `COUNTRY_LABEL` のキー（無ければ `src/data/palette.ts` に追加）
- `*En` フィールド（`nameEn`, `stdEn`, `codeEn`, `noteEn`）: `name`, `std`, `code`, `note` に日本語が含まれるときだけ追加。日本語なしフィールド（`id`, `hex`, `tags`, `source`）には付けない

### 3.3 変更するファイル

1. `src/data/palette-library.json` にエントリを追加（末尾追記。既存エントリの順序は変えない）
2. `src/data/palette.ts` の `USE_LABEL` に `camo-<key>` の `{ ja, en }` ラベルを追加（用途タブの見出しになる。無いとタグ名がそのまま表示される）。国タグが新しければ `COUNTRY_LABEL` にも追加
3. 日本語を含む `name` / `std` / `code` / `note` には `*En` を付ける（`tests/i18n-data.test.ts` が検証する）
4. 測り方で新しい判断があったときだけ `docs/design/palette-library-sources.md`「実測で判断が要った点」に箇条書きを足す。「第 N 弾」のような追加履歴の節は作らない

総数（「132 色」等）はどこにも書かない。複数箇所に散り、色を 1 つ足すたびに全部を直す羽目になる（実際に直し漏れて食い違った）。「100 色以上」で必要な情報は伝わる。

### 3.4 確認

`pnpm dev --port 5199` + Playwright（`channel: "chrome"`）でカラーライブラリのドロワーを開き、検索（プリセット名で件数が合うか）・用途タブに新ラベルが出ることを 1440 / light で確認する。

## 4. 検証（生成品質）

`AGENTS.md`「コマンドと検証」の具体化。出力先はリポジトリ外（例: `/tmp/camo-render/`）。

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
- **`kind: 'spots'` のプリセット限定**: `node tools/analyze-spots.mjs ref refs/private/<key>.jpg <k>` で参照の版ごとの塊り比・等価半径を測り、`node tools/analyze-spots.mjs gen <key> 0.7 1.0 2.0` で生成と比較する。目視では `L.clump` の効きすぎ・スケール追従漏れが検出できない（`docs/01-tech-verification.md`「計測と指標」）。**数値は絶対値ではなく地色比で判断する**（参照が JPEG だとアンチエイリアスで中央値が下がるため）
- **`kind: 'rain'` のプリセット限定**: `node tools/analyze-rain.mjs ref refs/private/<key>.jpg` で参照の縦ダッシュ幾何を測定し、`node tools/analyze-rain.mjs gen <key> 0.7 1.0 2.0` で生成と比較する。目視では列位相・列内非重複・統計的ばらつきの再現性を検出できない
- 性能: 512px の生成時間を既存プリセットと比較し、PR 本文に書く
- **記録の置き場所**: パラメータの値と根拠は `PRESETS[key]` のコメント。検証したシード・スケール・面積比・性能は PR 本文。残課題は Issue。`docs/01-tech-verification.md` には**新しい知見だけ**を該当する節（手法の選び方 / 既知アーティファクト / 試して捨てた案 / 参照画像とパレット実測 / 計測と指標 / 決定性と互換）へ箇条書きで足す。時系列の節（vN）や作業報告は書かない。既存プリセットと同じ手順で同じ結果が出ただけなら追記しない
- **`pnpm test -u` は目視確認の後**。先にスナップショットを更新しない

### 色と版の構造を 1 回で決める手順

色調整のやり直し（MM-14 は 4 色実測 → Pantone 換算 → 5 色実測の 3 回）を避けるための順番。色は「参照写真の実測」、構造は「隣接行列」で決め、目視は最後の確認にだけ使う。

1. **色数と名称を製造元・一次資料で確定する**。Pantone / FS 番号が見つかっても、公式測色データ（FS 595 の CIELab）が無い限り **sRGB 換算値は使わない**（MM-14 の Pantone TCX 換算は褐色寄りで実物写真のどれとも合わず却下）。番号は版の数・名称・明度順の裏取りと `note` の参考情報に留める
2. **写真の不要部分を `--crop` で切る**。衣服の折り目の影帯・別の生地・背景が写り込む範囲は `--flatten` で消そうとせず切り落とす（`--flatten` は影帯を含めた平均へ正規化して最明色が沈む）。Node の sharp を手で書かず `extract-palette.mjs` / `analyze-adjacency.mjs` の `--crop=L,T,W,H` を使う
3. **`k` = 色数で `--core=R --spread` を原寸で測る**。`R` はピクセル迷彩ならセル幅の 1/3（15px セルで 5〜6）、ブロブ図案なら 2〜3。`--spread` の下位 10〜30% / 中央値 / 上位 70〜90% が 6 以上離れるクラスタは影や別の版の混入なので、最暗版は下位側・最明版は上位側を採り、その判断を `PRESETS` のコメントに書く。`k` を 1 つ増やして新しい版が出ないことも確認する（影・織り目で 1 版が割れるだけなら色数は確定）
4. **`analyze-adjacency.mjs ref` で版の隣接関係を取る**。`--minrun=1` と `--minrun=<セル幅/2>` の両方で同じ構造なら本物。行ごとに 1 列だけが 90% 以上なら入れ子、明度順の隣だけが大きければ鎖（等高線状の入れ子）、散っていれば独立した層。これが `layers` の `eat` / `seedNear` / `rim` を決める（鎖なら子の `eat` は親の版だけ + `rim: true`、`growDither: 0`）
5. **生成側も `analyze-adjacency.mjs gen <key>` と面積比で参照に合わせてから** `render.mjs --compare` を見る。行列が合っていないのに目視で「似ている」と判断しない
6. **ユーザーへの提示は `--compare` の生成側と、拡大クロップ（`--size=2048x2048 --crop=512`）**。色の印象は縮小画像では判断できない

### 布地写真をソースにするときの前処理（`--blur` / `--flatten`）とパラメータの決め方

参照がフラットなスウォッチではなく布地の写真の場合、`tools/gen-src.mjs` の前処理と `PRESETS` のパラメータを
**図案のスケールに合わせて**選ぶ必要がある。値は前例からコピーせず、毎回 stderr の量子化パレットと `frac` を見て決める。

- **`--blur=SIGMA`**（織り目の除去）: 織り目の斜め筋が色の分散として効き、k-means が設計色ではなく明度で切ってしまうのを防ぐ。
  1.0〜2.0 を試し、量子化パレットが実物の設計色に収束し、かつ RLE のラン数が落ちる値を採る（jgsdf2 は 1.2、DPM は 1.5）
- **`--flatten=SIGMA`**（照明ムラ・周辺減光の平坦化）: **sigma は図案のブロブ幅より十分大きく取る**。
  実体は「強くぼかした自分自身で割る」フラットフィールド補正なので、sigma がブロブ幅と同程度だと
  図案そのものが照明成分として推定され、大面積色の内部が補正されて色が潰れる。
  jgsdf2（ブロブ幅 50px 前後）は sigma 80 で成立したが、DPM（同 200px 前後）に 80 を使うと**砂色の面積比が 3% に潰れた**。
  DPM は 250 で安定し、400 との面積比の差は 1pt 未満
- **`kBase`**: `patchR` と**ソース図案上のブロブ幅の比**で決まる。パッチがブロブより小さいと継ぎ目がブロブ内部を横切り、
  内容の合わない箇所がパッチ輪郭の形（直線・矩形）でそのまま出る。寄って撮られた参照ほど `kBase` を上げてブロブを縮小参照する
  （M81 / jgsdf2 は 0.95〜1.1、DPM は 1.5）。1 未満（= ソースの拡大参照）にすると最近傍サンプリングで輪郭が階段化するので下限は 1
- **`topLayer` の使用可否**: `applyTopLayer` は**ソース画像の縁に接する連結成分を除外する**（縁で切れた成分を丸ごと刷ると
  直線的な断面が出るため）。参照が図案 1 リピートより狭く切り出されていると刷れる成分が枯渇し、**同じ成分が何度も反復する**
  （鏡映を含む）。採否は成分の数ではなく **usable 成分の合計面積 / 目標面積**で判断する。M81 は 0.82 で成立、DPM は 0.15 で破綻した
  （比率は `gen-src.mjs` の出力ではなくソースマップを直接ラベリングして数える）

### 線が主体の図案（縞・細線）での追加留意点

- **パレット実測は原寸で行う**: `extract-palette.mjs` の `--max-edge` 既定 256px は、UI の抽出結果と揃えるための値で、ブロブが大きい図案（M81 等）では問題にならない。しかし数 px 幅の細線が版の 1 つになっている図案では、縮小時に細線が周囲と混色して消え、**全色が中間色側へ寄る**。`--max-edge=<参照画像の長辺>` を明示して原寸で測ること
- **`patchR` を大きくしすぎない**: クイルト系の色比フィードバック（`deficit` → 候補スコアの `div` 項、重みは `divw`）はパッチを 1 枚貼るごとに働くので、**パッチ枚数が少ないと収束しない**。パッチ枚数は `2.2·(w·h)/(π·R²)`（`R = patchR / k`）でおおよそ決まり、512px キャンバスで `patchR 200` / `kBase 0.95` だと 5 枚しか貼られず、`divw` を変えても出力が 1px も変わらなくなる。線図案はソースの局所形状が「面」でないぶんパッチを大きく取る誘惑があるが、面積比を合わせたいなら 10 枚以上になる `patchR` を選ぶ
- **ソース参照の反転は `P.slopeLock` で連動させる**: 既定では x 反転と y 反転を独立に振るため、`mx·my = -1` のパッチだけ縞の傾きが逆転する。ブロブ図案では無害だが、縞図案では隣接パッチで縞が折れて長距離の流れが消える

## 5. 検証プロトタイプ（Camo Lab）の更新

Claude Code / Codex 共通の精度確認環境はローカルの Camo Lab。**新プリセット追加・生成品質変更では PR 作成前に必ず再ビルドして確認する**。生成コアを変えた後の各改善・競合統合でも繰り返す。

1. `prototype/refs.js` は空の `REFS` を保つ。参照画像は `refs/private/` からのみ読み、公開用ファイルへ含めない。
2. `node prototype/build.mjs` で `prototype/index.html` と `prototype/index.local.html` を再ビルドする。生成物は直接編集しない。
3. `prototype/index.local.html` をローカルブラウザで開き、生成と実物を比較する。参照画像を 420px JPEG の data URI で含むため、gitignore 対象であり、コミット・アップロードしない。`prototype/index.html` は参照画像を含まない git 管理の成果物。
4. ユーザーが同じ結果を開けるよう、ローカルファイルの場所、確認したプリセット・シード・スケールを報告する。`tests/prototype-sync.test.ts` は再ビルド忘れを検出するが、画質やブラウザ確認の代わりにはならない。

### 追加の Artifact 公開

既存の [Claude Artifact「Camo Lab」](https://claude.ai/code/artifact/3bbf14ba-1a62-4a9c-917e-0c6fbbbebfa1) は維持する。Artifact ツールが利用可能で、依頼または既存運用の範囲に公開が含まれる場合は追加で更新する。

- `file_path: prototype/index.html` と上記 URL を `url` に渡し、**同じ URL** へ再デプロイする。参照画像付きの `index.local.html` は渡さない。
- 別 Issue の検証が進行中なら公開のタイミングを調整する。ローカル再ビルド・確認は常に行う。
- 報告には更新結果と URL を書く。ツールがない場合は「Artifact 更新未実施」と明記する。別サービスの URL に名前を置換せず、公開成功を推測しない。

## 6. PR 本文

`.agents/skills/start-issue/SKILL.md` の PR 手順に加えて、迷彩追加の PR では以下を書く。

- 何を追加したか、実物のどの特徴をどの手法で再現したか（手法の選択理由、見送った案とその理由）
- リファレンス画像のライセンス判断（派生物の扱い）
- パラメータと `colors` の実測方法（`extract-palette.mjs` の `k`）
- **生成結果への影響**: 既存プリセットの index マップが不変であること（スナップショット差分が新プリセットの 1 行のみ）、render.mjs で確認したシード × スケール、面積比、性能
- カラーライブラリの登録内容（追加した色数と `std` / `code` の根拠）
- ローカル Camo Lab の確認方法と結果、追加の Artifact 更新有無（更新した場合は URL）

### 検証画像を PR に貼る

レンダ結果を PR 本文に埋め込むと、レビュアーもユーザーも生成結果をその場で見られる（DBDU の PR #41 で導入）。画像は main に入れず、専用の孤立ブランチ `verify-assets` に置く。

公開するのは**生成器の出力のみ**。`--compare` の実物側、`refs/private/` の画像、参照画像付きプロトタイプを、別名・結合画像・別ブランチでも公開しない。Git のパス検査は結合画像の内容まで検査できないため、公開候補を目視する。実物比較画像は手元の検証用に残す。

1. `render.mjs` で生成のみの画像を出力する。**スケール比較は ×1 / ×2 / ×5 / ×10**（`node tools/render.mjs <out> 1234 <scale> --preset=<key>` を 4 回。UI の模様スケール上限 10 まで見せる。§4 の目視用 0.7〜2.0 とは別）、加えて 3 シード × ×1、`--tile` と `--size=2048x2048 --crop=512`。生成画像同士を結合し、`<key>-generated.png`（3 シード）/ `<key>-scales.png`（×1 / ×2 / ×5 / ×10）/ `<key>-tile-crop.png` とする。
2. `git fetch origin verify-assets` の後、衝突しない一時パスへ `git worktree add --detach <一時パス> origin/verify-assets`。登録済み worktree を上書きしない。
3. 内容を確認した生成画像だけを `issue-<N>/` にコピーし、対象ファイルを選んでコミットする。`git push origin HEAD:verify-assets` で公開する。更新競合時は fetch して既存画像を保持したまま統合し、force push しない。
4. PR 本文では `https://raw.githubusercontent.com/Suemura/camo-generator/verify-assets/issue-<N>/<key>-generated.png` 等を参照する。
5. push 済みで clean な一時 worktree だけを削除する。`verify-assets` は main にマージしない。未作成なら他の作業木に影響しない場所で孤立ブランチを作る。

## 7. 精度改善ループ（PR 作成後）

PR を作ったら終わりではない。ユーザーがローカル Camo Lab（追加公開した場合は Artifact も）で確認し、違和感をスクリーンショット + シード + スケールで伝えてくる。PR 作成後に複数回の改善が入るのが普通。

- 指摘は `docs/01-tech-verification.md`「既知アーティファクト」と照合してから着手する（同じ轍を踏まない）。原因は推測せず、後処理を 1 段ずつ外す ablation で特定する
- 原因を構造的に説明できるまで分析する。「パラメータを少し変える」で済ませない（CCE の黒が緑に削られる問題は、黒を最上層の版として刷り直す `P.topLayer` という構造の変更で解消した）
- **同じ問題を持つ既存プリセットにも同じ対策を適用する**。ユーザーは「M81 でも同じ問題がある」と横展開を求める。共通ロジックを変えると既存プリセットのハッシュが変わるので、その旨を PR に書く
- 「改善したが残った」指摘（CCE の平行な細線）は、対策の効いていない原因を別に探す。修正前後の直接比較（同シード）を PR に載せる
- 各イテレーションで: render 目視 → `node prototype/build.mjs` → ローカル確認 → `pnpm test -u`（更新操作の承認条件は `AGENTS.md` に従う） → push。コミットは 1 イテレーション 1 コミットにして、レビューで差し戻せるようにする

## 8. 並列 Issue との統合とマージ

複数のサブ Issue を並列に進めると、「一覧の末尾に 1 行足す」型の変更がぶつかってコンフリクトする。
機械的に解けるものは `.gitattributes` で自動解決してあるので、手で解くのは残りだけでよい。

| ファイル | マージ方針 |
| --- | --- |
| `tests/__snapshots__/*.snap` | `merge=union`（自動）。両側の行が残る。解消後に `pnpm test` で妥当性を検証する |
| `prototype/refs.js` | `merge=union`（自動） |
| `prototype/index.html` | `merge=ours`（自動）。**マージ後に必ず `node prototype/build.mjs` で再生成する**（`tests/prototype-sync.test.ts` が忘れを検出する） |
| `src/core/camo.js` / `presets-meta.ts` / `palette.ts` / `camo.d.ts` | 手で解く。**両側を残す**（DBDU の `applyChips` と CCE の `cleanupSlivers`、`PRESETS` の両エントリなど） |
| `docs/01-tech-verification.md` | 手で解く。同じ節に両側の箇条書きを残し、重複する知見は 1 つに統合する |
| `README.md` / `AGENTS.md` / その他 docs | 手で解く。両側の記述を統合する |

`merge=ours` は git 組み込みではないため `git config merge.ours.driver true` が要る。`pnpm install` の
`prepare` が設定するので、worktree を作ったら一度 `pnpm install` すること。

- `/resolve-conflicts <PR>` で origin/main をマージ取り込みする（rebase しない）
- スナップショットは手で統合せず、マージ後に `pnpm test -u`。**自分のプリセットのハッシュが相手側の共通ロジック変更で変わる**ことがある（DBDU は CCE 側の 1px 筋除去で変わった）。`--compare` / `--tile` で劣化がないことを目視し、PR に書く
- origin/main を作業ブランチへ統合した後はプロトタイプを再ビルドし、§5 のローカル確認を行う。Artifact は同節の追加手順に従う
- **マージはユーザーが PR を特定して明示的に依頼したときだけ**。「精度検証 OK、マージして」が合図。共通 `land` スキル（Claude では `/land <N>`）の中で、利用可能な質問機構または通常の会話により PR 番号・タイトル・マージ方式を提示して承認を得る。「デプロイして」「進めて」からマージを推測しない（`.agents/rules/workflow-orchestration.md`）
- PR マージ後は対象の mergeCommit SHA に対応した GitHub Actions の Deploy 成功を確認する。共通 `land` 手順で worktree とブランチを安全に片付ける

## 9. チェックリスト（PR 作成前に自己チェック）

```
- [ ] リファレンス画像を refs/private/ に用意し（コミットしない）、同梱する派生データのライセンスを判断した
- [ ] PRESETS / PRESET_META を追加し、env / era / country（国コード）を付与、label / note は `{ ja, en }`（ja は「〜風」、en は「-inspired」表記）。新しい色役割名は src/i18n/color-roles.ts にも追加
- [ ] colors は extract-palette.mjs --core --spread の実測値（k は製造元の色数、影帯は --crop、Pantone 等の換算値は不採用）。4 色以上なら analyze-adjacency.mjs で参照と生成の隣接行列を比べた
2. `src/data/palette.ts` の `USE_LABEL` に `camo-<key>` の `{ ja, en }` ラベルを追加（用途タブの見出しになる。無いとタグ名がそのまま表示される）。国タグが新しければ `COUNTRY_LABEL` にも追加
3. 日本語を含む `name` / `std` / `code` / `note` には `*En` を付ける（`tests/i18n-data.test.ts` が検証する）
4. 測り方で新しい判断があったときだけ `docs/design/palette-library-sources.md`「実測で判断が要った点」に箇条書きを足す。「第 N 弾」のような追加履歴の節は作らない
- [ ] node tools/gen-thumbs.mjs でサムネイルを生成（public/thumbs/<key>.jpg）
- [ ] render.mjs: 3 シード × 4 スケール / --compare / --tile / --size=2048 --crop=512 を目視、既知アーティファクトなし
- [ ] 既存プリセットのスナップショットが不変（差分は新プリセットの 1 行のみ）。共通ロジックを変えた場合はその旨を明記
- [ ] 目視確認してから pnpm test -u。新しい知見があれば docs/01-tech-verification.md の該当節へ（作業報告は書かない）
- [ ] node prototype/build.mjs → ローカル Camo Lab 確認（refs.js は空、Artifact 追加更新の実施有無を記録）
- [ ] README の対応迷彩一覧・生成手法表を更新（派生データを同梱するならクレジット節と About.tsx も）
- [ ] PR 本文: 生成結果への影響 / ライセンス判断 / カラーライブラリ登録 / 生成のみの検証画像（verify-assets）/ ローカル確認方法と Artifact 更新有無
- [ ] pnpm check / typecheck / test 成功
```
