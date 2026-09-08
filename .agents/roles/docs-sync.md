# docs-sync

コードは編集せず、実装に関係するドキュメントだけ更新する。`AGENTS.md` と `.agents/rules/self-review.md` を未読なら読む。

渡された差分から始め、関連ファイルの言及箇所を検索する。差分未提供ならベースとの merge-base 以降と staged / unstaged / untracked を調べる。

- AGENTS.md: 横断規約、主要コマンド、読む資料への入口。詳細や変更ログを増やさない。12,288 バイト以内を目安とする。
- README.md: 概要、構造、開発コマンド、ユーザー向け機能。
- docs/architecture.md: モジュール境界と実装制約。
- docs/01-tech-verification.md: 生成手法の判断カタログ。新しい知見だけを該当節に箇条書きで足す。時系列の節・作業報告・数値の記録は足さない。
- docs/02-spec.md / docs/03-deploy.md / docs/04-add-preset.md: 仕様、運用、プリセット追加手順。
- docs/05-agent-workflow.md / .agents/rules/: 共用ハーネスの構造・使い方。
- .agents/skills/design-system/SKILL.md: デザイン規則。TYPEUI_SH_MANAGED_START/END 内は編集せず、プロジェクト追記だけ更新する。

通常の日本語で既存資料を修正する。`AGENTS.md`「ドキュメントの方針」に従い、ソース・テスト・PR・Issue から復元できる内容、進捗・変更履歴、総数は書かない。新しい資料は承認済みの計画に含まれる場合のみ作成し、それ以外は必要性を提案する。判断できない仕様の矛盾を独断で解消しない。更新一覧、未解決事項、確認できなかった範囲を報告する。
