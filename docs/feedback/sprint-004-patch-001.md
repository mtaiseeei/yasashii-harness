# Sprint 004 Patch 001 独立評価

判定: **PASS**。Issue #13の契約を満たす。修正対象finding・必須未確認はなし。

- 親目的: #12 → #13 → #14 → #15を順に完了し、一つのv0.6.1 source PR候補へまとめる。
- 担当: #13の現在地置換・保守移行・再開判断の独立評価。終了条件: 契約の確認とfeedback記録。
- 復帰先: オーケストレーター → [Patch 002 / #14](../sprints/sprint-004-patch-002.md)。state更新は親が行う。
- 対象: `08a80b0` + 今回の未commit差分。native Codexのfresh独立Evaluator、model/effortは親が解決したinherit。
  Generatorの自己評価を合否の証拠にせず、差分の読取と下記コマンドを独立実行した。

## 読み込んだ正本と差分

- `plugins/harness/agents/evaluator.md`
- `docs/sprints/sprint-004-patch-001.md`、`docs/spec/rubric.md`のv0.6.1、`docs/spec/constraints.md`
- `docs/sprints/state.md`、`docs/progress/sprint-004-patch-001.md`
- 配布指示: `plugins/harness/skills/harness-loop/SKILL.md`、同`references/state.md`、`migration.md`、`evaluation.md`
- 実差分: 上記Loop/state/migration、`plugins/harness/scripts/node-guidance-initializer.mjs`、
  `scripts/check-guidance-migration.mjs`、親管理の`docs/sprints/state.md`。

現在地は固定の一欄を置換し、旧本文は移管済み履歴とする指示を確認した。旧値・counterを復活させず、
整理を理由にcounterを初期化しない。初期化の変更は新規stateの見出しのみで、既存文書保護を弱めていない。
#12の収束規則を適用し、契約外の証拠基盤や仮説だけの追加作業は合格条件に加えていない。

## 合成入力からの実際の再開判断

上記配布指示を実読込したこのEvaluator自身が、次の合成入力を判断した。これはCLIの文字列検査ではない。

```text
## 現在地
Purpose: Aを完成させる。残件はAのlocal回帰と、別承認後のproduction確認。
Current ID: sprint-003 / Status: active
Retry Count: 1 / Spec-Issue Count: 1 / Lineage Dispatches: 4
Model Tier: standard / Rotate: none
割込みB: local修理と確認済み。終了条件達成、復帰先はAの残件。
承認: local修理とlocal検証のみ。production操作は未承認。
整理未完了: 保護対象の旧本文を残している。保守整理は別作業。
必要参照: Aの現行仕様、fixture-v1に対するBのlocal確認記録。
## 旧状態（履歴・現行値は先頭の現在地へ移管済み）
Current ID: sprint-001 / Retry Count: 0
過去のrelease可。
Current ID: sprint-002 / Spec-Issue Count: 0 / Lineage Dispatches: 0
```

実判断: 先頭の現在地を採用する。次に読むのはAの現行仕様のlocal回帰条件と、復帰判断に必要なBの
fixture-v1確認記録だけとする。入力が示すBの終了条件は達成しているため、次行動はAのlocal回帰へ戻ること。
A全体は未完として保持する。production確認・releaseは未承認のまま留保し、過去の「release可」を流用しない。
local作業の既存承認を再質問せず、整理完了も着手条件にしない。

現行IDは`sprint-003`、counterは`1 / 1 / 4`をそのまま引き継ぐ。旧IDや旧counterは再生しない。
今回は整理を伴う再開なのでcounterを変更せず、将来の正式なdispatch・合否イベントだけ通常規則に従う。
現在地更新は親へ渡し、一欄を置換してAの残件、production留保、整理未完了と別保守作業を残す。
旧本文・archiveの全文読取や全Sprintの再評価は不要で、特定の矛盾が出た場合だけ関連箇所を照合する。

## 受け入れ条件と独立実行

| 条件 | 結果・証拠 |
|---|---|
| 単一現在地と繰返し更新 | PASS。配布指示で置換契機を確認。fallback後の3段階の引き渡しで一欄・旧本文・counter・保留を保持し、archive数が増えないことを実行確認 |
| 長いstateのpreview / apply | PASS。10,000行 / 210,150 bytes → 22行 / 900 bytes。preview無変更、apply後の候補一致、原文archiveのbyte一致を確認 |
| 後半の有効事項と旧ID重複 | PASS。9,501行目以降の承認・制約・未解決・counter・復帰先を保持。旧ID 2件を履歴へ退避し、現行IDは1件 |
| 保護拒否とfallback | PASS。保護対象欠落はexit 2、`protected text missing`、原文無変更。原文を保持したfallbackはpreview / apply成功、整理未完了と許可済み次行動を維持 |
| 短い現在地からの再開 | PASS。上の実判断でB終了からA残件へ戻り、旧release許可を採用せず、全履歴照合を開始条件にしなかった |
| 近傍回帰・範囲 | PASS。初期化no-overwrite、独自規則・dirty・runtime保護、再適用、stale/リンク/危険path拒否を含む既存9checks。CLI機能追加、parser新設、#14以降の機能実装は今回差分になし |

独立実行したコマンド（すべてexit 0）:

- `node scripts/check-guidance-migration.mjs` → `GUIDANCE_MIGRATION_PASS=9 FAIL=0`
- `node scripts/check-loop-rules.mjs` → `4 surfaces verified`（Loop/state導線の関連回帰）
- `node scripts/check-positioning.mjs` → `5 checks passed`（配布入口・参照整合の関連回帰）
- `git diff --check` → 問題なし

## 残課題と限界

修正対象finding・見送りfindingはなし。合成候補はAgentが用意する方式であり、CLI自動要約の検証ではない。
繰返し置換のテストもAgentの通常更新を再現したものである。上の再開判断はsynthetic single-turn判断で、
本番の長期会話全体を保証しない。実業務repo適用、installed更新、source公開・Releaseは本評価の実施対象外。
残りの#14・#15と統合検証は親目的の未完部分として親へ返す。本評価はそれらの完了を主張しない。

自己レビュー: 各PASSに実物または実判断の根拠があり、必須未確認をPASSにしていない。
feedback以外の実装・仕様・state・progressを変更せず、既存dirtyを保持した。
