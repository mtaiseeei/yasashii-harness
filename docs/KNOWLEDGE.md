# Harness design knowledge

現行の製品仕様は [必要領域への索引](spec.md)、実行入口は [using-harness](../plugins/harness/skills/using-harness/SKILL.md)。
このfileは設計理由が必要な場合の短い索引であり、開始時の必読資料ではない。

## 現在の設計判断

目的・決定・現在地の継承と必要な検証を中心にする。小変更は担当Agentの直接修正と必要検証で完了する。
通常機能は短い計画と完成時独立レビュー、大きく曖昧な開発は領域仕様と意味のあるSprintを使う。
高リスク操作の実行前確認・承認境界・実行後検証を維持する。
3役・micro契約・3文書を全変更へ適用する旧判断は置換済み。

現在状態から該当仕様・コードへ進み、理由や矛盾が必要な範囲だけ履歴を検索する。
stateは現在内容を更新し、元履歴・独自規則・未解決事項・有効な承認を保持する。
領域の重要決定は既存仕様と理由へ反映し、置換を識別する。詳細を別fileへ移して全文必読にはしない。

既存repo保守は初期化と分けたpreview/applyで行う。plugin更新だけで消費repoを自動変更しない。
資料質問は今回必要な利用者判断が解決すれば停止し、委任済み詳細を問い直さない。

## 理由・出典が必要な場合だけ

- [現行判断と置換対応](spec/decisions.md)
- [文書保守の実行方法](../plugins/harness/skills/harness-loop/references/migration.md)
- [v0.5.5までの設計背景](KNOWLEDGE-v0.5.5.md): 旧3役中心設計、runtime導入、参考実装と出典。
  歴史記録のmicro必須・全分岐質問などを現行ルールへ再適用しない。

参考資料は設計の背景であり、今回の構成はユーザー承認による製品判断。公式標準ではない。

https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra
https://learn.chatgpt.com/docs/build-skills
https://code.claude.com/docs/en/best-practices
https://note.com/taki4416/n/nbbd9fb2bea78

同梱のmattpocock/skills grillingと記事のgrill-with-docsは別実装。
元本文・MIT Licenseのprovenanceは [grilling](../plugins/harness/skills/grilling/SKILL.md) に保持。
