---
name: harness-loop
description: 通常機能の短い計画と完成時独立レビュー、大きな開発のSprint進行を支える。小変更はusing-harnessで直接完了できる。
---

# Harness の通常進行

現在の目的・既決事項・承認範囲を引き継ぎ、実装・必要検証・独立レビューまで進める。
小変更なら[入口](../using-harness/SKILL.md)の直接修正で足りる。全変更へ3役やSprint文書群を強制しない。

## 再開と正本

既存の現在状態 → 該当領域の仕様・コード → 矛盾や理由が必要な場合だけ関連履歴、の順に読む。
全Sprint照合・全履歴読取を開始条件にせず、参照先を一括読込しない。
既存repoの仕様や作業文書を使い、CONTEXT.mdや定型文書群を無条件で追加しない。
仕様変更時は該当仕様と決定理由を整合更新し、置換した判断を識別する。

- 現在状態（既定 `docs/sprints/state.md`）はオーケストレーターのみ更新する。
  目的、進行中作業、未解決事項、次の一手、承認・制約、必要仕様、対象版と証跡への参照を持つ。
  実装済み・検証済み・配備済みを分ける。現在内容を更新し、過去詳細は履歴へ保持する。
  state/NEXT_SESSION/PROJECTに現在状態の正本を重複させない。
- 通常機能の計画と引き渡しは短くてよい。既存のissueや作業文書へ集約でき、3文書は不要。
- 大きな開発でSprintを使う場合は、Plannerが仕様・rubric・契約、Generatorが実装・progress、
  独立Evaluatorがfeedbackを担当する。所有を越境せず必要な担当へ変更を渡す。
  書式や旧state整理が必要なときだけ[state](references/state.md)を読む。

## 計画・実装

必要な短い計画には目的・変更範囲・確認方法を示す。既存依頼で明確ならそれを利用する。
未決の重要判断や大きな設計があるときだけ[Planner](../../agents/planner.md)を使う。
既決事項や委任済み実装詳細を聞き直さず、承認済みの開始に再承認を要求しない。
高リスク操作は実行前に対象・影響・復旧方法・既存承認を確認し、未承認部分だけ利用者へ問う。

実装担当は[Generator](../../agents/generator.md)として意味のあるまとまりを実装し、必要検証する。
承認された可逆な実装判断・修理は自律的に進め、無関係な追加を合格条件にしない。
小変更に再分類して進行中の機能追加全体の独立レビューを省略してはならない。

roleをdispatchするときだけ、最初のPlannerを含めresolverで実効model/effortとlifecycleを確認する。
既定はhost継承。初回、host/config/tier変更、launch拒否、resume不明時だけ[runtime](references/runtime.md)。
Generatorのtier変更はfresh。同tierのresumeもmodel/effort保持の実証が必要。
Codexはnative built-in/default Agentを使う。subagent不可なら独立作業単位へ分け、実装者の自己評価を
独立レビューと呼ばない。独立確認不能なら未確認として報告し、必要なら利用者の受理判断へ渡す。

## 完成時の独立レビュー

[Evaluator](../../agents/evaluator.md)へ対象の計画・仕様・差分・実行方法を渡す。
UIは実操作、非UIはコマンド/API/入出力で確認し、対象版と結果を短く残す。
評価基準・証拠の十分性・証跡再利用は必要時に[評価](references/evaluation.md)を読む。
修正後は変更箇所と影響範囲を中心に再評価し、新しい懸念がなければ全検査を反復しない。
合格を記録してから次の作業へ進む。独立評価を要する作業の未達を利用者が明示受理した場合だけ
`done-by-user-decision` として未達と残余リスクへの参照を保持する。小変更は担当の必要検証で完了できる。

## Sprintの失敗と上限（Sprintを使う場合だけ）

Current ID、Status、Retry Count、Spec-Issue Count、Lineage Dispatches、Model Tier、Rotateを現在状態に保持。
Generator/Evaluator dispatch前に `limits.max_lineage_dispatches`（既定10）を確認し、未満なら+1を先に記録する。
同じBase Sprintのpatchやfresh化で累積をリセットしない。子作成前launch拒否は予約をfallbackに引き継ぐ。
implementation不合格はRetry Count+1、3回連続で追加dispatchを止め判断を返す。
仕様の実質変更、検証のみdiff、限定修理、`limits.max_spec_issue_returns`（既定2）など特殊時だけ
[変更・失敗](references/scope.md)を読む。通常機能にこの管理項目群を新設する必要はない。
合格時はRetry/Spec-Issueを0にし、次dispatchがあるなら最後のtierをresolverへ引き継ぐ。
全完了時だけstandard/noneへ戻す。commit・push・公開の権限はセッションの承認に従う。
