# Current work

- Purpose: 承認済みHarness改善を正式配布し、利用中hostと新sessionまで反映する。
- Current ID: sprint-003（実装done、公開・導入の残作業）
- Status: release-ready
- 承認範囲: 両editionの0.6.0正式main/tag/Release、利用中Agenticの正式CLI更新、新規read-only session確認。
- 制約: 元checkoutのHEAD/index/dirty、既存の文書移行原文、起動中session、model/effort、scope、他pluginを保持。
- 実装・独立評価: [源流PASS](../feedback/sprint-003.md)、[増分PASS](../feedback/sprint-003-incremental.md)、[下流PASS](../feedback/sprint-003-downstream.md)。製品本文はこの固定候補から継承。
- 配布候補: 0.6.0。内容・正式更新手順・未実施範囲は [release notes](../releases/v0.6.0.md)。
- 公開済み／installed済み／新session確認済みは別の事実。候補treeだけで配備完了とは判定しない。
- 次の一手: 両候補の配布差分を確認し、正式公開→対象host更新→新session実読込を検証する。
- 現行仕様は [索引](../spec.md) から必要な領域だけ読む。通常開始時に全履歴を読まない。
- 以前の承認・検証・状態の全文は [変更前原文](state-before-0.6.0-release.md) にbytesを保持。以前の公開対象外は今回の明示承認で置換した。
