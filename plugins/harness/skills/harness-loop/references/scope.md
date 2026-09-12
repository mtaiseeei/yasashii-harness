# 変更の分類・特殊失敗

小さい追加、失敗、契約変更、guard到達時に該当節を読む。

## 変更の分類（ハーネス管理下での入口規則）

ハーネス管理下のリポジトリ（`docs/sprints/state.md` または `docs/spec.md` が存在する）では、
ユーザーの追加要望を必ず次の3つに分類してから着手する。「小さいからハーネス外で直す」を既定にしない。

1. **直接修正** — typo、コメント、ドキュメント、設定値など、アプリの挙動を変えない変更。
   ハーネス外で直してよい。
2. **micro-patch** — 挙動やUIに触れる軽微な変更のうち、次の条件を **すべて** 満たすもの:
   同一の機能面・同一の利用フローに閉じている（画面を持たない製品では同一コマンド・同一機能領域）/
   低リスクで影響範囲が説明でき、既存チェックまたは再現可能な直接操作で独立検証できる。
   自動チェックの事前存在や変更行数だけでは判定しない。認証・権限・破壊的データ変更など高リスクは通常Patchにする。
   Planner が `Type: micro` の Patch Sprint 契約を作り、評価は軽量モード（後述）で行う。
3. **通常の Patch Sprint / 次のメインスプリント** — 上記に収まらないもの。

## Scope Change Gate（自動 Patch Sprint 化と基準拡大の禁止）

- Sprint 契約が作られ Generator が着手した後、その Sprint の範囲を拡張しない。**これは起点を問わない。**
  ユーザーの追加要望だけでなく、Evaluator feedback や Planner の契約改訂に起因する
  受け入れ基準の追加、検証対象の拡大、証拠形式の変更・追加も範囲拡張として扱う。
- Evaluator 不合格の修正、または **着手時点の** 受け入れ基準を満たすための修正は同じ Sprint ID に残す。
  この例外は既存基準を満たすための修正に限る。基準自体を増やす・厳しくする改訂は例外に含めず、
  下の「受け入れ基準・rubric の厳格化ゲート」に従う。
- 合格済み Sprint への追加修正、または現在 Sprint の受け入れ基準に含まれない変更は、
  ユーザーが「Patch 1」と言わなくても上の分類規則にかけ、micro-patch または通常 Patch Sprint として
  Planner に契約を作らせる。次の空きID（例: `sprint-005-patch-001`）を自動採番する。
- Patch Sprint も必ず `docs/sprints/sprint-NNN-patch-PPP.md`、`docs/progress/sprint-NNN-patch-PPP.md`、
  `docs/feedback/sprint-NNN-patch-PPP.md` を持つ。
- 大きな新機能や製品方向の変更は Patch Sprint にせず、次のメインスプリントまたは Planner の再計画に回す。
  再計画がユーザーの当初依頼の範囲を超える場合は、着手前にユーザーの承認を得る。

## 受け入れ基準・rubric の厳格化ゲート（ユーザー承認必須）

- active な Sprint に対する厳格化方向の変更 — 受け入れ基準の追加、閾値の引き上げ、証拠形式の追加・変更 —
  は、Planner が差分・理由・追加される検証コストを選択式で提示し、ユーザーが承認した場合だけ反映する。
  spec-issue 差し戻し後の契約・rubric 修正にも同じゲートを適用する。
- ループ中に追加された基準は、当該 Sprint では参考スコア・改善提案として扱う。
  「1つでも閾値を下回れば不合格」のハードゲートに組み込むのは、ユーザー承認を経た次 Sprint 以降とする。
- 緩和・棚卸しは正規の手続きである。過剰と判明した基準・証拠形式・検査は、Planner の提案とユーザー承認で
  Non-scope 化（出荷必須から外す）または optional internal QA へ降格できる。
  契約で Non-scope 化された検査を撤去することは「チェックを削って通す」違反ではない。

## 検証スコープガード（暴走検知）

検証は製品を出荷するための手段であり、検証基盤の完成度自体は製品要件ではない。
次のガードで「検証のための検証」への逸脱を検知し、ループではなくユーザーへ返す。

- **finding の対象区分**: 各findingは `product` / `verification-infra` に分け、不明なら `product` とする。検証基盤だけの軽微な指摘は改善提案に残せるが、必要な回帰が実行不能・失敗のまま「回帰なし」をPASSにしない。
- **限定修理**: 既存テストのパス・fixture・起動設定など局所的な破損は、期待結果・合否条件・証拠要件を変えず、新規基盤を増やさずに直せるならオーケストレーターが根拠を記録してGeneratorへ戻せる。対象区分は `verification-infra` のまま、分類は `verification-scope-issue` として限定修理可能であることを記録し、製品の欠陥に偽装しない。Evaluatorは修理せず独立再評価する。限定修理は同一Sprintで1回まで自動で試し、再失敗・修理範囲不明・要求拡大ならユーザーへ選択肢を返す。Retry CountとSpec-Issue Countは消費せず、Lineage Dispatchesと検証のみdiffのガードは通常どおり適用する。
  resolverは既存入力だけを使う: `--event retry`、`--failure-kind`は省略、`--retry-count`は据え置き、`--current-model-tier`はstateの値。`verification-scope-issue`分類はfeedback/stateに残し、resolverへ未対応の分類を渡さない。
- **検証要求の判断が必要な場合**: 新しい証拠形式・新規collector、期待結果や検証範囲の変更、原因不明や限定修理で解消しない問題は自動修理せず `verification-scope-issue` としてユーザーへ返す。
- **Lineage Dispatches budget**: オーケストレーターは Generator / Evaluator の dispatch 前に、
  state.md の `Lineage Dispatches` の現在値が runtime config の `limits.max_lineage_dispatches`
  （既定 10）に達していれば、+1 せず dispatch を止めてユーザーへ状況と選択肢を報告する。
  未満なら +1 を state.md へ記録してから dispatch する（この +1 は同一の論理 dispatch への予約として扱う。
  子 Agent 作成前の同期的な launch rejection では予約を fallback へ引き継ぎ、再解決後の再 dispatch で
  +1 し直さない。最終的に子 Agent を作成しないまま中断する場合だけ予約を取り消して -1 し、実 dispatch 数と一致させる）。
  この値は同一の Base Sprint 系譜（`sprint-NNN` とその patch 群、spec-issue による契約改訂を含む）で
  累積し、spec-issue 分類、patch 採番、fresh ローテーション、Retry Count のリセットでは 0 に戻さない。
  次のメインスプリントへ進むとき、またはユーザーが明示的にリセットを指示したときだけ 0 に戻す。
- **検証コード規模の監視**: ある Sprint ラウンドの実装 diff が検証コードのみ（製品コード 0 行）に
  なった場合、Generator はその事実を progress に明記する。これが 2 回連続したら、オーケストレーターは
  次の dispatch 前にユーザーへ報告する。リポジトリ全体で検証コードの規模が製品コードを上回った場合も
  progress の引き渡し事項で報告し、Planner の棚卸し提案（ユーザー承認制）につなげる。
- ガードの発火は打ち切りではなく選択肢の提示である。発火時は (a) 要求どおり修正する、
  (b) 証拠水準を下げて受理する、(c) Non-scope 化して先へ進む、を具体的な影響とともに選択式で示す。
  厳格化要求の中身が正当かどうかは機械判定せず、ユーザーが判断する。

### Step 4: 遷移（オーケストレーターが state.md を更新）

feedback の判定に応じて、オーケストレーターが必ず state.md を更新してから次へ進む。

- **合格** → Status を `done`、Retry CountとSpec-Issue Countを0にし、`Current ID`を次のスプリントへ進める。
  次Sprintがある場合は、`Model Tier`を最後に実dispatchした値のまま保持し、`Rotate: none`としてStep 2へ進む。
  Step 2がそのtierを`currentModelTier`としてresolverへ渡し、desired tierとの比較後にstateを更新してからdispatchする。
  次のメインスプリントへ進むときは`Lineage Dispatches`を0に戻す（同一Base Sprintのpatch群へ進む場合は保持する）。
  全スプリント合格で次dispatchが無い場合だけ、Model Tierを`standard`、Rotateを`none`へ戻して完了する。
  ユーザーが acceptance タグを許可している場合だけ、
  `git tag sprint-NNN-accepted`（Patch は `sprint-NNN-patch-PPP-accepted`）を打つ（既定はオフ）。
- **不合格（implementation-issue）** → Retry Count を +1してstate.mdへ記録する。1回目もresolverで対象のriskと設定を解決し、`resume: true`の実証がある場合だけ同tierのGeneratorをresumeする。未実証ならfresh Agentを使う。
  2回目はModel Tierを`strong`、Rotateを`model-escalation`へ更新してから、
  古いstandard Generatorをresumeせずfreshなstrong GeneratorでStep 2へ戻す。
- **不合格（spec-issue）** → feedback が「仕様自体の欠陥」と分類した場合は Generator に差し戻さない。
  Retry CountとModel Tierを消費せず、Spec-Issue Count を +1 して state.md へ記録し、Planner に feedback を
  渡して契約・仕様の修正を依頼する。Plannerが差分を記録し、意味不変の誤記・参照訂正なら既存承認の範囲で再承認なくStep 2に戻せる。
  目的・挙動・受け入れ基準・閾値・証拠要件が実質的に変わる場合はユーザーへ差分を確認する。意味不変か不明なら確認する。
  同一スプリントで Spec-Issue Count が `limits.max_spec_issue_returns`（既定 2）に達したら、
  Planner との往復を続けずユーザーへ状況と選択肢を報告する。
- **不合格（verification-scope-issue）** → 上の限定修理条件をすべて満たし、まだ試していなければ同じSprintのGeneratorへ1回だけ戻す。それ以外はRetry CountとSpec-Issue Countを消費せず、(a) 修正 (b) 証拠水準を下げて受理 (c) Non-scope化 の影響を示し、ユーザーへ判断を返す。未確認項目をPASSにはしない。
- **ユーザー判断による完了（accept-as-is）** → ユーザーが残余リスクを明示的に引き受けて完了を選んだ場合、
  Evaluator の評価結果（未達項目を含む）を feedback に保持したまま、Status を `done-by-user-decision` にし、
  理由と未達項目への参照を state.md に記録して次へ進む。Evaluator の記録は書き換えない。
- **エスカレーション** → 同一スプリントで Retry Count が 3 に達したら、ループを止めてユーザーに
  状況（何が何回失敗したか、Evaluator の指摘、考えられる選択肢）を報告し、判断を仰ぐ。追加dispatchはしない。
  Spec-Issue Count と Lineage Dispatches の上限到達も同様にユーザーへ返す（検証スコープガード参照）。

## 小さい引き渡し

microでも契約・progress・feedbackの3書き手は分離する。ただし各ファイルは対象、変更/確認結果、基準、根拠、残課題への短いリンクで足りる。既存仕様や6軸表を複製せず、3軸だけを評価する。自動チェック追加は再発リスクと保守負担に見合うものに限る。
