# Current work

## 現在地

- Purpose: v0.6.1適用で残ったstateの物理短縮、文書commit、読込確認、global暫定規則整理を完了する。
- 完了条件: 原文と有効事項を保全してMac miniの5repoを整理し、上流/下流修正・両host導入・適用結果を分けて確認する。
- Current ID: sprint-004-patch-003
- Status: done
- Retry Count: 0
- Spec-Issue Count: 0
- Lineage Dispatches: 8
- Model Tier: standard
- Rotate: none
- Next Planned: [通常機能の計画](../progress/state-history-archive.md)に沿って履歴退避を実装し、独立評価後に5repoへ適用する。以下のSprint値は完了済み#12〜15の記録で、新作業の予算に流用しない。
- 今回: 上流PR16・下流PR9マージ、両v0.6.1公開と両host導入済み。実適用の4repoは短い現在地＋旧本文で物理短縮未完了、六鍋stateはrepo外履歴リンクで未適用。11/6承認で残件を進行中。
- 合格済み: [#12](../feedback/sprint-004.md)、[#13](../feedback/sprint-004-patch-001.md)、[#14](../feedback/sprint-004-patch-002.md)、[#15](../feedback/sprint-004-patch-003.md)。
- 承認: 11/5のmerge/release・下流反映・両host更新・Mac mini対象4系統5repoへの適用と実文書Fableレビュー、11/6の残り5項目を進める指示。
- 境界: 対象5repoの文書とglobalのreview-convergenceブロックだけ。業務コード/本番DB/外部送信/他者セッション/model/effortは変更しない。installed cacheは直接編集せず正式更新する。
- Runtime: native Codex fresh role、model/effort=inherit。明示overrideのlaunch検証は対象外。
- 検証基点: v0.6.0 dd05b7e。positioning 5、loop 4、runtime 57、migration 8、Claude manifest validateがPASS。
- 契約: [#12](sprint-004.md)、[#13](sprint-004-patch-001.md)、[#14](sprint-004-patch-002.md)、[#15](sprint-004-patch-003.md)。
- 正本: [仕様索引](../spec.md)、[評価基準](../spec/rubric.md)。
- 旧状態: [原文](state-before-review-convergence.md)は履歴。過去のrelease承認を今回へ流用しない。
