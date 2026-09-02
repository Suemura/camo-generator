# パレットライブラリ 出典一覧

`palette-library.json` に収録した 50 色の hex 値の出典と、採用方針・注意事項をまとめる。仕様は `docs/02-spec.md` §3.3 を参照。

## 収録方針

- 名称・コードは公的規格のみを主キーとする: FS 595 (米連邦規格) / AMS-STD-595A / RAL (独) / BS 381C (英) / ソ連規格名 (4BO, 7K) / 日本陸海軍の標準色名 / 防衛省規格 NDS Z 8201E。模型塗料の品番 (Tamiya TS-/XF-, Mr.Color C-) は `note` の「〜相当」に留める。
- FS 595 系は GSA が公開する FED-STD-595C の測色データ (D65 CIELab) を sRGB に変換した値を採用した。市販の「FS 595 hex チャート」は出典不明かつ相互に食い違うため、一次データ由来の値に統一している。hextoral / e-paint 等が掲載する値とほぼ一致する。
- RAL Classic は encycolorpedia の換算値、RAL F9 (連邦軍迷彩色) は nuancier-ral の換算値を採用した。RAL 7028 Dunkelgelb は RAL Classic 廃番のため模型塗料の画面近似値を採用し、`source` に approx. と明記した。
- BS 381C は scalemates の BS 381C パレットの値を採用した。
- 公式 sRGB 値が存在しない色 (4BO / 7K / 日本陸海軍色 / 陸自 OD 色) は、研究者・模型誌で通説となっている FS 近似色またはマンセル値を経由して換算し、`source` に approx. と明記した。
- アプリのプリセット (MARPAT / AOR1 / AOR2) は公的規格の色番号が存在しないため、`src/core/camo.js` の実測パレット (Wikimedia Commons 参照画像からの抽出値) をそのまま収録した。M81 と UCP は FS 595 の公式色番号が存在するため FS 系エントリで代表させている。
- タグは色味 (hue) / 用途 (use) / 国 (country) の 3 軸。用途タグの camo-* はアプリのプリセット名に対応する。

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

## 注意事項

### hex 値の近似性

- 規格色はいずれも物理的な色票 (チップ) で定義されており、sRGB 値は照明条件・変換式に依存する近似値である。本ライブラリは D65 光源・sRGB (D65) 前提で統一した。
- FS 34087 Olive Drab は 1974 年に FS 34088 へ改番され FED-STD-595C には収録されていないため、この 1 色のみ一次データではなく流布している hex チャートの値を採用している。
- RAL 8027 / 9021 (F9 迷彩色) はマット専用色で、変換元によって明度差が大きい (9021 は #151618 〜 #3e3f3c)。用途上は「ほぼ黒」で問題ないが、他源との突合時は留意する。
- 4BO は 1941 年当時の塗料自体に大きな個体差があり、FS 34102 近似はあくまで通説の一つ (FS 34095 / 34082 説もある)。7K も同様。
- 日本陸海軍機の色は現存塗膜・文献の再解釈が続いている分野であり、FS 近似は模型用途の慣例値に過ぎない。特に海軍暗緑色 D1 は実物のほうが青緑味が強いとの指摘がある。
- 陸自 OD 色はマンセル値 7.5Y 3/1 のみが規格化されており、sRGB 換算は参考値。
- MARPAT / AOR の実測値は参照写真の露出・布地の退色に依存するため、規格値ではない。

### 商標・名称について

- MARPAT、AOR1/AOR2 (NWU Type II/III)、UCP、Multicam は米軍またはメーカーの意匠・商標に関わる名称である。本ライブラリでは色の分類タグおよび説明文としてのみ用い、商標名を色エントリの主キー (`id` / `std`) に採用していない (実測値エントリは「MARPAT (実測)」等と規格ではないことを明示している)。
- Tamiya、Mr.Color の品番は各社の商標であり、`note` 内の参考情報 (「〜相当」) としてのみ記載する。
- Coyote 476 / 498、Foliage Green 502、Urban Gray 501、Desert Sand 500 は米軍調達仕様上の色名で、FS 595C にも同名で収録されている公的名称である。
