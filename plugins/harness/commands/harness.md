---
description: ハーネス駆動開発の開始・継続、またはHarnessの安全な初期化・導入確認を行う。
argument-hint: <作りたいもの> | init | check | upgrade
---

引数: $ARGUMENTS

- `/harness init`: `node "$CLAUDE_PLUGIN_ROOT/scripts/harness.mjs" init --root "$(pwd)"` を実行する。
- `/harness check`: `node "$CLAUDE_PLUGIN_ROOT/scripts/harness.mjs" check --root "$(pwd)"` を実行する。
- `/harness upgrade`: `node "$CLAUDE_PLUGIN_ROOT/scripts/harness.mjs" upgrade --root "$(pwd)"` で文書移行preview。
  必要時だけ[移行手順](../skills/harness-loop/references/migration.md)を読み、既存承認範囲で候補を準備・適用する。

init/check/upgradeだけなら結果を報告し、PlannerやSprintを開始せず、harness-loop に進まない。
それ以外は [using-harness](../skills/using-harness/SKILL.md) へ依頼と既決事項を渡す。
未確定の製品判断があればPlannerのGrilling gateに従う。明確な承認済み依頼を再承認待ちにしない。
通常開発の不足分生成も同じ `scripts/harness.mjs init` を使い、既存ファイルは上書きしない。
ホストが対応する場合は各roleをdispatchし、不可ならroleごとの独立作業単位に分離する。
