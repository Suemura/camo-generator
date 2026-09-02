# CLAUDE.md

このリポジトリで作業する際のガイド。

## プロジェクト概要

迷彩模様のプロシージャル生成 Web アプリ。シード決定的生成・パレット自由変更・PNG/JPG/SVG エクスポートが核。
現在フェーズ1（技術検証）完了、フェーズ2（仕様整理）へ移行中。全体の進め方と進捗は README の「進め方と進捗」を参照。

## コマンド

```bash
cd prototype
node build.mjs                 # index.html をビルド (camo.js + refs.js をインライン展開)
node render.mjs <outdir> <seed>  # 全プリセットを 512px PNG で出力（目視検証用）
```

テストフレームワークは無い。検証は「レンダ → 実物リファレンスと目視比較」が基本ループ。

## アーキテクチャ

- `prototype/camo.js` — 生成コア。**browser / Node 共用の ES module、外部依存ゼロ**。この制約は維持すること
  - すべての乱数は座標ハッシュ (`hash2`) または `mulberry32` によるシード決定的生成。`Math.random` 禁止（同一シード→同一出力の保証が製品要件）
  - 「形状（index マップ: `Uint8Array` の色インデックス）」と「色（パレット）」を分離。`generate()` → `{w, h, index, grid?}`、着色は `toRGBA()`。この分離がパレット自由変更の根拠なので崩さない
  - 手法は3系統: `genQuilt`（ブロブパッチ合成、M81 主力）/ `genGrowth`（クラスタ成長、デジタル系）/ `genWoodland`・`genDigital`（ノイズ閾値、従来手法・比較用）
  - プリセットは `PRESETS` に集約。`kind` で生成関数にディスパッチ
- `prototype/m81src.js` — M81 実物図案の 4値インデックスマップ（RLE + base64）。再生成は docs 記載の Python 手順
- `prototype/app-template.html` — UI。`//__INLINE_CAMO__` / `//__INLINE_REFS__` マーカーに build.mjs がインライン展開する。**index.html を直接編集しない**（ビルドで上書きされる）
- `prototype/index.html` — ビルド成果物。Artifact/配布用の単一ファイル
- `prototype/experimental/` — 手法探索の原本。本体に移植済みだが履歴として保持

## 検証ワークフロー（重要）

生成品質の変更を入れたら必ず:
1. `node render.mjs <outdir> <seed>` を複数シード（1234 / 777 / 211025 など）× 複数スケール（0.7 / 1.0 / 1.5 / 2.0）で実行
2. 出力 PNG を Read で目視し、`docs/01-tech-verification.md` 記載の既知アーティファクト（ブロック感・境界急変・切断面・鏡映対称・市松ノイズ・微小点）が再発していないか確認
3. 変更内容と判断を `docs/01-tech-verification.md` に追記

過去に解消済みの問題と対策の全履歴が同ドキュメントにある。**同じ轍を踏む前に必ず読むこと**。

## 規約

- ドキュメント・コミットメッセージは通常の日本語
- 生成アルゴリズムのコメントは「実物のどの特徴を再現する意図か」を書く（パラメータの意味だけでなく）
- リファレンス画像は Wikimedia Commons 由来のみ（ライセンス管理のため）。追加時は README のクレジット節を更新
- パレット既定値は参照画像からの実測抽出値。感覚で変えない

## フェーズ2 以降の技術方針（暫定合意）

- フロントエンド: React または Next.js（未確定）
- ホスティング: Cloudflare。生成は完全クライアントサイドで完結する設計を維持（サーバー生成は不要）
- 高解像度対応: Web Worker 化を想定（現状 scale 2 で ~2s）
