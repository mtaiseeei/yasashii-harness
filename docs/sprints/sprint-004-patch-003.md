# Sprint 004 Patch 003 — 配布と適用の導線（#15）

- Type: patch / Parent: sprint-004 / Risk: standard / 対象版: v0.6.1
- 根拠: [Issue #15](https://github.com/mtaiseeei/agentic-harness/issues/15)。開始条件は#14の独立評価PASS。
- 親目的: 先行3件を両hostで読める形に届け、一つの次patch・source PRへまとめる。
- 担当範囲: 両host入口・templates・guidance、既存upgrade案内、配布manifestと必要な統合検証。
  詳細正本への短い実行導線を設け、ルール全文を複製しない。小変更の直接完了を維持する。

## 完了条件と確認

Issue #15の受け入れ条件を満たす。評価前に収束規則、開始/復帰時に目的と復帰先、再開/引き渡し時にstate規則を読む。
合成の新規repoと既存guidanceありrepoで、独自規則・承認・dirtyを保った既存upgradeの実適用を確認する。
巨大stateと旧global相当の合成例でpreviewと残す/置換する規則を確認する。実際の個人global設定は変更しない。
global fallback案は10行以内とし、対象repoの新規則の実読込・整合確認まで既存globalを残す案内を含める。

[今回のrubric](../spec/rubric.md)の全既存check・manifestを確認し、正式な隔離手段があればlocal marketplace installを実行する。
隔離手段がなければrubricの代替確認と未実施理由を記録し、HOME / CODEX_HOME再割当や新検証基盤で補わない。
Claude CLIで少数の合成入力による収束判断・重大例外を確認し、Codexの本題復帰・再開は先行の有効な実判断証拠を利用する。
ツール利用不能は限定記録し、静的検査だけでLLM挙動を確認済みとせず、新たな大規模検証基盤を要求しない。

## 引き渡し

Generatorはprogress、Evaluatorはfeedbackへ対象版・実読込path/内容・短い入力/結果・未実施範囲を記録する。
stateは親だけが更新する。PASS後は親へ戻り、4件の結果を一つのsource PR候補へまとめる。Issueはmerge時に閉じる。
source公開 / installed更新 / fresh session実読込 / 消費repo適用を分け、実装済みを全環境へ反映済みと報告しない。
限定commitのprefixは `sprint-004-patch-003`。main merge / tag / Release / 全host更新へ過去承認を流用しない。
[保護境界](../spec/constraints.md)を守る。既決Issueの実装でありGrillingは省略する。
