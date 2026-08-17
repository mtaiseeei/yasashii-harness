# Codex model routing と自動昇格の実装記録

Status: Implemented in v0.4.0 and updated through v0.5.3 / 2026-08-17 native Luna direct dispatch verified
対象: `agentic-harness` plugin本体  
対象外: Harness導入済みrepoの自動移行、ユーザー所有Agent定義の変更

## 目的

Codexでroleごとのmodel / effortを明示した場合、native `spawn_agent`のbuilt-in/default Agentへ正確な値を
直接渡す。通常Generatorが利用不能な場合はconfigured strong Generatorへ切り替え、さらに利用不能なら
`inherit`へ戻す。Terraとshell-levelの`codex exec`は自動fallbackに使わない。

配布時のmodel / effort既定はClaude Code、Codexとも全role `inherit`である。利用者が明示設定した場合にだけ、
次のstandard / strong規則を適用する。

| role | 通常例 | strong例 | 用途 |
|---|---|---|---|
| Orchestrator | Sol / medium | Sol / high | 本チャット。runtime configからは変更しない |
| Planner | Sol / high | 同じ | 要件、受入条件、rubric |
| Generator | Luna / xhigh | Sol / high | 実装。高リスクや失敗時だけstrong |
| Evaluator | Sol / high | 同じ | 証拠付き評価と自己レビュー。実装しない |

## Generator昇格規則

1. 通常の初回実装と1回目の`implementation-issue`はstandard tier。
2. 2回目の連続`implementation-issue`ではfreshなstrong Generatorへ切り替える。
3. 高リスクSprintと証拠確認済みEvaluator推薦は最初からstrong。
4. 3回目の連続失敗は自動継続せずユーザーへ返す。
5. `spec-issue`はPlannerへ戻し、Generator昇格を消費しない。

model tierが変わる前に、オーケストレーターが`docs/sprints/state.md`へ`Model Tier`と`Rotate`を記録する。
失敗・リスクによる変更は`model-escalation`、通常modelの利用不能による変更は`model-availability`である。
`resume: true`は、routed model / effortを保持することをhost metadataで確認済みという意味に限る。
保持を確認できない実行面ではfreshにする。

## Native direct dispatch契約

```text
config.toml
   -> parser / merge / validation
   -> routing decision
   -> host capability check
   -> built-in/default Agentへmodel・reasoning_effortを直接渡す
   -> child host metadataで実値を確認
```

resolverの`dispatch-ready`または`dispatch-attempt`は、実際の起動modelを証明しない。
`launch-verified`はchild session metadataまたはhost traceが指定model / effortと一致した場合だけ使う。
Agent本人の自己申告、resolver出力、model catalog表示だけではlaunch proofにしない。

Codexの公開schemaに`model` / `reasoning_effort`が表示されなくてもruntime parserが受理する場合がある。
schema omissionだけで`inherit`へ戻さず、確認済みapplication pathへ正確な値を1回だけ渡す。
`unknown field`はapplication path不在、`Unknown model`はmodel値の起動前拒否として区別する。

## Availability fallback

子Agent作成前の同期的な`Unknown model`だけをresolverへ戻す。standard GeneratorのLunaが拒否された場合は、
configured strong Solへfreshに切り替える。Solも拒否された場合はmodel / effortを`inherit`へ戻す。
実装失敗、テスト失敗、crash、timeout、通信エラー、子作成有無が不明な失敗はlaunch rejectionにしない。

## Legacy custom-agent設定

Version 0.5.1ではApp互換のためHarness専用custom-agent経路を試験配布した。Version 0.5.3ではnative direct
dispatchへ一本化し、検査・provisioning・routing分岐を配布物から撤去した。

旧`hosts.codex.custom_agents`tableは既存repoを止めないためparserが受理するが、値はroutingへ影響しない。
resolverは非推奨path、無視したこと、native direct dispatchが実効経路であることをwarningへ出す。
既存設定やユーザー所有Agent定義を削除する必要はなく、Harnessはそれらを変更しない。

## 実起動証拠

### Codex CLI

CLI `0.144.6`では公開schemaに欄が無くてもruntime parserが`model` / `reasoning_effort`を受理し、native
`spawn_agent`でfreshなLuna/xhigh childを起動した。child metadataも`gpt-5.6-luna` / `xhigh`と一致した。

### Codex App

2026-07-20にはLunaが子作成前`Unknown model`で拒否された。これは当時の履歴であり、現在の対応状況ではない。

2026-08-17、Codex Desktop `0.148.0-alpha.9`、multi-agent v2でbuilt-in/default Agentへ
`gpt-5.6-luna` / `xhigh`を直接渡す起動を確認した。child session
`01a00c9a-94b4-78c3-9398-6361f49d9f69`のmetadataはmodel `gpt-5.6-luna`、effort `xhigh`、
agent role `default`だった。resolver結果ではなく、このchild metadata一致をlaunch-verifiedの根拠とする。

resume時のmodel / effort保持は実行面ごとに再確認が必要であり、未確認ならfreshを使う。

## 回帰確認

```bash
node scripts/check-positioning.mjs
node scripts/check-loop-rules.mjs
node plugins/harness/scripts/check-runtime-config.mjs
python3 -m json.tool .claude-plugin/marketplace.json
python3 -m json.tool plugins/harness/.claude-plugin/plugin.json
python3 -m json.tool plugins/harness/.codex-plugin/plugin.json
```

自動回帰は、native Luna direct契約、旧設定のwarning付き無視、Luna→strong Sol→`inherit`、Terra非選択、
配布既定`inherit`、state記録順、no-overwrite初期化を保護する。

## 参考資料

- OpenAI API model IDs and capabilities: <https://developers.openai.com/api/docs/models>
- Codex model availability: <https://developers.openai.com/codex/models>
- Codex model/effort configuration: <https://developers.openai.com/codex/config-reference>
- Codex subagent controls and limits: <https://developers.openai.com/codex/subagents>

model名、effort名、host機能は更新されるため、設定変更時は現在の公式資料とhost capabilityを確認する。
