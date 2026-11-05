# Sprint 004 Patch 002 — Generator引き渡し

- 親目的: #12 → #13 → #14 → #15を順に修正し、独立評価済みv0.6.1候補を1つのsource PRへまとめる。
- 担当 / 終了条件: [契約](../sprints/sprint-004-patch-002.md)の#14だけを実装し、関連軽量回帰と結果を引き渡す。
- 復帰先: 親オーケストレーターの#14独立評価。PASS後はPatch 003 / #15。
- 対象版: `bb23996` + 今回の未commit差分。実装・下記検証済み、独立評価・公開・導入は未実施。

## 変更と確認

- `harness-loop/SKILL.md`: 元目的・完了条件を保持し、割込みの必要確認後に現在地を置換して本題の残件へ自動復帰。復帰の再承認・全レビューを要求せず、外部待ちは条件を残して独立作業へ進む。
- `references/scope.md`: 「直して」を本題取消と解釈せず、割込み対象を限定。#12の選別を参照し、無関係な軽微Cを残課題へ置く。Sprint合格後も記録した復帰先を優先する。
- `references/state.md`: #13の固定現在地を維持し、理由・終了条件・具体的復帰先を割込み時だけ持つ短いA/B/C例を追加。
- `agents/{planner,generator,evaluator}.md`: 親目的・担当・終了条件・復帰先を依頼から保ち、戻り値にも返す短い指示。復帰規則全文は複製しない。
- `node scripts/check-positioning.mjs`: 5 checks PASS。
- `node scripts/check-loop-rules.mjs`: 4 surfaces PASS（hook環境変数なし/ありと参照到達性を含む既存チェック）。
- `git diff --check`: PASS。

## 独立評価への申し送り

[rubric](../spec/rubric.md)どおり、fresh CodexでA→B→A、無関係C、短いstateから再開、明示取消/置換、外部待ちを実判断する。静的検査を会話判断の証拠にはしていない。
新しいコマンド・キュー・budget・検証基盤は追加なし。検証コードのみの差分ではない。
親所有の`docs/sprints/state.md`の既存dirtyを保護し、仕様・契約・feedback・設定・installed cacheは編集していない。
