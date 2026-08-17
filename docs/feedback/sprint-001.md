# Sprint 001 Feedback — Native Luna direct dispatchへの一本化

## 判定

**PASS**

- 評価対象commit: `63853c56ab1b85dad99ceb6ae0c959931ba69e27`
- 比較範囲: `fd77e47d752e7973cb5bfdeaa83798b69b0721c7..63853c56ab1b85dad99ceb6ae0c959931ba69e27`
- 評価日: 2026-08-17
- Failure Kind: なし
- Escalation Recommendation: なし

指定された回帰、legacy互換、native direct dispatch、availability fallback、配布撤去、文書、version、
ユーザー所有状態の保護を独立に確認した。rubricの全基準が閾値以上であり、blocking findingはない。

## Rubric採点

| 基準 | 点数 | 閾値 | 判定 | 根拠 |
|---|---:|---:|---|---|
| 機能完全性 | 5/5 | 4/5 | PASS | AC-01〜AC-06のnative Luna、legacy警告、fallback、配布撤去、文書、version同期を確認 |
| 動作安定性 | 5/5 | 4/5 | PASS | runtime config 56/56、positioning 14/14、loop rules 13面がgreen |
| 互換性・安全性 | 5/5 | 5/5 | PASS | legacy `true` / `false` / personal設定を停止せず無視し、Sol→`inherit`とTerra非選択、ユーザー所有物への非書込を確認 |
| 文書正確性 | 5/5 | 4/5 | PASS | 2026-08-17の一次metadata、過去の`Unknown model`記録、resolverと`launch-verified`の境界が整合 |
| 回帰なし | 5/5 | 5/5 | PASS | 契約で指定された全必須コマンドがexit 0。optional確認もgreen |

## 受け入れ基準ごとの評価

### AC-01 Native Luna contract — PASS

- `check-runtime-config.mjs`の
  `legacy custom-agent settings are ignored with a deprecation warning and native direct routing`で、
  Planner / Generator / EvaluatorのLuna設定がすべて`dispatch.mode: direct`となり、正確な
  `modelOverride: gpt-5.6-luna`とrole別effortを保持するassertionが成功した。
- `recorded Codex CLI and App capability snapshots resolve without claiming launch verification`で、App上の
  GeneratorがLuna/xhighをdirect契約として返し、resolver自身は`launchVerified: false`を維持した。
- resolver出力からcustom Agent名、definition status、provisioning契約は削除されている。

### AC-02 Legacy config compatibility — PASS

- 共有設定の`hosts.codex.custom_agents.enabled = true` / `false`の両方、個人設定の旧tableを自動回帰で確認した。
- どの値でもroutingはdirectのまま変わらず、`deprecated-config-key` warningは非推奨path、無視、
  `effective: native-direct`、既存設定やAgent定義を削除しなくてよいことを示す。
- このcheckoutに残る旧`enabled = false`設定へresolverを実行した実結果もexit 0で、同じwarningを確認した。

### AC-03 Distributed surface removal — PASS

- 次の配布実行コードが存在しないことをread-onlyで確認した。
  - `plugins/harness/scripts/codex-custom-agent.mjs`
  - `plugins/harness/scripts/provision-codex-agent.mjs`
- 現在形の配布面・ガイダンスを対象に、`harness_luna_worker`、provision script名、
  `[hosts.codex.custom_agents]`を`rg`検索し、一致なしを確認した。
- 新規テンプレート`plugins/harness/templates/.harness/config.toml`にも旧tableやprovision案内はない。
- 隔離したlocal Marketplace install後のcacheでも削除scriptと上記識別子は一致なしだった。

### AC-04 Safe fallback preservation — PASS

- `a pre-launch Luna rejection reroutes the actual Generator to fresh Sol without trying Terra`が成功し、
  Lunaの起動前拒否からstrong Sol、高いeffort、fresh、`Rotate: model-availability`となることを確認した。
- `if both configured Codex Generator models are rejected before launch, routing inherits and never selects Terra`が成功し、
  Solも起動前拒否された場合はmodel / effortが`inherit`へ戻ることを確認した。
- orchestrator guidanceは、`Unknown model`等をresolverへ返す条件を「子作成前の同期的拒否」に限定し、
  implementation failure、timeout、通信失敗、作成有無が不明な失敗をlaunch rejectionへ分類しない。
- high-risk、retry、Evaluator推薦のstrong判定とTerra非選択を含む既存回帰もgreenだった。

### AC-05 Documentation truthfulness — PASS

- child session一次記録
  `/Users/taisei/.codex/sessions/2026/08/17/rollout-2026-08-17T07-04-12-01a00c9a-94b4-78c3-9398-6361f49d9f69.jsonl`
  を直接確認した。
- 最初の`session_meta`は次を記録していた。
  - `id`: `01a00c9a-94b4-78c3-9398-6361f49d9f69`
  - `originator`: `Codex Desktop`
  - `cli_version`: `0.148.0-alpha.9`
  - `multi_agent_version`: `v2`
  - `agent_role`: `default`
- 最初の`turn_context`は`model: gpt-5.6-luna`、`effort: xhigh`、`multi_agent_version: v2`だった。
  子Agentの自己申告文は証拠に使っていない。
- README、KNOWLEDGE、routing記録、Harness Skillはこのmetadata一致を現在のApp証拠として記載し、
  2026-07-20の`Unknown model`を当時の履歴として区別する。またresolverの`dispatch-ready` /
  `dispatch-attempt`とhost metadataによる`launch-verified`を混同していない。

### AC-06 Regression and release consistency — PASS

- 契約指定の全回帰とJSON構文検査が成功した。
- Claude marketplace、Claude plugin manifest、Codex plugin manifestはすべて`0.5.3`。
- 隔離local Marketplaceからinstallしたpluginも`0.5.3`で、cache上のruntime回帰56/56が成功した。

### AC-07 User-owned state protection — PASS

- 対象diffにrepo外のpathはなく、追加されたruntimeコードに`~/.codex/agents`や
  `harness-luna-worker`を作成・更新・削除する処理はない。
- resolverは旧設定をread-onlyで受理し、移行や削除を要求しない。
- optional Marketplace確認は`/private/tmp/agentic-harness-eval.Ck0ZGY`の隔離`CODEX_HOME`だけを使用した。
  ユーザー所有のglobal Agent directoryや導入済みplugin/cacheは変更していない。

## 実行証拠

| コマンド / 検査 | 結果 |
|---|---|
| `node scripts/check-positioning.mjs` | exit 0 — 14 checks passed |
| `node scripts/check-loop-rules.mjs` | exit 0 — 13 distributed surfaces verified |
| `node plugins/harness/scripts/check-runtime-config.mjs` | exit 0 — 56 checks passed |
| `python3 -m json.tool .claude-plugin/marketplace.json` | exit 0 |
| `python3 -m json.tool plugins/harness/.claude-plugin/plugin.json` | exit 0 |
| `python3 -m json.tool plugins/harness/.codex-plugin/plugin.json` | exit 0 |
| current distribution / guidanceへの禁止識別子の`rg`検索 | 一致なし |
| 削除対象2 scriptの存在確認 | 両方とも不存在 |
| 3つのversion正本の`rg`確認 | すべて`0.5.3` |
| child JSONLの最初の`session_meta` / `turn_context`を`jq`確認 | default / Luna / xhigh / v2一致 |
| `git diff --check fd77e47..63853c56` | exit 0 — outputなし |

## Optional確認

| コマンド / 検査 | 結果 |
|---|---|
| `node scripts/check-windows-init.mjs` | exit 0 — `WINDOWS_INIT_PASS=8 FAIL=0` |
| `claude plugin validate plugins/harness` | exit 0 — Validation passed |
| 隔離homeでlocal Marketplace add + `harness@agentic-harness-local` install | exit 0 — version `0.5.3` |
| 隔離cacheの`check-runtime-config.mjs` | exit 0 — 56 checks passed |
| 隔離cacheの削除script / stale current-guidance検索 | 一致なし |

## Findings

- Blocking findings: なし
- `product` findings: なし
- `verification-infra` findings: なし

rootの`.harness/config.toml`には着手前形式の旧custom-agent tableが意図どおり残るが、これは新規配布テンプレートではない。
実resolverで非推奨warning付きの互換読込を確認しており、routingには影響しないためfindingとはしない。

## 評価の自己レビュー

- Generatorの自己評価を合否根拠として流用せず、対象commit diff、テスト実行結果、resolver実出力、
  配布cache、child session一次記録を独立に確認した。
- safe harborに列挙された証拠形式で全基準を判定し、ブラウザ、スクリーンショット、新しいcollector、
  attestation、追加の証拠schemaは要求していない。
- 非UI pluginの実製品面であるresolverコマンド、初期化・配布回帰、隔離local installを操作した。
- diffはproduct/runtime/docsと既存回帰を含み、verification-only diffではない。
- 合格を覆す未確認の必須条件、対象外を必須化した条件、分類漏れfindingがないことを再確認した。
