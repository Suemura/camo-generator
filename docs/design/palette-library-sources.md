# パレットライブラリ 出典一覧

`palette-library.json` に収録した色の hex 値の出典と、採用方針・注意事項をまとめる。仕様は `docs/02-spec.md` §3.3、迷彩プリセット追加時の登録手順は `docs/04-add-preset.md` §3 を参照。

## 収録方針

- 名称・コードは公的規格のみを主キーとする: FS 595 (米連邦規格) / AMS-STD-595A / RAL (独) / BS 381C (英) / ソ連規格名 (4BO, 7K) / 日本陸海軍の標準色名 / 防衛省規格 NDS Z 8201E。模型塗料の品番 (Tamiya TS-/XF-, Mr.Color C-) は `note` の「〜相当」に留める。
- FS 595 系は GSA が公開する FED-STD-595C の測色データ (D65 CIELab) を sRGB に変換した値を採用した。市販の「FS 595 hex チャート」は出典不明かつ相互に食い違うため、一次データ由来の値に統一している。hextoral / e-paint 等が掲載する値とほぼ一致する。
- RAL Classic は encycolorpedia の換算値、RAL F9 (連邦軍迷彩色) は nuancier-ral の換算値を採用した。RAL 7028 Dunkelgelb は RAL Classic 廃番のため模型塗料の画面近似値を採用し、`source` に approx. と明記した。
- BS 381C は scalemates の BS 381C パレットの値を採用した。
- 公式 sRGB 値が存在しない色 (4BO / 7K / 日本陸海軍色 / 陸自 OD 色) は、研究者・模型誌で通説となっている FS 近似色またはマンセル値を経由して換算し、`source` に approx. と明記した。
- アプリのプリセット (MARPAT / AOR1 / AOR2 / DCU / DBDU / 陸自迷彩 2 型 / DPM / DDPM) は公的規格の色番号が存在しないため、`src/core/camo.js` の実測パレット (Wikimedia Commons 参照画像からの抽出値) をそのまま収録した。M81 と UCP は FS 595 の公式色番号が存在するため FS 系エントリで代表させている。新しい迷彩プリセットを追加したら、その既定色も同じ方式で登録する (`docs/04-add-preset.md` §3)。
- 陸自迷彩 2 型については、車両用塗料の NDS Z 8201E 3414 / 3606 は規格として公開されているが**被服 (迷彩服) 4 色の色指定は公表されていない** (防衛省規格目録に「迷彩」の規格は存在せず、日塗工番号との公式対応もない) ため、生地の実測値を収録し、塗料色エントリとは別物として `note` に明記した。
- タグは色味 (hue) / 用途 (use) / 国 (country) の 3 軸。用途タグの camo-* はアプリのプリセット名に対応する。

## 第2弾（模型塗料ラインナップをモチーフ索引として追加）

第1弾 50 色に 70 色を追記した (id 順は追記順、第1弾の 50 エントリは無変更)。

### 方法

- GSI クレオス Mr.カラー (C-1〜C-137、C-301〜C-395 FS/BS シリーズ、C-511〜C-609 特色) およびタミヤ (TS / XF / AS / LP) のラインナップを **モチーフの索引としてのみ** 使った。各塗料が「どの国・軍種・時代のどの標準色を再現したものか」を洗い出し、その標準色 (FS 595 / BS 381C / RLM / RAL / NDS Z 8201E / ソ連 AMT / IDF 慣用名) を収録対象にした。
- 塗料メーカーの商品名・色名・解説文は引用せず、hex もメーカーサイトからは取っていない。品番は `note` の「C-xx / XF-xx 相当」という短い対照情報に留めた。
- hex の取得元は規格ごとに第1弾と同じ系統に揃えた:
  - FS 595: GSA FED-STD-595C 測色データ (D65 CIELab) を sRGB 変換 (第1弾と同一の変換式。fs34079 = #555548 等で一致を確認)。
  - BS 381C: IPMS(UK) の Digital BS381C Colour Chart (W.S. Marshall 2022) 記載の Hex。同 PDF は CIELab / Munsell / NCS を併記しており、第1弾で使った scalemates 値 (641 = #484838) と 1 以内で一致する。
  - RLM: 公式 sRGB 値が存在しないため、同著者の Digital RLM Colours chart (HyperScale 掲載) の Hex を採用し、すべて approx. とした。
  - RAL Classic 現行色: Wikipedia "List of RAL colours" の Hex。RAL 廃番色 (8020 / 7027) は模型塗料の画面近似 (scalemates) を採用し approx. とした (第1弾の RAL 7028 と同じ扱い)。
  - 防衛省規格 NDS Z 8201E: 規格書記載のマンセル値を Munsell 再表色データ (光源 C) → Bradford 適応 (D65) → sRGB で換算 (colour-science ライブラリ)。第1弾の jsdf-od-2314 (#49483e) を同手順で再計算すると #4a473d となり整合する。
  - 日本陸海軍機色・ソ連 AMT 色・IDF 色: 研究者・模型誌で通説の FS 近似番号を経由し、FED-STD-595C 測色値を変換。すべて approx.。
- 収録を見送ったモチーフ: 旧海軍工廠別軍艦色 (呉/佐世保/舞鶴/横須賀。マンセル値等の公開一次資料が見つからず)、陸軍戦車色 (土地色/草色/枯草色/土草色。FS・マンセル対照が公開文献に無い)、ソ連 AMT-11 / AMT-12 (FS 近似番号 26190 / 27003 が 595C 未収録)、イタリア Giallo/Verde Mimetico・フランス Vert Armée (公的番号も信頼できる換算値も無し)。

### 近似重複の判断

hex が既存エントリと各チャネル 6 以内に入った組。いずれも別の規格・別の番号で、色が偶然近いだけと判断し、独立したエントリとして追加した (`note` に相互参照を記載したものは ※)。

- `fs36231` #7f8587 ↔ `fs36270` #848a8d (Δ6)
- `fs34097` #5d6249 ↔ `ija-noryokushoku` #575c43 (Δ6)
- `fs34097` #5d6249 ↔ `aor2-green` #5c6844 (Δ6)
- `fs36176` #6d7882 ↔ `fs36173` #6f787f (Δ3) ※
- `fs36251` #828585 ↔ `fs36231` #7f8587 (Δ3) ※
- `bs381c-629` #737a80 ↔ `fs36173` #6f787f (Δ4)
- `bs381c-629` #737a80 ↔ `fs36176` #6d7882 (Δ6)
- `bs381c-285` #57564a ↔ `fs34079` #555548 (Δ2) ※
- `bs381c-285` #57564a ↔ `fs34102` #595b45 (Δ5)
- `bs381c-285` #57564a ↔ `su-4bo` #595b45 (Δ5)
- `bs381c-298` #515041 ↔ `fs34094` #4f5444 (Δ4)
- `bs381c-298` #515041 ↔ `ral8027` #544c42 (Δ4)
- `bs381c-632` #686e71 ↔ `bs381c-638` #686c71 (Δ2) ※
- `bs381c-676` #9fa9ac ↔ `fs36375` #9aa5ab (Δ5)
- `bs381c-634` #626353 ↔ `marpat-w-lgreen` #5d6656 (Δ5)
- `rlm71` #535842 ↔ `fs34079` #555548 (Δ6)
- `rlm71` #535842 ↔ `fs34102` #595b45 (Δ6)
- `rlm71` #535842 ↔ `fs34094` #4f5444 (Δ4)
- `rlm71` #535842 ↔ `su-4bo` #595b45 (Δ6)
- `rlm71` #535842 ↔ `ija-noryokushoku` #575c43 (Δ4)
- `rlm74` #575a56 ↔ `fs36081` #575a5a (Δ4)
- `rlm75` #65686c ↔ `bs381c-638` #686c71 (Δ5)
- `rlm75` #65686c ↔ `bs381c-632` #686e71 (Δ6)
- `rlm81` #4c3d37 ↔ `ral6014` #474135 (Δ5)
- `rlm83` #4a4d40 ↔ `jsdf-od-2314` #49483e (Δ5)
- `rlm83` #4a4d40 ↔ `marpat-w-dgreen` #454c40 (Δ5)
- `ral7008` #746643 ↔ `marpat-d-brown` #7a6749 (Δ6)
- `ral7008` #746643 ↔ `aor1-brown` #776140 (Δ5)
- `ijn-nakajima-green` #4e534e ↔ `ijn-anryokushoku` #4c4e48 (Δ6)
- `ijn-nakajima-green` #4e534e ↔ `fs34092` #495951 (Δ6)
- `ija-hairyokushoku` #a09c8f ↔ `marpat-d-lsand` #9e9e8d (Δ2) ※
- `jsdf-dgreen-3414` #434941 ↔ `jsdf-od-2314` #49483e (Δ6)
- `jsdf-dgreen-3414` #434941 ↔ `marpat-w-dgreen` #454c40 (Δ3) ※
- `jsdf-dgreen-3414` #434941 ↔ `ral6006` #40433b (Δ6)
- `jsdf-brown-3606` #5c5243 ↔ `fs30051` #5b4d45 (Δ5)
- `su-amt4` #595b45 ↔ `fs34079` #555548 (Δ6)
- `su-amt4` #595b45 ↔ `fs34102` #595b45 (Δ0) ※
- `su-amt4` #595b45 ↔ `su-4bo` #595b45 (Δ0) ※
- `su-amt4` #595b45 ↔ `ija-noryokushoku` #575c43 (Δ2) ※
- `su-amt4` #595b45 ↔ `bs381c-285` #57564a (Δ5)
- `su-amt4` #595b45 ↔ `rlm71` #535842 (Δ6)
- `idf-sinai-grey-82` #676865 ↔ `fs34160` #676962 (Δ3) ※

特記:

- `su-amt4` は FS 34102 近似のため `fs34102` / `su-4bo` と完全に同じ hex になる。ソ連 WWII 航空機色 AMT-4 と車両色 4BO は別の塗料規格であり、パレット選択 UI で別名として提示する価値があるため残した。
- `fs34088` (OD CARC) は `fs34087` (旧 OD) の改番だが、595C 測色値は #675e4c と大幅に明るく、流布する 34087 の hex チャート値 #3c3421 とは別物として扱う。
- `bs381c-629` は RAF Ocean Grey の BS 381C 上の近似番号であり、Ocean Grey そのものではない。`fs36173` / `fs36176` と近接するが規格が異なる。

## 第3弾（迷彩プリセット追加に伴う実測色: DCU / DBDU）

アプリに 3 カラーデザート (DCU、Issue #23) と 6 カラーデザート (DBDU、Issue #24) のプリセットを追加したのに合わせ、両プリセットの既定色 8 色を追記した (コミット `a7f5abc`)。以後、迷彩プリセットを追加したら同じ手順で既定色を登録する (`docs/04-add-preset.md` §3)。

### 方法

- 第1弾の MARPAT / AOR と同じく、`std` は「〜 (実測)」とし、hex は `src/core/camo.js` の `PRESETS[key].colors` (Wikimedia Commons 参照画像からの k-means 実測値) と完全一致させている。URL には hex しか入らないため、この一致がカラーライブラリ名称の逆引き (`libraryByHex`) の前提になる。
- `code` には公式の色呼称の番号を入れた。DBDU は Natick/Belvoir の報告書 "Evaluation of Desert Camouflage Uniforms by Ground Observers" §2.1 に記載の Natick color designation (Light Tan 379 / Tan 380 / Light Brown 381 / Dark Brown 382 / Black 383 / Khaki 384)、DCU は 3 色デザートの陸軍色呼称 (Tan 492 / Brown 493 / Khaki 494)。hex はこれらの測色データではなく参照画像の実測値である旨を `source` に明記した。
- DBDU の Khaki 384 は登録していない。参照画像 (退色した実物写真、CC BY-SA 3.0) では地の Tan 380 と分離できなかったため。`dbdu-tan380` の `note` にその旨を記載。
- 用途タグ `camo-3color-desert` (既存) / `camo-6color-desert` (新規) を付け、`src/data/palette.ts` の `USE_LABEL` にラベル「6 色デザート (チョコチップ)」を追加した。
- 未登録のプリセット既定色: CCE (Issue #25) の 4 色。フランス CE 迷彩の色に公的規格番号は見つかっておらず、「CCE (実測)」+ `camo-cce` タグで登録する予定 (`docs/04-add-preset.md` 残課題)。

## 第4弾（迷彩プリセット追加に伴う実測色: 陸自迷彩 2 型）

アプリに陸自迷彩 2 型（Issue #28）のプリセットを追加したのに合わせ、既定色 4 色を追記した。

### 方法

- 第3弾と同じく `std` は「陸自迷彩 2 型 (実測)」、hex は `src/core/camo.js` の `PRESETS.jgsdf2.colors` と完全一致させている
- **公式の色指定を探したが存在しなかった**。防衛省規格 NDS Z 8201E（[PDF](https://www.mod.go.jp/atla/nds/Z/Z8201E.pdf)）に載る `3414 濃緑色(迷彩用) 7.5GY 3/1` / `3606 茶色(迷彩用) 2.5Y 3.5/1.5` は**車両・機体の塗料色**で、既に `jsdf-dgreen-3414` / `jsdf-brown-3606` として第2弾で収録済み。防衛省規格目録（令和 7 年 12 月現在）に「迷彩」を含む規格は 1 件もなく、被服の色は個別の調達仕様書（非公開）で規定されている。日塗工番号との公式対応、模型塗料メーカーの公表 hex（タミヤ XF-72 / XF-73 は車両色で、メーカー自身が Web 表示色を「近似」と否認）、camopedia 等の資料サイトの hex もいずれも存在しない
- したがって `code` に入れられる公式番号がないため、index 値の順に `type2-1`〜`type2-4` を振った（DCU / DBDU のような Natick color designation に相当するものがない）
- 参照画像が布地の写真なので、パレット実測にも `--flatten`（周辺減光の平坦化）と `--core`（領域内部の中央値）を使った。コマンドは `node tools/extract-palette.mjs refs/jgsdf2.jpg 4 --core --flatten=80`。詳細は `docs/01-tech-verification.md` v25
- 用途タグ `camo-jgsdf2`（新規）を付け、`src/data/palette.ts` の `USE_LABEL` にラベル「陸自迷彩 2 型」を追加した
- 近接する既存エントリ: `jgsdf2-green` #5e775c は車両色 `jsdf-dgreen-3414` #434941 と 20 以上離れており別色。`jgsdf2-brown` #74524e ↔ `jsdf-brown-3606` #5c5243 も同様（生地の染色色と塗料色の違い）

## 第5弾（迷彩プリセット追加に伴う実測色: DPM / DDPM）

アプリに英軍 DPM とデザート DPM（Issue #26）のプリセットを追加したのに合わせ、既定色 4 + 2 色を追記した。

### 方法

- `std` は「DPM (実測)」「DDPM (実測)」、hex は `src/core/camo.js` の `PRESETS.dpm.colors` / `PRESETS.ddpm.colors` と完全一致させている
- 英国防省は DPM の色を仕様書（被服の調達仕様）で規定しているが公表されておらず、BS 381C にも DPM の被服色は無い。したがって `code` は index 値の順に `dpm-1`〜`dpm-4` / `ddpm-1`〜`ddpm-2` を振った
- DPM の参照画像は英国防省の布地接写写真（OGL v1.0）で、右側が暗い照明ムラがある。パレット実測は `tools/gen-src.mjs refs/dpm.jpg … 4 DPM --resize=800 --blur=1.5 --flatten=250` の量子化重心（ソース図案と同じ前処理・同じ k-means）を採った。`extract-palette.mjs --core` は照明ムラで砂色が明部 / 暗部の 2 クラスタに割れ、k=4 では黒とブラウンが分離しなかったため。詳細は `docs/01-tech-verification.md` v26
- DDPM はフラットなスキャンなので `node tools/extract-palette.mjs refs/ddpm.jpg 2 --core` をそのまま使った
- 用途タグは既存の `camo-dpm`（ラベル「DPM」。従来は descriptive の `khaki` のみが持っていた）と新規の `camo-ddpm`（`src/data/palette.ts` の `USE_LABEL` に「デザート DPM (DDPM)」を追加）
- 近接する既存エントリ: `dpm-sand` #d8a858 は `bs381c-362` Middle Stone #ac7c42 と 40 以上離れており別色。`khaki` #c3b091 も同様（参照写真の照明が暖色寄りである影響を含む。残課題は v26 節）

## 第6弾（迷彩プリセット追加に伴う実測色: CADPAT / 07 式 / EMR）

アプリにデジタル系派生 3 種（Issue #30）のプリセットを追加したのに合わせ、既定色 12 色を追記した。

### 方法

- これまでと同じく `std` は「CADPAT (実測)」「07 式 (実測)」「EMR (実測)」とし、hex は `src/core/camo.js` の `PRESETS[key].colors` と完全一致させている
- **3 種とも公的な色番号が見つからなかった**ため、`code` には index 値の順に `cadpat-1`〜`cadpat-4` / `type07-1`〜`type07-4` / `emr-1`〜`emr-4` を振った。CADPAT の色指定はカナダ国防省の非公開仕様、07 式は中国人民解放軍の内部規格、EMR はロシア国防省の調達仕様で、いずれも公表資料がない
- 参照画像がいずれも合成スウォッチ（布地写真ではない）なので `--flatten` は使わず、`--core=2`（領域内部の中央値）と `--max-edge` を原寸に上げた実測のみを行った。コマンドは各エントリの `source` に記載
- 例外は `pla07-brown`。参照画像が JPEG で、細い茶の筆致がリンギングにより暗く濁って k-means の重心が灰側へ流れる。筆致内部（近傍 5×5 がすべて暖色）の中央値 #605645 を採った。詳細は `docs/01-tech-verification.md` v27
- 用途タグ `camo-cadpat` / `camo-pla07` / `camo-emr`（いずれも新規）を付け、`src/data/palette.ts` の `USE_LABEL` にラベルを追加した。国タグ `ca` / `cn` も新規なので `COUNTRY_LABEL` に追加した
- 近接する既存エントリ: `cadpat-mgreen` #525d3c は `fs34079` #555548 と近いが、CADPAT は緑側に寄っており別色として登録した

## 第7弾（迷彩プリセット追加に伴う実測色: フロッグスキン 両面）

アプリにフロッグスキン風（M1942、Issue #29）のプリセットを追加したのに合わせ、ジャングル面 5 色 + ビーチ面 4 色を追記した。

### 方法

- 第3弾・第4弾と同じく `std` は「フロッグスキン (実測)」、hex は `src/core/camo.js` の `PRESETS.frogskin.colors` と完全一致させている
- **公的な色番号は見つからなかった**。M1942 の捺染色は当時の Quartermaster Corps の仕様書で定義されているが、Natick color designation（DCU / DBDU にある 3 桁番号）に相当する公開データは存在しない。したがって `code` には index 値の順に `m1942-1`〜`m1942-5` を振った
- 参照画像が布地の接写写真なので、パレット実測に `--blur`（織り目の平坦化）と `--core`（領域内部の中央値）を使った。コマンドは `node tools/extract-palette.mjs refs/frogskin.jpg 12 --core=2 --max-edge=610 --blur=2`。**k を色数より多く取る**のは、織り目と陰影が 1 つの版の色を 2〜3 クラスタに割るため。役割ごとに内部画素数が最大のクラスタを採用した。`--blur` 無しではブラウンが 3 分裂して代表色が定まらない。詳細は `docs/01-tech-verification.md` v27
- 用途タグ `camo-frogskin`（新規）を付け、`src/data/palette.ts` の `USE_LABEL` にラベル「フロッグスキン (M1942)」を追加した
- 近接する既存エントリ: `frogskin-dgreen` #576b44 は `jgsdf2-green` #5e775c と 20 以上離れており別色。`frogskin-brown` #7e6043 も DCU / DBDU の褐色系（#8f590b / #704c44）とは十分離れている
- 参照画像は CC BY-SA 3.0 のため、この画像から派生したソースマップはアプリに同梱していない（形状は手続き生成）。実測した hex は「事実の記述」であって画像の派生物ではないという整理で、DBDU（第3弾）と同じ扱い

### ビーチ面（リバーシブルの裏面）

- M1942 は両面リバーシブルで、ジャングル面（淡緑地 5 色）の裏がビーチ面（淡タン地）。ビーチ面は**インク 4 色**（クリーム / カーキ / グリーン / ブラウン）で、`code` は `m1942b-1`〜`m1942b-4`
- 文献（Wikipedia "Frog skin"）はビーチ面を「淡タン地に褐色の 3 色」と記述するが、入手した実物スウォッチは緑を含む 4 色だった。M1942 の生産は複数の製造元・時期にまたがり配色に幅があるため、**実測を優先**して 4 色で登録した。この差異は `docs/01-tech-verification.md` v27 にも記載
- 参照スウォッチは**再配布できないため `refs/private/` に置き、リポジトリには含めない**（`.gitignore` + 4 層の push 防止）。平坦なスウォッチなので `--flatten` / `--blur` は不要で、コマンドは `node tools/extract-palette.mjs refs/private/frogskin_beach.jpg 4 --core=2 --max-edge=294`。k を 6 まで上げても内部画素を持つクラスタは 4 つのままで、インクが 4 色であることの裏付けになる
- 用途タグはジャングル面と共通の `camo-frogskin`（両面が同じ被服なので 1 つのタブにまとめる）
- ジャングル面との比較: ビーチ面のグリーン #979467 はジャングル面のダークグリーン #576b44 より明るく黄味が強い。ブラウン #a98c6a も #7e6043 より明るい

## 第8弾（迷彩プリセット追加に伴う実測色: オーストラリア DPCU / Auscam）

アプリに Auscam（Issue #27）のプリセットを追加したのに合わせ、既定色 5 色を追記した。

### 方法

- `std` は「オーストラリア DPCU (実測)」、hex は `src/core/camo.js` の `PRESETS.auscam.colors` と完全一致させている
- **公的な色指定は見つからなかった**。オーストラリア国防省の被服仕様（DEF(AUST) 系）は公開されておらず、DPCU の 5 色に対応する規格番号・測色値の一次資料は存在しない。したがって `code` は index 値の順に `auscam-1`〜`auscam-5` を振った（陸自迷彩 2 型と同じ扱い）
- 参照画像が着用中の布地写真なので、パレット実測には `--core`（領域内部の中央値）と `--flatten`（照明ムラの平坦化）を使った。コマンドは `node tools/extract-palette.mjs refs/auscam.jpg 5 --core --flatten=60`
- **参照写真は全体が青寄りに転んでおり、ダークグリーンが青緑 #2d4d57 として実測される**。実物の DPCU のダークグリーンはより緑寄りだが、規約どおり感覚での補正はせず実測値のまま登録した。より中立な光源のリファレンスが入手できたら再実測する（`docs/01-tech-verification.md` v29 の残課題）
- 用途タグ `camo-auscam`（新規）を付け、`src/data/palette.ts` の `USE_LABEL` にラベル「オーストラリア DPCU」、`COUNTRY_LABEL` に `au`「オーストラリア」を追加した
- 近接する既存エントリ（RGB 距離で確認）: `auscam-midbrown` #765d3e は `aor1-brown` #776140 と距離 4.6 でほぼ同色、`auscam-sand` #a8a996 は `bs381c-210 Sky` #adaf97 と距離 7.9。いずれも由来（被服の染色色 / 航空機塗料）と用途タグが異なるため別エントリとして登録し、統合はしていない。他の 3 色は最近接でも距離 13 以上で独立している

## 第9弾（迷彩プリセット追加に伴う実測色: タイガーストライプ）

アプリにタイガーストライプ風（Issue #31）のプリセットを追加したのに合わせ、4 色を追記した。

### 方法

- `std` は「タイガーストライプ (実測)」、hex は `src/core/camo.js` の `PRESETS.tigerstripe.colors` と完全一致させている
- 公的な色番号は見つからなかった。ベトナム戦争期の現地製・私物調達が主で統一仕様書が存在しないため、`code` には index 値の順に `tiger-1`〜`tiger-4` を振った
- コマンドは `node tools/extract-palette.mjs refs/private/tigerstripe.webp 4 --max-edge=771 --core=2`。参照はフラットなスウォッチなので `--blur` / `--flatten` は不要
- **`--max-edge` を既定の 256 のままにしてはならない**。この図案はグリーン面の内部を走るライトカーキの細線が 1〜2px しかなく、256px に縮小すると細線が周囲と混色して消え、4 色すべてが暗側へ寄る（`#303230 / #474b40 / #5a5f4c / #75725d`）。原寸 771px で測ると `#2e3131 / #515d49 / #6f6953 / #9d977d` になり、明度のレンジが実物どおりに開く
- 用途タグ `camo-tigerstripe`（新規）を付け、`src/data/palette.ts` の `USE_LABEL` にラベル「タイガーストライプ」を追加した。国タグは `us` と `vn`（`COUNTRY_LABEL` に `vn: "ベトナム"` を新設）
- 近接する既存エントリ: `tigerstripe-green` #515d49 は `frogskin-dgreen` #576b44 と黄味の差で区別でき、`tigerstripe-khaki` #6f6953 は `m81-brown` #5f5345 より明るく緑寄り。いずれも統合せず別エントリとした
- 参照スウォッチは**再配布できないため `refs/private/` に置き、リポジトリには含めない**（`.gitignore` + 4 層の push 防止）

## 第10弾（迷彩プリセット追加に伴う実測色: NWU Type I）

アプリに NWU Type I 風（米海軍、Issue #53）のプリセットを追加したのに合わせ、既定色 4 色を追記した。ライブラリで初の青系の被服色になる。

### 方法

- `std` は「NWU Type I (実測)」、hex は `src/core/camo.js` の `PRESETS.nwu1.colors` と完全一致させている
- **公的な色番号は見つからなかった**。NWU の色は米海軍の被服調達仕様（NAVSUP / Natick）で規定されるが、4 色に対応する FS 595 番号や測色値の一次資料は公開されていない。したがって `code` は index 値の順に `nwu1-1`〜`nwu1-4` を振った（CADPAT / EMR と同じ扱い）
- 参照画像はフラットなスウォッチなので `--flatten` は使わず、`node tools/extract-palette.mjs refs/private/nwu1.jpg 4 --core` の実測のみを行った。素の k-means 重心だと最小面積（約 4%）のダークネイビーが地色との混色に吸収されて #3d4a57 まで持ち上がるため、`--core`（領域内部の中央値）が必須
- **`hue` タグに青が無い**（`green` / `brown` / `tan` / `grey` / `black` / `other` の 6 分類）。地色のネイビーブルー #4f5d77 は `other`、グレー #7f919a とライトブルー #c2d6dd は `grey`、ダークネイビー #333f46 は `black` に割り当てた。青系のプリセットが増えたら `hue` に `blue` を追加して振り直す
- 用途タグ `camo-nwu1`（新規）を付け、`src/data/palette.ts` の `USE_LABEL` にラベル「NWU Type I」を追加した。国タグ `us` は既存
- 近接する既存エントリ（RGB 距離で確認）: `nwu1-grey` #7f919a は `bs381c-637 Medium Sea Grey` #899194 と距離 11.7、`nwu1-darknavy` #333f46 は `fs35042 Sea Blue` #3d454a と距離 12.3、`nwu1-navy` #4f5d77 は `fs36118 Gunship Gray` #5a6269 と距離 18.5、`nwu1-lightblue` #c2d6dd は `pla07-lgray` #d8d7dc と距離 22.0。近い相手はいずれも航空機・艦艇の塗料色で、由来（被服の染色色）と用途タグが異なるため Auscam と同じく別エントリとして登録し、統合はしていない

## 出典一覧

| id | 規格・コード | hex | 出典 |
|---|---|---|---|
| `fs34079` | FS 595 34079 | #555548 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30118` | FS 595 30118 | #705b42 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs33303` | FS 595 33303 | #a19074 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs37030` | FS 595 37030 | #363738 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs37038` | FS 595 37038 | #373838 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34087` | FS 595 34087 | #3c3421 | FS 595 hex chart 転載 (https://www.perbang.dk/rgb/3c3421/)。595C 未収録のため換算値は目安 |
| `fs30219` | FS 595 30219 | #917360 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34102` | FS 595 34102 | #595b45 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36375` | FS 595 36375 | #9aa5ab | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36118` | FS 595 36118 | #5a6269 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs35237` | FS 595 35237 | #7a888e | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34094` | FS 595 34094 | #4f5444 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs20150` | FS 595 20150 | #7c6852 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34160` | FS 595 34160 | #676962 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs24165` | FS 595 24165 | #6d6f6a | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs26260` | FS 595 26260 | #8a8981 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs23525` | FS 595 23525 | #bfb3a4 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `ams34076` | AMS-STD-595A 34076 | #605b50 | approx.: https://hextoral.com/hex-color/605b50/ams-std-595a/ (規格チップ由来の画面近似) |
| `khaki` | descriptive khaki | #c3b091 | https://en.wikipedia.org/wiki/Khaki (色見本 #C3B091) |
| `ral7028` | RAL 7028 | #9a8953 | approx.: https://www.scalemates.com/colors/ak-real-colors--799/rc060-dunkelgelb-dark-yellow-ral-7028-acrylic-lacquer-matt--13173 (画面近似 #9a8953) |
| `ral6003` | RAL 6003 | #4b573e | https://encycolorpedia.com/ (RAL 6003) #4b573e |
| `ral8017` | RAL 8017 | #44322d | https://encycolorpedia.com/ (RAL 8017) #44322d |
| `ral7021` | RAL 7021 | #2e3234 | https://encycolorpedia.com/ (RAL 7021) #2e3234 |
| `ral6031` | RAL 6031 | #495746 | https://encycolorpedia.com/ (RAL 6031) #495746 |
| `ral8027` | RAL 8027 | #544c42 | https://nuancier-ral.com/en/ral-8027-maroon-camouflage-otan #544C42 (F9 迷彩色。他源に #5a4a3d 前後の値もあり) |
| `ral9021` | RAL 9021 | #151618 | https://nuancier-ral.com/en/ral-9021-black-camouflage-otan-tar #151618 (他源に #3e3f3c もあり。マット黒のため差が大きい) |
| `ral6014` | RAL 6014 | #474135 | https://encycolorpedia.com/ (RAL 6014) #474135 |
| `su-4bo` | ソ連規格 4BO | #595b45 | approx.: FS 34102 近似説 (https://www.tankarchives.com/2014/01/soviet-camouflage.html, Vallejo 71.017 表記) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `su-7k` | ソ連規格 7K | #d7c2a0 | approx.: FS 33578 近似 (https://kawarthascalemodellers.com/soviet-colors-in-the-great-patriotic-war/) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `bs381c-641` | BS 381C 641 | #484838 | https://www.scalemates.com/colors/palette.php?id=4 (BS 381C palette) #484838 |
| `bs381c-450` | BS 381C 450 | #745f46 | https://www.scalemates.com/colors/palette.php?id=4 (BS 381C palette) #745f46 |
| `ija-noryokushoku` | IJA 標準色 濃緑色 | #575c43 | approx.: FS 34082 近似 (http://www.aviationofjapan.com/2017/04/vallejo-ija-colors-set-visual-appraisal.html) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `ijn-anryokushoku` | IJN 仮規格 117 D1 | #4c4e48 | approx.: FS 34052 近似 (https://j-aircraft.com/faq/IJNAF_Colors.htm) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `jsdf-od-2314` | NDS Z 8201E 2314 | #49483e | approx.: NDS Z 8201E 標準色 2314 (マンセル 7.5Y 3/1, https://www.mod.go.jp/atla/nds/Z/Z8201E.pdf) を CIELab 経由で sRGB 換算 |
| `marpat-w-tan` | MARPAT (実測) woodland-1 | #7e6a58 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-w-lgreen` | MARPAT (実測) woodland-2 | #5d6656 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-w-dgreen` | MARPAT (実測) woodland-3 | #454c40 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-w-black` | MARPAT (実測) woodland-4 | #32323a | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-d-lsand` | MARPAT (実測) desert-1 | #9e9e8d | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-d-sand` | MARPAT (実測) desert-2 | #8c8873 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-d-brown` | MARPAT (実測) desert-3 | #7a6749 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `marpat-d-dbrown` | MARPAT (実測) desert-4 | #63462d | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor1-ltan` | AOR1 (実測) aor1-1 | #b5a78c | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor1-tan` | AOR1 (実測) aor1-2 | #958268 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor1-brown` | AOR1 (実測) aor1-3 | #776140 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor1-dbrown` | AOR1 (実測) aor1-4 | #5b442b | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor2-tan` | AOR2 (実測) aor2-1 | #a39678 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor2-khaki` | AOR2 (実測) aor2-2 | #7f7852 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor2-green` | AOR2 (実測) aor2-3 | #5c6844 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `aor2-black` | AOR2 (実測) aor2-4 | #2b2220 | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像から抽出) |
| `fs36081` | FS 595 36081 | #575a5a | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34092` | FS 595 34092 | #495951 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36270` | FS 595 36270 | #848a8d | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36320` | FS 595 36320 | #8a959d | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36622` | FS 595 36622 | #c3c1b4 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs33531` | FS 595 33531 | #c9b49e | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36231` | FS 595 36231 | #7f8587 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34097` | FS 595 34097 | #5d6249 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs35042` | FS 595 35042 | #3d454a | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs35164` | FS 595 35164 | #61727f | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36440` | FS 595 36440 | #aeada3 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36173` | FS 595 36173 | #6f787f | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36176` | FS 595 36176 | #6d7882 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36251` | FS 595 36251 | #828585 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34088` | FS 595 34088 | #675e4c | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs34151` | FS 595 34151 | #68633c | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs33613` | FS 595 33613 | #eac6a2 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs36495` | FS 595 36495 | #c3c8c7 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs37875` | FS 595 37875 | #e4e5da | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30051` | FS 595 30051 | #5b4d45 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30257` | FS 595 30257 | #b8895c | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30099` | FS 595 30099 | #685649 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30277` | FS 595 30277 | #9b8971 | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30117` | FS 595 30117 | #805d4d | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs35189` | FS 595 35189 | #6f868c | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `fs30279` | FS 595 30279 | #ae917f | GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `bs381c-637` | BS 381C 637 | #899194 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 899194 (同 PDF の CIELab 値と整合) |
| `bs381c-638` | BS 381C 638 | #686c71 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 686C71 (同 PDF の CIELab 値と整合) |
| `bs381c-640` | BS 381C 640 | #4d5459 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 4D5459 (同 PDF の CIELab 値と整合) |
| `bs381c-629` | BS 381C 629 | #737a80 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 737A80 (同 PDF の CIELab 値と整合) |
| `bs381c-627` | BS 381C 627 | #b0b1aa | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex B0B1AA (同 PDF の CIELab 値と整合) |
| `bs381c-210` | BS 381C 210 | #adaf97 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex ADAF97 (同 PDF の CIELab 値と整合) |
| `bs381c-283` | BS 381C 283 | #75816b | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 75816B (同 PDF の CIELab 値と整合) |
| `bs381c-285` | BS 381C 285 | #57564a | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 57564A (同 PDF の CIELab 値と整合) |
| `bs381c-298` | BS 381C 298 | #515041 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 515041 (同 PDF の CIELab 値と整合) |
| `bs381c-361` | BS 381C 361 | #be9e73 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex BE9E73 (同 PDF の CIELab 値と整合) |
| `bs381c-362` | BS 381C 362 | #ac7c42 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex AC7C42 (同 PDF の CIELab 値と整合) |
| `bs381c-632` | BS 381C 632 | #686e71 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 686E71 (同 PDF の CIELab 値と整合) |
| `bs381c-676` | BS 381C 676 | #9fa9ac | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 9FA9AC (同 PDF の CIELab 値と整合) |
| `bs381c-634` | BS 381C 634 | #626353 | IPMS(UK) Digital BS381C Colour Chart (W.S. Marshall 2022, http://ipmsoc.org/wp-content/uploads/2023/05/Digital-BS381C-Colour-Chart.pdf) 記載 Hex 626353 (同 PDF の CIELab 値と整合) |
| `rlm02` | RLM 02 | #7f7b6b | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 7F7B6B。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm65` | RLM 65 | #9cd8e6 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 9CD8E6。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm66` | RLM 66 | #45484b | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 45484B。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm70` | RLM 70 | #3b554e | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 3B554E。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm71` | RLM 71 | #535842 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 535842。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm74` | RLM 74 | #575a56 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 575A56。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm75` | RLM 75 | #65686c | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 65686C。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm76` | RLM 76 | #96adb6 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 96ADB6。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm78` | RLM 78 | #6fa2a9 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 6FA2A9。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm79` | RLM 79 | #cc8e65 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex CC8E65。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm80` | RLM 80 | #333928 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 333928。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm81` | RLM 81 | #4c3d37 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 4C3D37。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm82` | RLM 82 | #4a634a | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 4A634A。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `rlm83` | RLM 83 | #4a4d40 | approx.: Digital RLM Colours chart (W.S. Marshall, https://www.hyperscale.com/images/Digital%20RLM%20Colours.pdf) 記載 Hex 4A4D40。RLM は公式 sRGB 値が無く文献間で差が大きい |
| `ral8000` | RAL 8000 | #887142 | https://en.wikipedia.org/wiki/List_of_RAL_colours (RAL 8000) #887142 |
| `ral7008` | RAL 7008 | #746643 | https://en.wikipedia.org/wiki/List_of_RAL_colours (RAL 7008) #746643 |
| `ral8020` | RAL 8020 | #ae8557 | approx.: https://www.scalemates.com/colors/real-colors--799/rc069-braun-brown-ral-8020-acrylic-lacquer-matt--13182 (画面近似 #ae8557。他源 myperfectcolor #b68c6b) |
| `ral7027` | RAL 7027 | #a5936c | approx.: https://www.scalemates.com/colors/vallejo-model-air--763/71118-camouflage-grey-ral-7027-acrylic-matt--6919 (画面近似 #a5936c。他源 Lifecolor #c1b396 と差が大きい) |
| `ral6006` | RAL 6006 | #40433b | https://en.wikipedia.org/wiki/List_of_RAL_colours (RAL 6006) #40433B |
| `ijn-nakajima-green` | FS 595 (FS 34077 近似) | #4e534e | approx.: FS 34077 近似説 (https://j-aircraft.com/research/ryan/notes_on_the_tamiya_a6m5.htm) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 (14077 の値を使用) |
| `ijn-hairyokushoku` | FS 595 (FS 16350 近似) | #958b79 | approx.: FS 16350 近似説 (https://j-aircraft.com/faq/IJNAF_Colors.htm) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `ija-hairyokushoku` | FS 595 (FS 36357 近似) | #a09c8f | approx.: FS 36357 近似 (https://www.scalemates.com/colors/ak-3rd-generation-air--978/ak-11899-ija-1-hairyokushoku-grey-green-acrylic-matt--35541、http://www.aviationofjapan.com/2010/07/paint-matters-mr-color-ki-27-mix.html) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `jsdf-dgreen-3414` | NDS Z 8201E 3414 | #434941 | approx.: NDS Z 8201E 標準色 (マンセル 7.5GY 3/1, https://www.mod.go.jp/atla/nds/Z/Z8201E.pdf) を Munsell 再表色 (光源C→D65 Bradford 適応) 経由で sRGB 換算 |
| `jsdf-brown-3606` | NDS Z 8201E 3606 | #5c5243 | approx.: NDS Z 8201E 標準色 (マンセル 2.5Y 3.5/1.5, https://www.mod.go.jp/atla/nds/Z/Z8201E.pdf) を Munsell 再表色 (光源C→D65 Bradford 適応) 経由で sRGB 換算 |
| `jgsdf2-tan` | 陸自迷彩 2 型 (実測) type2-1 | #8d8b7f | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/jgsdf2.jpg 4 --core --flatten=80`。参照画像は Wikimedia Commons [File:迷彩服2型の迷彩パターン.jpg](https://commons.wikimedia.org/wiki/File:%E8%BF%B7%E5%BD%A9%E6%9C%8D2%E5%9E%8B%E3%81%AE%E8%BF%B7%E5%BD%A9%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3.jpg) CC BY 3.0) |
| `jgsdf2-green` | 陸自迷彩 2 型 (実測) type2-2 | #5e775c | 同上 |
| `jgsdf2-brown` | 陸自迷彩 2 型 (実測) type2-3 | #74524e | 同上 |
| `jgsdf2-black` | 陸自迷彩 2 型 (実測) type2-4 | #46444b | 同上 |
| `dpm-sand` | DPM (実測) dpm-1 | #d8a858 | app プリセット実測値 (src/core/camo.js、`node tools/gen-src.mjs refs/dpm.jpg src/core/dpmsrc.js 4 DPM --resize=800 --blur=1.5 --flatten=250` の量子化重心。参照画像は Wikimedia Commons [File:DPM Combat 95 Camouflage Material MOD 45149982.jpg](https://commons.wikimedia.org/wiki/File:DPM_Combat_95_Camouflage_Material_MOD_45149982.jpg) OGL v1.0) |
| `dpm-green` | DPM (実測) dpm-2 | #616022 | 同上 |
| `dpm-brown` | DPM (実測) dpm-3 | #50311d | 同上 |
| `dpm-black` | DPM (実測) dpm-4 | #28221f | 同上 |
| `ddpm-sand` | DDPM (実測) ddpm-1 | #d5d5c9 | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/ddpm.jpg 2 --core`。参照画像は Wikimedia Commons [File:Desert pattern camouflage material MOD 45148363.jpg](https://commons.wikimedia.org/wiki/File:Desert_pattern_camouflage_material_MOD_45148363.jpg) OGL v1.0) |
| `ddpm-brown` | DDPM (実測) ddpm-2 | #7a5825 | 同上 |
| `auscam-sand` | オーストラリア DPCU (実測) auscam-1 | #a8a996 | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/auscam.jpg 5 --core --flatten=60`。参照画像は Wikimedia Commons [File:DPCU closeup, 2005.jpg](https://commons.wikimedia.org/wiki/File:DPCU_closeup,_2005.jpg) パブリックドメイン) |
| `auscam-midgreen` | オーストラリア DPCU (実測) auscam-2 | #769b65 | 同上 |
| `auscam-orangebrown` | オーストラリア DPCU (実測) auscam-3 | #a87c4f | 同上 |
| `auscam-midbrown` | オーストラリア DPCU (実測) auscam-4 | #765d3e | 同上 |
| `auscam-darkgreen` | オーストラリア DPCU (実測) auscam-5 | #2d4d57 | 同上 |
| `jmsdf-grey-2704` | NDS Z 8201E 2704 | #797979 | approx.: NDS Z 8201E 標準色 (マンセル N 5, https://www.mod.go.jp/atla/nds/Z/Z8201E.pdf) を Munsell 再表色 (光源C→D65 Bradford 適応) 経由で sRGB 換算 |
| `jmsdf-dgrey-2705` | NDS Z 8201E 2705 | #606060 | approx.: NDS Z 8201E 標準色 (マンセル N 4, https://www.mod.go.jp/atla/nds/Z/Z8201E.pdf) を Munsell 再表色 (光源C→D65 Bradford 適応) 経由で sRGB 換算 |
| `su-amt4` | FS 595 AMT-4 (FS 34102 近似) | #595b45 | approx.: FS 24102/34102 近似 (https://massimotessitori.altervista.org/sovietwarplanes/pages/colors/color-table.html) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `su-amt7` | FS 595 AMT-7 (FS 35190 近似) | #5a8b9e | approx.: FS 25190 近似 (https://massimotessitori.altervista.org/sovietwarplanes/pages/colors/color-table.html) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 (35190 の値を使用) |
| `idf-sand-grey-67` | FS 595 (FS 30372 近似) | #ac9a86 | approx.: FS 30372 近似 (Lifecolor UA020 / AK RC096 の対照表記, https://www.mech9.com/p/mr-color-paint-conversion-table.html) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `idf-sinai-grey-82` | FS 595 (FS 36134 近似) | #676865 | approx.: FS 36134 近似 (Ilan Levy, IDF Modelling 色対照表, https://www.tapatalk.com/groups/scalemodelsmalaysia/merkava-color-match-t9747.html 引用) に基づき GSA FED-STD-595C 測色データ (D65 CIELab, https://people.csail.mit.edu/jaffer/Color/FED-STD-595C1.txt) を sRGB 変換 |
| `dcu-tan492` | DCU (実測) Tan 492 | #e9d1ae | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像 refs/dcu.png から k-means 抽出)。色番号は 3 色デザートの陸軍色呼称 (https://ciehub.info/glossary/ThreeColorDesertCamouflagePattern.html) |
| `dcu-khaki494` | DCU (実測) Khaki 494 | #bbb18d | 同上 |
| `dcu-brown493` | DCU (実測) Brown 493 | #8f590b | 同上 |
| `dbdu-ltan379` | DBDU (実測) Light Tan 379 | #e5d5cd | app プリセット実測値 (src/core/camo.js、Wikimedia Commons 参照画像 refs/dbdu.jpg から k-means 抽出)。色番号は Natick color designation (Evaluation of Desert Camouflage Uniforms by Ground Observers, U.S. Army Belvoir RD&E Center / Natick RD&E Center §2.1, https://commons.wikimedia.org/wiki/File:Evaluation_of_Desert_Camouflage_Uniforms_by_Ground_Observers.pdf) |
| `dbdu-tan380` | DBDU (実測) Tan 380 | #c6b5a4 | 同上。参照画像の退色により Khaki 384 と分離できず、地色として 1 色で代表 |
| `dbdu-lbrown381` | DBDU (実測) Light Brown 381 | #9a766b | 同上 |
| `dbdu-dbrown382` | DBDU (実測) Dark Brown 382 | #704c44 | 同上 |
| `dbdu-black383` | DBDU (実測) Black 383 | #1d1f23 | 同上 |
| `cadpat-lgreen` | CADPAT (実測) cadpat-1 | #81925c | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/cadpat.png 4 --max-edge=1024 --core=2`。参照画像は Wikimedia Commons [File:Temperate CADPAT camouflage pattern swatch.png](https://commons.wikimedia.org/wiki/File:Temperate_CADPAT_camouflage_pattern_swatch.png) パブリックドメイン) |
| `cadpat-mgreen` | CADPAT (実測) cadpat-2 | #525d3c | 同上 |
| `cadpat-dgreen` | CADPAT (実測) cadpat-3 | #35392d | 同上 |
| `cadpat-tan` | CADPAT (実測) cadpat-4 | #847b5d | 同上 |
| `pla07-lgray` | 07 式 (実測) type07-1 | #d8d7dc | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/pla07.jpg 4 --max-edge=873 --core=2`。参照画像は Wikimedia Commons [File:Type 07 universal.jpg](https://commons.wikimedia.org/wiki/File:Type_07_universal.jpg) CC BY-SA 4.0) |
| `pla07-green` | 07 式 (実測) type07-2 | #48594f | 同上 |
| `pla07-brown` | 07 式 (実測) type07-3 | #605645 | 同上。ただし JPEG のリンギングで k-means の重心が灰側へ流れるため、筆致内部 (近傍 5×5 がすべて暖色) の中央値で実測 |
| `pla07-black` | 07 式 (実測) type07-4 | #292d30 | 同上 |
| `emr-khaki` | EMR (実測) emr-1 | #7d7d50 | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/emr.png 4 --max-edge=2320 --core=2`。参照画像は Wikimedia Commons [File:Russian Armed Forces EMR patten.png](https://commons.wikimedia.org/wiki/File:Russian_Armed_Forces_EMR_patten.png) CC0) |
| `emr-dgreen` | EMR (実測) emr-2 | #434e38 | 同上 |
| `emr-brown` | EMR (実測) emr-3 | #513d32 | 同上 |
| `emr-black` | EMR (実測) emr-4 | #302d31 | 同上 |
| `frogskin-lgreen` | フロッグスキン (実測) m1942-1 | #93a587 | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/frogskin.jpg 12 --core=2 --max-edge=610 --blur=2`。参照画像は Wikimedia Commons [File:Frog Skin camouflage pattern.jpg](https://commons.wikimedia.org/wiki/File:Frog_Skin_camouflage_pattern.jpg) CC BY-SA 3.0) |
| `frogskin-lime` | フロッグスキン (実測) m1942-2 | #85926c | 同上 |
| `frogskin-tan` | フロッグスキン (実測) m1942-3 | #978d70 | 同上 |
| `frogskin-dgreen` | フロッグスキン (実測) m1942-4 | #576b44 | 同上 |
| `frogskin-brown` | フロッグスキン (実測) m1942-5 | #7e6043 | 同上 |
| `frogskin-beach-cream` | フロッグスキン (実測) m1942b-1 | #e2cc9d | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/private/frogskin_beach.jpg 4 --core=2 --max-edge=294`。参照スウォッチは再配布不可のため `refs/private/` に置きリポジトリには含めない) |
| `frogskin-beach-khaki` | フロッグスキン (実測) m1942b-2 | #bfa96d | 同上 |
| `frogskin-beach-green` | フロッグスキン (実測) m1942b-3 | #979467 | 同上 |
| `frogskin-beach-brown` | フロッグスキン (実測) m1942b-4 | #a98c6a | 同上 |
| `berezka-green` | ベリョースカ (実測) berezka-1 | #5b7457 | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/private/berezka.jpg 2 --blur=2 --core=3`。参照画像は Wikimedia Commons [Камуфляж Берёзка.jpg](https://commons.wikimedia.org/wiki/File:%D0%9A%D0%B0%D0%BC%D1%83%D1%84%D0%BB%D1%8F%D0%B6_%D0%91%D0%B5%D1%80%D1%91%D0%B7%D0%BA%D0%B0.jpg) CC BY-SA 4.0 / GTRus。画像はリポジトリに含めない) |
| `berezka-pale` | ベリョースカ (実測) berezka-2 | #b0b4b6 | 同上 |
| `tigerstripe-lightkhaki` | タイガーストライプ (実測) tiger-1 | #9d977d | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/private/tigerstripe.webp 4 --max-edge=771 --core=2`。参照スウォッチは再配布不可のため `refs/private/` に置きリポジトリには含めない) |
| `tigerstripe-khaki` | タイガーストライプ (実測) tiger-2 | #6f6953 | 同上 |
| `tigerstripe-green` | タイガーストライプ (実測) tiger-3 | #515d49 | 同上 |
| `tigerstripe-black` | タイガーストライプ (実測) tiger-4 | #2e3131 | 同上 |
| `nwu1-navy` | NWU Type I (実測) nwu1-1 | #4f5d77 | app プリセット実測値 (src/core/camo.js、`node tools/extract-palette.mjs refs/private/nwu1.jpg 4 --core`。参照画像は Wikimedia Commons [File:NWU Type I camouflage pattern swatch.jpg](https://commons.wikimedia.org/wiki/File:NWU_Type_I_camouflage_pattern_swatch.jpg) パブリックドメイン (U.S. Navy)) |
| `nwu1-grey` | NWU Type I (実測) nwu1-2 | #7f919a | 同上 |
| `nwu1-lightblue` | NWU Type I (実測) nwu1-3 | #c2d6dd | 同上 |
| `nwu1-darknavy` | NWU Type I (実測) nwu1-4 | #333f46 | 同上 |

## 注意事項

### hex 値の近似性

- 規格色はいずれも物理的な色票 (チップ) で定義されており、sRGB 値は照明条件・変換式に依存する近似値である。本ライブラリは D65 光源・sRGB (D65) 前提で統一した。
- FS 34087 Olive Drab は 1974 年に FS 34088 へ改番され FED-STD-595C には収録されていないため、この 1 色のみ一次データではなく流布している hex チャートの値を採用している。
- RAL 8027 / 9021 (F9 迷彩色) はマット専用色で、変換元によって明度差が大きい (9021 は #151618 〜 #3e3f3c)。用途上は「ほぼ黒」で問題ないが、他源との突合時は留意する。
- 4BO は 1941 年当時の塗料自体に大きな個体差があり、FS 34102 近似はあくまで通説の一つ (FS 34095 / 34082 説もある)。7K も同様。
- 日本陸海軍機の色は現存塗膜・文献の再解釈が続いている分野であり、FS 近似は模型用途の慣例値に過ぎない。特に海軍暗緑色 D1 は実物のほうが青緑味が強いとの指摘がある。
- 陸自 OD 色はマンセル値 7.5Y 3/1 のみが規格化されており、sRGB 換算は参考値。
- MARPAT / AOR の実測値は参照写真の露出・布地の退色に依存するため、規格値ではない。
- ベリョースカ (KLMK) はソ連側の公的な色番号が確認できないため、参照写真からの実測値のみを収録している。参照が布地写真で織り目が乗るため、k-means の前に `--blur=2` で平坦化している (これをしないと版の色ではなく織りの明暗でクラスタが割れる)。

### 第2弾で追加した色の近似性

- RLM 色は戦時中の色票が現存せず、RLM 65 (#9cd8e6) はチャート値の彩度が他の資料 (#93b1b1 前後) より明らかに高い。RLM 81 は文献により褐色〜緑褐色まで解釈が割れ、チャートの V1 値を採用した。RLM 83 は近年の研究 (Ullmann) で暗青色であったとされるが、本ライブラリでは模型界で長く流布した「ダークグリーン」解釈の値を収録し、名称にその旨を付記した。
- RAL 8020 / 7027 (アフリカ軍団色) は 1961 年に RAL から削除されており、換算値は模型塗料の画面近似に依存する。特に 7027 は資料間で #a5936c〜#c1b396 と明度差が大きい。
- 日本海軍 暗緑色 (中島系) は FS 34077 近似が通説だが 595C には 34077 が無いため、同色相・艶有の 14077 の測色値で代用した。灰緑色 J3 も同様に 16350 の値を使っている。
- 海自艦艇色 2704 / 2705 はマンセル N5 / N4 (無彩色) の規格値からの換算で、色相のブレは無いが実艦は青味を帯びて見えることが多い。
- IDF 色は公的規格が無く、FS 30372 (1961〜73) / FS 36134 (1982〜) はいずれも模型考証上の近似番号である。

### 商標・名称について

- MARPAT、AOR1/AOR2 (NWU Type II/III)、UCP、Multicam は米軍またはメーカーの意匠・商標に関わる名称である。本ライブラリでは色の分類タグおよび説明文としてのみ用い、商標名を色エントリの主キー (`id` / `std`) に採用していない (実測値エントリは「MARPAT (実測)」等と規格ではないことを明示している)。
- Tamiya、Mr.Color の品番は各社の商標であり、`note` 内の参考情報 (「〜相当」) としてのみ記載する。
- Coyote 476 / 498、Foliage Green 502、Urban Gray 501、Desert Sand 500 は米軍調達仕様上の色名で、FS 595C にも同名で収録されている公的名称である。
