# Constraints

## 安全境界

- ユーザー所有の`~/.codex/agents`、project-local Agent定義、導入済みrepoのruntime configを変更・削除しない。
- 旧`hosts.codex.custom_agents`の存在だけを理由にruntime解決やHarness loopを停止しない。
- resolverはread-onlyを維持し、global Agent定義やtarget repoの設定を生成・更新しない。
- 初期化は既存のAGENTS.md、CLAUDE.md、`.codex/agents/`、`.claude/agents/`、runtime configを上書きしない。
- target repoへpackage manifest、lockfile、`node_modules`、network dependencyを追加しない。

## Routing不変条件

- model / effortは前後空白以外を補正せず、resolverが解決した正式値をそのままdispatchする。
- native direct dispatchがLunaの正式経路であり、custom agent経路へ分岐しない。
- availability fallbackは、Lunaの子作成前拒否から設定済みstrong Sol、さらに拒否なら`inherit`の順とする。
- Terraと`codex exec`を通常、昇格、availability fallbackのいずれにも自動選択しない。
- strong判定、高リスク判定、retry閾値、`spec-issue` routing、model tierのstate記録順を変えない。
- `launch-verified`はchild host metadataまたはhost traceが指定model / effortと一致した場合だけ使う。
- routed model / effortを保持するresumeが未確認の実行面では、既存どおりfreshな独立作業単位を使う。

## 配布と記録

- 新規配布テンプレートには`hosts.codex.custom_agents`を含めない。
- 旧設定を受理する互換処理は、custom agentのprovisioning機能を配布へ残す理由にしない。
- 2026-08-17の直接起動証拠と、それ以前のApp制約の歴史的記録を混同しない。
- versionを変更する場合はClaude marketplace、Claude plugin manifest、Codex plugin manifestの正本を同期する。
