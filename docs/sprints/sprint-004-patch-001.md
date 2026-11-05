# Sprint 004 Patch 001 — 現在地の置換更新（#13）

- Type: patch / Parent: sprint-004 / Risk: standard / 対象版: v0.6.1系列
- 根拠: [Issue #13](https://github.com/mtaiseeei/agentic-harness/issues/13)。開始条件は#12の独立評価PASS。
- 親目的: 4件を順に完了し、元依頼の完了まで継続できるpluginを一つの次patchとして準備する。
- 担当範囲: state / migration正本、Loopの再開・引き渡し導線、関係する軽量回帰。
  実業務repoは変更せず、既存upgradeを再利用する。CLI機能追加・parser新設を前提にしない。

## 完了条件と確認

Issue #13の受け入れ条件を満たす。現在地の単一欄を置換更新し、旧本文は移管済み履歴として扱う。
複数回の進捗・レビュー・復帰で日報を増殖させず、承認・制約・未達・counter・復帰先・証拠を保持する。
合成長stateの既存upgrade preview / applyを実行し、200行より後の有効制約と重複旧Current IDを含めて確認する。
保護検査で拒否される例では原文を残し、同じstateの短い現在地・整理未完了・許可済み独立作業を示すfallbackを確認する。
新セッションは現在地と必要参照から次の一手を判断できる。archive全読や全過去判断の整合を要求しない。

証拠は [今回のrubric](../spec/rubric.md) の合成実行結果と関連回帰で十分。
新しい停止閾値・整理エンジン・監視ループを作らず、保護検査を弱めない。

## 引き渡し

目的・担当範囲・終了条件・復帰先とともに、Generatorはprogress、Evaluatorはfeedbackへ記録する。
stateは親だけが更新する。整理未完了と本題の未完を区別し、承認不明の副作用だけを留保する。
PASS後の復帰先は [Patch 002 / #14](sprint-004-patch-002.md)。限定commitのprefixは `sprint-004-patch-001`。
[保護境界](../spec/constraints.md)を守る。既決Issueの実装でありGrillingは省略する。
