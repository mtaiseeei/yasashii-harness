# Codex custom agent経由のLuna routing実験

Status: Implemented for v0.5.1 / 2026-08-03
対象: Planner / Generator / Evaluatorに共通するCodex dispatch経路
対象外: 利用者の実homeにあるglobal agent fileの無承認作成

## 結論

Lunaをcustom agent経由で起動する経路は、現行Codex CLI 0.146.0とCodex Desktopで実際に動作した。
この経路はGenerator専用にせず、resolverがPlanner / Generator / Evaluatorの各roleについてmodelを解決した後に
適用する共通のdispatch modeとして設計する。

custom agent定義を追加する前から開いていたCodex Desktop taskでは、`spawn_agent` schemaに`agent_type`が無く
Lunaもmodel候補に無かった。しかし、定義を含むworking treeから新しいApp taskを作成すると、Appの通常Subagent
機能でcustom agentを選択できた。したがって定義の新規作成後は、新しいCodex taskで再開する必要がある。

推奨する責務分離は次のとおり。

- `.harness/config.toml`の各role設定が、望むmodel / effortの正本であり続ける。
- git管理外の`.harness/config.local.toml`に、custom agent経路を使うかどうかだけを置く。
- global custom agentはLunaのmodelだけを固定し、effortは各dispatchから渡す。
- modeが`false`なら、modelがLunaでもcustom agentを使わない。
- modeが`true`なら、Lunaを選んだすべてのroleで同じcustom agent経路を使う。
- 将来nativeなLuna直接dispatchが安定した場合は、modeを`false`にするだけでcustom agent経路を迂回できる。

## 想定config

共有configのrole設定は現行schemaを維持する。

```toml
[hosts.codex.roles.planner]
model = "gpt-5.6-luna"
effort = "high"

[hosts.codex.roles.generator]
model = "gpt-5.6-luna"
effort = "xhigh"

[hosts.codex.roles.evaluator]
model = "gpt-5.6-sol"
effort = "high"
```

custom agent経路の選択は、端末ごとの差があるため個人configへ置く。

```toml
[hosts.codex.custom_agents]
enabled = true
```

`enabled = false`または未指定ならdirect dispatchだけを使う。これはmodel選択とは独立した上位の経路設定である。

## 推奨するglobal agent定義

作成先は`~/.codex/agents/harness-luna-worker.toml`とする案を採る。role名を含めないため、Planner、Generator、
Evaluatorのどれでも使える。role固有のscope、書き込み権限、成果物形式は親がdispatch messageで渡す。

```toml
name = "harness_luna_worker"
description = "Luna worker for a narrowly scoped Harness role task."
model = "gpt-5.6-luna"
developer_instructions = """
Handle only the task assigned by the parent agent.
Follow the role, scope, file ownership, and output contract supplied in that task.
Do not make unrelated changes.
Verify the result when practical.
Return a concise result with evidence, relevant paths, and caveats.
"""
```

`model_reasoning_effort`は意図的に置かない。実験では、省略した場合にdispatch側の`xhigh`と`medium`が
それぞれ子へ反映された。ここを固定すると、`.harness/config.toml`とagent定義が食い違った際にagent定義が勝つ。

## Dispatch規則

1. resolverが対象roleのmodel / effortを通常どおり解決する。
2. `hosts.codex.custom_agents.enabled`が`false`ならdirect経路を選ぶ。
3. `true`かつ解決済みmodelが正確に`gpt-5.6-luna`なら、`agent_type = "harness_luna_worker"`を選ぶ。
4. custom agent経路では`model`引数を渡さない。modelはagent定義から適用する。
5. 解決済みeffortが`inherit`でなければ、`reasoning_effort`としてdispatch時に渡す。
6. custom agent指定時はfull-history forkを使わず、freshな子として起動する。
7. 起動後、childの`session_meta.agent_role`、最初の`turn_context.model` / `effort`を照合する。

現行実装では、dispatch引数のmodel / effort適用後にcustom agent layerが適用される。したがってagent定義側に
modelやeffortがあれば、そちらが最終値になる。またcustom agentを指定したfull-history forkは拒否される。

## 安全な作成フロー

resolverはread-onlyのままにし、global fileを直接作らない。別のprovision処理を明示承認後だけ実行する。

1. modeが`true`でLuna経路が必要になったら、`~/.codex/agents/harness-luna-worker.toml`を確認する。
2. 無ければ、作成先と完全な内容を示して承認を求める。
3. 承認後にdirectoryとfileを作成し、TOML parseと必須fieldを検証する。
4. 既存なら、名前、model、developer instructions、およびeffort固定の有無を検証する。
5. 互換ならそのまま使う。競合していれば上書きせず、差分と選択肢を示す。
6. 新しいagent名の登録は親セッション開始時に行われるため、作成後は新しいCodex taskで再開する。

単に「fileが存在する」だけでは互換と判定しない。特に`model_reasoning_effort`が固定されている既存定義は、
dispatch-time effortを使う設計とは競合する。

## 実験結果

probeはproject localの`.codex/agents/`へ置き、すべてread-only taskとして実行した。結果はAgent本人の自己申告ではなく、
child rolloutの`session_meta`と最初の`turn_context`で確認した。

| Agent定義 | Dispatch要求 | child metadata | 結果 |
| --- | --- | --- | --- |
| Luna + `xhigh`固定 | 指定なし | Luna / xhigh | PASS |
| Lunaのみ | `xhigh` | Luna / xhigh | PASS |
| Luna + `xhigh`固定 | `medium` | Luna / xhigh | PASS: 定義側が優先 |
| Lunaのみ | `medium` | Luna / medium | PASS: Dispatch側を反映 |
| Lunaのみ、Codex Desktopの新規task | `medium` | Luna / medium | PASS: App native経路 |

構造検証とprovisionの安全性検証は次で再実行できる。

```bash
node plugins/harness/scripts/check-runtime-config.mjs
```

Codex DesktopのApp実験では、別taskを作成し、shellの`codex` / `codex exec`を禁止した。Appの通常Subagent機能から
`harness_luna_split_probe`をfresh childとして起動し、child metadataの`originator: Codex Desktop`、
custom agent role、`model: gpt-5.6-luna`、`effort: medium`を確認した。

## Sprint 001で実装した境界

- resolverは`hosts.codex.customAgents`と各roleの`dispatch`をread-onlyで返す。
- `dispatch.mode`は`direct` / `custom-agent`、`dispatch.status`は`ready` / `blocked`を区別する。
- `missing`では完全な作成予定TOMLを提示し、`conflict`では差異だけを示して既存fileを保護する。
- 承認後の作成は別の`plugins/harness/scripts/provision-codex-agent.mjs --approve`へ分離した。
- provisionは作成後に読み直してTOMLと互換条件を検証し、新しいCodex taskが必要だと返す。
- 初期実装はLunaだけに限定し、全roleでfresh、effortはdispatch時指定とした。
- strong Generator判定はcustom agent選択より先に行い、Sol/highへ直接送る。

## 公式根拠

- Codex custom agents: <https://learn.chatgpt.com/docs/agent-configuration/subagents>
- Codex 0.146.0 custom role application: <https://github.com/openai/codex/blob/rust-v0.146.0/codex-rs/core/src/agent/role.rs>
- Codex 0.146.0 spawn order: <https://github.com/openai/codex/blob/rust-v0.146.0/codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs>
- Codex 0.146.0 dispatch validation: <https://github.com/openai/codex/blob/rust-v0.146.0/codex-rs/core/src/tools/handlers/multi_agents_common.rs>
- Codex 0.146.0 agent discovery: <https://github.com/openai/codex/blob/rust-v0.146.0/codex-rs/core/src/config/agent_roles.rs>
