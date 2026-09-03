# Camo Generator

迷彩模様をプロシージャル生成する Web アプリ。

デモ（フェーズ1 プロトタイプ）: `prototype/index.html` をブラウザで開くだけで動作（依存なし・単一ファイル）。
本実装: **https://camo-generator.suemura.app** （`pnpm install && pnpm dev` でローカル起動）。

## 概要

- ウッドランド (M81) / MARPAT (ウッドランド・デザート) / AOR1 / AOR2 / UCP の迷彩に近い模様を計算で生成する
- シード値により、同じアルゴリズムから無数のバリエーションを決定的に再現できる
- 各パターンのパレット（例: ウッドランドの緑・茶・サンド・黒）を自由な色にその場で差し替えられる
- 生成結果を PNG / JPG / WebP / SVG（デジタル系のみ）で任意サイズ・実寸（mm / inch × DPI、PNG に DPI 埋込）でエクスポートできる
- 全状態が URL に入るので、リンク 1 本で同じ模様を共有・再現できる。120 色の規格色ライブラリ（FS 595 / RAL / BS 381C / RLM …）と画像からのパレット抽出
- 各パターン選択時に実物リファレンス画像を並列表示し、精度を目視比較できる

## 生成手法（フェーズ1 で確立）

パターンごとに最適な手法が異なることが検証で判明し、3系統を実装している。

| 手法 | 対象 | 概要 |
|------|------|------|
| **ブロブパッチ合成（クイルト）** | M81 ウッドランド / AOR1 / AOR2 | 実物図案のインデックスマップから、有機輪郭のパッチを領域成長型シームで貼り合わせる。局所形状・色・面積比は実物の設計言語そのもの。多数決ミップマップ・フラグメント除去・シェイプ完走成長などの後処理を含む。**主力手法**（ユーザー評価 88+） |
| **クラスタ成長** | MARPAT (ウッドランド/デザート) / UCP | セルグリッド上で色ごとに面積予算つきシード成長。蛇行ドリフト・seedNear 連鎖・境界ディザ・スペックルで実物のクラスタ構造を再現 |
| **ノイズ閾値（従来手法）** | （選択肢からは退役） | シード付き値ノイズ + fBm + ドメインワープ + 分位点閾値。到達上限 ~75点。コードは保持し、フェーズ2 のカスタム迷彩生成の基盤候補 |

技術詳細・検証履歴（v1〜v14 の全反復記録）は `docs/01-tech-verification.md` を参照。

## ディレクトリ構成

```
src/
  core/             生成コア (camo.js: browser/node 共用 ES module、依存なし) + 実物インデックスマップ + 型定義
  app/              React UI
  styles/tokens/    デザイントークン (spacious 由来。primitives → semantic → CSS カスタムプロパティ)
tools/
  render.mjs        Node レンダリングハーネス (PNG 出力、目視検証ループ用)
  gen-tokens.mjs    docs/design/spacious-DESIGN.md → _primitives.scss
tests/              Vitest (決定性・回帰スナップショット)
prototype/          フェーズ1 プロトタイプ (参照のみ。build.mjs は src/core を読む)
  app-template.html / build.mjs / refs.js / index.html / experimental/
docs/
  01-tech-verification.md  フェーズ1 検証記録 (手法変遷・自己改善ループ全履歴)
  02-spec.md               フェーズ2 仕様設計 (機能仕分け・画面・技術選定・Cloudflare・デザインシステム)
  design/                  spacious トークン原本 / パレットライブラリ
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
pnpm deploy       # Cloudflare Workers へデプロイ (wrangler login 済み前提)

node tools/render.mjs <出力dir> <seed> [scale]   # 全プリセットを PNG レンダ (目視検証用)
```

## 進め方と進捗

| フェーズ | 内容 | 状態 |
|---------|------|------|
| 1. 技術検証 | 生成精度の検証・手法確立（自己改善ループ計40周超 + 並行手法探索） | **完了** |
| 2. 仕様整理 | 機能仕分け・画面構成・技術選定・Cloudflare 構成・デザインシステム（`docs/02-spec.md`） | **完了** |
| 3. 設計 | React + Vite プロジェクト骨格・トークン生成・シームレスタイリング（v15） | **完了** |
| 4. 実装 | UI 本実装・初回デプロイ（`camo-generator.suemura.app`） | **完了** |
| 4. 実装 | 本実装・デプロイ | 未着手 |

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

- 実物リファレンス画像および M81 ソースマップは Wikimedia Commons 由来（US Woodland は米政府図案でパブリックドメイン。各画像のライセンスは Commons の該当ファイルページに従う）
- `experimental/` の一部は [camogen](https://github.com/glederrey/camogen) (MIT) のアルゴリズムを参考にした
