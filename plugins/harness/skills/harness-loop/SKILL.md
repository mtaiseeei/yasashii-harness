---
name: harness-loop
description: Harness管理下で承認された開発をPlanner・Generator・独立EvaluatorとSprint正本で継続する。初期化・導入確認だけならusing-harnessへ。
---

# Harness の通常進行

あなたはオーケストレーター。ホストが対応する場合はroleをdispatchし、対応しない場合は
roleごとの独立作業単位で進める。GeneratorとEvaluatorを分離し、自己評価を合否の根拠にしない。
現在の明示依頼・既決事項・既存承認を引き継ぎ、承認済みの範囲は開始確認を重ねず完了まで進める。

## 正本と書き手

| 正本 | 唯一の書き手 |
|---|---|
| `docs/spec.md`（短い索引）、必要な `docs/spec/*.md`（rubric含む）、`docs/sprints/sprint-*.md`（契約） | Planner |
| `docs/progress/sprint-*.md`（実装と引き渡し） | Generator |
| `docs/feedback/sprint-*.md`（独立評価と証跡） | Evaluator |
| `docs/sprints/state.md`（Current ID、Status、各counter、Model Tier、Rotate） | オーケストレーターのみ |

Statusはstateにだけ持つ。順序はCurrent IDとNext Plannedに従う。合否を記録してから次へ進む。
IDは `sprint-NNN` / `sprint-NNN-patch-PPP`。延期/置換には理由を記録し、黙って飛ばさない。
各roleは自分以外の正本を直さず、自分の引き渡しから担当へ連絡する。

## 開始・再開

- `init` / `check`だけなら[入口](../using-harness/SKILL.md)へ戻り、結果を報告して停止する。
- 初回はpluginの `scripts/harness.mjs init --root <repo>` で不足分だけno-overwrite生成する。
  初期化では既存guidance、設定、Agent定義を上書きしない。明示承認済みのguidance保守は、
  固有規則とdirtyを保持して必要差分を反映できる。設定・model・Agent定義の変更権限は増やさない。
  初期化や旧state移行が必要なときだけ[state](references/state.md)を読む。
- stateのCurrent ID、対象契約、関連仕様と直前feedbackを確認する。再開はファイルの更新と
  現在の差分を確認し、未読・変更済み・矛盾する箇所だけ読み直す。情報が欠けるfresh作業単位は必要正本を読む。
  全履歴の照合、無関係な仕様・旧ログの全文読込、全回帰の反復は通常再開の条件にしない。
- 追加依頼は[変更分類](references/scope.md)で直接修正 / micro / 通常Patchに分ける。
  ドキュメントでも製品としての指示挙動が変わるなら直接修正とは扱わない。
- 最初のPlannerを含む全roleのdispatch前にruntime resolverを使い、実効model/effort・lifecycleを確認する。
  初回、host/config変更、tier変更、launch拒否、resume可否が不明なときは[runtime](references/runtime.md)の該当節を読む。
  既定はhost継承。明示値を推測変換せず、起動metadataなしにlaunch-verifiedを主張しない。

## 1. Planner

対象契約が未確定・要改訂のときだけ[Planner](../../agents/planner.md)へ依頼と既決事項を渡す。
Grilling gateの必要性判断を使い、未決の重要な製品判断はユーザーへ確認する。
既存承認と明示委任を尊重し、明確な承認済み依頼で新しい開始承認を作らない。
PlannerはWhatを定義し、HowはGeneratorへ委ねる。契約・rubricの実質変更には
[厳格化ゲート](references/scope.md)を適用する。意味不変の訂正は担当が根拠を記録して行える。

## 2. Generator

Generatorは高リスク・2回目のimplementation不合格・証拠付き推薦でstrong、tier変更はfresh。
同tierのresumeもmodel/effort保持の実証が必要。状態更新はdispatchより先に行う。

[Generator](../../agents/generator.md)へ対象Sprintと必要正本を渡し、1回で1Sprintを実装させる。
起動/確認方法、変更と関連依存、実行結果、残課題がprogressにあれば `awaiting-eval` にする。
既存dirtyを保護する。commit・stage・pushはこのSkillから許可を追加しない。

## 3. 独立Evaluator

[Evaluator](../../agents/evaluator.md)へ契約・rubric・引き渡しを渡し、実物を動かして評価させる。
UIは利用可能なブラウザ、非UIはコマンド/API/入出力で確認する。Evaluatorは実装を直さない。
評価基準・証拠の十分性・再評価の増分原則は[評価](references/evaluation.md)。
契約/rubricの証拠で十分（safe harbor）とし、列挙外の新規検証基盤を合否条件にしない。
各findingは `product` / `verification-infra` に分ける。不明ならproduct。
無関係なdirtyだけで既存証跡を失効させず、候補と関係する依存物の実差分を確認する。

## 4. 記録して継続

- 合格の証跡を確認して `done` にし、Retry CountとSpec-Issue Countを0に戻して次へ進む。
  次dispatchがあれば最後のModel Tierをresolverへ引き継ぐ。全完了時だけstandard/noneへ戻す。
- implementation-issueはRetry Countを増やしGeneratorへ。3回連続不合格なら追加dispatchを止めユーザーへ返す。
- spec-issue、verification-scope-issue、基準変更、検証のみdiffは[特殊失敗と検証スコープガード](references/scope.md)へ。
  既存検証の限定修理は期待結果・基準・証拠要件不変かつ同Sprint1回まで。修理後は独立再評価する。
- ユーザーが未達と残余リスクを明示して受理したときだけ `done-by-user-decision`。
  Evaluatorの未達記録を残す。証跡なしの通常合格は無効。

## dispatchの上限

Generator/Evaluatorの実dispatch前にLineage Dispatchesを確認し、`limits.max_lineage_dispatches`
（既定10）未満なら+1を記録する。上限ならdispatchせず、修正/低い証拠水準で受理/Non-scope化を示す。
同じBase Sprintのpatch、spec-issue、fresh化では予算をリセットしない。
次メインSprintまたはユーザーの明示resetだけで0に戻す。子作成前launch拒否は予約をfallbackに引き継ぎ、
子を作らず最終中断したときだけ取消す。Spec-Issue Countは `limits.max_spec_issue_returns`（既定2）で停止する。
詳細な状態形式・移行・特殊遷移は必要時だけ参照し、参照先をすべて毎回読むことを前提にしない。

## yasashiiオーケストレーション

- ユーザー向け報告は「やったこと／結果／次に何が起きるか」の3行を基本にする。
- Planner / Generator / Evaluator の正式名称は残し、初出時だけ短い役割説明を添える。
- 承認済み範囲の実装・修正・独立評価は完了まで続け、次の一手と根拠を短く伝える。範囲外の提案や新たな製品判断は承認前に着手しない。
- 英語エラーは原文を検索用に残しつつ、何が起きたかと対処を日本語で先に示す。
- やさしさを理由に、役割分離、評価閾値、証跡、記憶保護、回帰ゼロ許容を省略しない。
