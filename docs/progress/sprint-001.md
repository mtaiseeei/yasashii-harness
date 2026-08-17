# Sprint 001 Progress — Native Luna direct dispatchへの一本化

## 実装内容

- Codex resolverのLuna専用custom-agent分岐を削除し、Lunaを含む明示model / effortを
  built-in/default Agentへ直接渡す`mode: direct`契約へ統一した。
- 旧`hosts.codex.custom_agents`tableは共有・個人configのどちらでも読込を継続するが、値をroutingへ
  使わず、非推奨path、無視したこと、native direct dispatchが実効経路であること、既存設定やAgent定義を
  削除しなくてよいことをwarningへ出すようにした。
- Lunaの子作成前`Unknown model`だけをavailability fallbackへ渡し、通常Generatorをconfigured strong Solへ
  fresh化し、Solも拒否された場合はmodel / effortを`inherit`へ戻す既存規則を維持した。Terraは自動選択しない。
- 新規config templateから`hosts.codex.custom_agents`を削除した。Harness Skill、AGENTS / CLAUDE template、
  harness-guidance、README、KNOWLEDGE、routing提案をnative direct経路へ更新した。
- 過去のcustom-agent提案は廃止済みの歴史資料へ短縮し、現在の導入手順として読めない形にした。
- Claude marketplace、Claude plugin manifest、Codex plugin manifestのversionを`0.5.3`へ同期した。
- direct Luna、legacy設定`true`/`false`、personal legacy設定、Luna→Sol→inherit、Terra非選択、
  現行App capability、配布面の旧案内撤去を自動回帰で保護した。

## 変更ファイル

### Runtime / tests

- `plugins/harness/scripts/resolve-runtime-config.mjs`
- `plugins/harness/scripts/check-runtime-config.mjs`
- `scripts/check-loop-rules.mjs`
- `scripts/check-positioning.mjs`

### 削除した配布実行コード

- `plugins/harness/scripts/codex-custom-agent.mjs`
- `plugins/harness/scripts/provision-codex-agent.mjs`

### 配布設定 / guidance / docs

- `.claude-plugin/marketplace.json`
- `plugins/harness/.claude-plugin/plugin.json`
- `plugins/harness/.codex-plugin/plugin.json`
- `plugins/harness/templates/.harness/config.toml`
- `plugins/harness/templates/AGENTS.md`
- `plugins/harness/templates/CLAUDE.md`
- `plugins/harness/templates/docs/harness-guidance.md`
- `plugins/harness/skills/harness-loop/SKILL.md`
- `README.md`
- `docs/KNOWLEDGE.md`
- `docs/proposals/codex-model-routing.md`
- `docs/proposals/codex-custom-agent-routing.md`
- `docs/harness-guidance.md`

## 起動・確認方法

画面や常駐serverを持たないplugin runtimeのため、起動URLはない。resolverは次の形で確認できる。

```bash
node plugins/harness/scripts/resolve-runtime-config.mjs \
  --root "$(pwd)" \
  --host codex \
  --event initial \
  --current-model-tier standard \
  --json
```

このrepoの着手時setup configには旧`hosts.codex.custom_agents.enabled = false`が残っているため、上記実行で
`deprecated-config-key` warning、`effective: native-direct`、各roleの`dispatch.mode: direct`を確認できる。
既存configを自動移行しないというNon-scopeに従い、setup config自体は変更していない。

## 回帰チェックと結果

| コマンド | 結果 |
|---|---|
| `node scripts/check-positioning.mjs` | PASS — 14 checks |
| `node scripts/check-loop-rules.mjs` | PASS — 13 distributed surfaces |
| `node plugins/harness/scripts/check-runtime-config.mjs` | PASS — 56 checks |
| `python3 -m json.tool .claude-plugin/marketplace.json` | PASS — exit 0 |
| `python3 -m json.tool plugins/harness/.claude-plugin/plugin.json` | PASS — exit 0 |
| `python3 -m json.tool plugins/harness/.codex-plugin/plugin.json` | PASS — exit 0 |
| `node scripts/check-windows-init.mjs` | PASS — 8 checks |
| `claude plugin validate plugins/harness` | PASS — Validation passed |
| `git diff --check` | PASS — no whitespace errors |

必須シナリオ1〜4はruntime回帰の次のnamed checksで確認した。

- `legacy custom-agent settings are ignored with a deprecation warning and native direct routing`
- `personal legacy custom-agent setting does not override shared native role values`
- `recorded Codex CLI and App capability snapshots resolve without claiming launch verification`
- `a pre-launch Luna rejection reroutes the actual Generator to fresh Sol without trying Terra`
- `if both configured Codex Generator models are rejected before launch, routing inherits and never selects Terra`

## 配布物の追加確認

- 隔離した`CODEX_HOME`配下だけを使い、local marketplaceを追加して
  `harness@agentic-harness-local`をinstallした。結果はversion `0.5.3`、install成功。
- 隔離cache内の`check-runtime-config.mjs`もPASS — 56 checks。
- 隔離cacheをread-only検索し、削除対象script、`harness_luna_worker`、新規configの
  `[hosts.codex.custom_agents]`が無いことを確認した。
- 現在形の配布面をread-only検索し、`harness_luna_worker`、provision script名、
  `[hosts.codex.custom_agents]`が残っていないことを確認した。

## 自己レビュー

- AC-01 / AC-02: `true`と`false`の旧設定を同じdirect結果に固定し、resolver出力からcustom-agent契約フィールドを
  削除した。warningは削除を必須にせず、実効native経路を明示する。
- AC-03: 検査・provision scriptを削除し、resolverのimport、呼出し、CLI option、出力を撤去した。
- AC-04: fallbackの発火条件、strong tier、fresh化、Sol拒否後のinherit、Terra非選択を既存回帰と追加回帰で確認した。
- AC-05: 2026-07-20のApp拒否は歴史記録、2026-08-17のchild metadata一致は現在の実起動証拠として分離した。
- AC-06: 3つのversion正本を`0.5.3`へ同期し、指定された全回帰コマンドがgreen。
- AC-07: `~/.codex/agents`、repo外の実設定、導入済みrepoは変更していない。Marketplace installも
  `/private/tmp`の隔離homeだけで行った。
- このSprintはproduct/runtime/docsを変更しており、verification-only diffではない。回帰コードは旧custom-agent
  provisioning検査を削除したため、この変更で検証基盤だけが膨張していない。

## Evaluatorへの引き渡し

1. 上記3本の必須回帰と3つのJSON parseを再実行する。
2. named runtime checksから、direct Luna、legacy warning、Luna→Sol→inherit、Terra非選択を確認する。
3. 配布面をread-only検索し、削除したscriptと現在形のprovision案内が無いことを確認する。
4. version正本が`0.5.3`で一致することを確認する。
5. 既存の2026-08-17 child session metadataを実起動証拠として使い、resolver greenだけを
   `launch-verified`の根拠にしない。

## 残るリスク / optional確認

- 2026-08-17のchild metadataはSprint契約で提示済みの証拠を利用しており、このGeneratorではlive dispatchを
  再実行していない。host更新後の再観測は将来の運用上の確認事項。
- 公開Marketplaceへのupload、GitHub公開、導入済みcacheの更新はNon-scopeで未実施。
- ユーザー所有の旧Agent定義は意図どおり残る。Harness 0.5.3は参照も削除要求もしない。
