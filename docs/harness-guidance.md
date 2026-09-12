# このrepoの指示保守

現行の入口は [AGENTS.md](../AGENTS.md) と [using-harness](../plugins/harness/skills/using-harness/SKILL.md)。
通常再開は現在状態と該当仕様だけを読む。全履歴や全referenceを読込むための索引ではない。

root guidanceは常設境界・基本コマンド・条件付き入口、現在状態はstate、領域仕様は必要なspecへ置く。
重要決定は該当仕様と判断理由へ反映し、置換済みの判断を識別する。独自規則・dirtyを保護して必要差分を統合する。
plugin更新は既存repo文書を書き換えない。保守移行が必要な場合だけ
[previewと適用手順](../plugins/harness/skills/harness-loop/references/migration.md) を使う。

完了時は変更・必要検証・対象版・下流同期・未配備を区別する。公開/installed更新は別の承認範囲による。
