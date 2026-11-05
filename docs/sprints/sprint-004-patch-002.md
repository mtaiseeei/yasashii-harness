# Sprint 004 Patch 002 — 割込みから本題へ復帰（#14）

- Type: patch / Parent: sprint-004 / Risk: standard / 対象版: v0.6.1系列
- 根拠: [Issue #14](https://github.com/mtaiseeei/agentic-harness/issues/14)。開始条件は#13の独立評価PASS。
- 親目的: 4件を順に完了し、修理が終わったら承認済みの元依頼へ戻れるpluginを準備する。
- 担当範囲: Loopの再開・dispatch・レビュー後継続、state / scope、3 roleの短い引き渡し指示。
  割込み管理用の専用コマンド・汎用キュー・追加budgetは作らない。

## 完了条件と確認

Issue #14の受け入れ条件を満たす。目的・完了条件・現在作業を保持し、割込み時だけ終了条件と具体的復帰先を追加する。
「A実装→B発見→直して→B修理・必要確認」の次はAの残件となり、無関係な軽微問題Cは残課題に置く。
B完了を全体完了とせず、復帰の再承認や元作業の全レビューを要求しない。
明示的なA取消・置換には従い、同一外部入力待ちを新情報なく繰り返さない。

[今回のrubric](../spec/rubric.md)に従い、Codex fresh agentが合成会話と短いstateから上記を実際に判断する。
再開・取消/置換・外部待ちを含め、短い入力と判断結果を記録する。関連既存軽量回帰を確認し、専用評価基盤は作らない。

## 引き渡し

子roleは親目的・担当範囲・終了条件・復帰先を戻り値にも含める。Generatorはprogress、Evaluatorはfeedbackを所有する。
stateは親だけが更新する。PASS後の復帰先は [Patch 003 / #15](sprint-004-patch-003.md)。
限定commitのprefixは `sprint-004-patch-002`。[保護境界](../spec/constraints.md)を守る。
目的・範囲は既決のためGrillingを省略する。
