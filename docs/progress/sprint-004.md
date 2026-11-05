# Sprint 004 / #12 実装記録

対象: v0.6.0 `dd05b7e` + この作業差分。契約は [sprint-004](../sprints/sprint-004.md)、評価条件は [rubric](../spec/rubric.md)。
親目的は #12→#13→#14→#15 の順次実装・独立評価。本記録は #12 のみで、PASS後の復帰先は Patch 001 / #13。

## 変更

- `plugins/harness/skills/harness-loop/references/evaluation.md` を選別の正本とし、F/Iと修正閾値、必須例外、repo任意上書き、明示修正依頼、全finding供給元への適用を定義。
- 同正本で見送りの減点・仮説の未確認化・分類替えによる差戻しを禁止。未実施の必須検証はPASSにしないことを別に保持し、再開条件・前回残課題の参照を規定。
- `agents/evaluator.md` / `agents/generator.md`、`skills/harness-loop/SKILL.md`、`references/scope.md` から選別前後の導線を接続。旧来のproduct finding一律差戻しと曖昧な未確認扱いを整合。
- templates・版・仕様・契約・state・feedbackはこの担当では編集していない。既存の他者差分を保持。チェック追加や新基盤はなし。

## 実行した検証

2026-11-05、このcheckoutで実行。

| コマンド | 結果 |
|---|---|
| `node scripts/check-positioning.mjs` | exit 0、5 checks passed |
| `node scripts/check-loop-rules.mjs` | exit 0、4 surfaces verified。参照到達性・hook環境変数なし/あり・同梱物整合を含む |
| `git diff --check` | exit 0 |

文書が製品本体であり、検証コードのみのdiffではない。上記は導線・既存安全境界の回帰確認で、実role判断の代用ではない。

## 独立評価への引き渡し

Evaluatorは評価正本とroleを実読込し、今回のrubricに従って少数の合成入力を判断する。例の手掛かり:

- F=2/I=9、4/5、2/7、条件を特定できない0/9の4例と、低頻度でも明示条件未達・実証回帰・具体的権限漏えいの例外。
- 同じ見送りを採点減・仮説の未確認・spec/verification分類替えとして渡した場合、明示修正依頼がある場合、必須回帰チェックが実行不能の場合の区別。
- 前回見送りの単なる言い換えと、関連設定変更・新しい具体的事実・明示再評価の区別。
- rubric未作成の既定、開始時点の既存rubricでの明示上書き、途中の未承認厳格化。両hostに共通の正本で判断する。

残件: 独立Evaluatorによる実判断と合否。両hostの配布導線・templatesの最終整合と配布検証は #15 の担当。
source実装・上記軽量回帰まで実施済み。commit/push、installed更新、消費repo適用はこの担当では未実施。
