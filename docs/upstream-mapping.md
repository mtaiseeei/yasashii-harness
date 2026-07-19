# Upstream mapping

- Upstream: `https://github.com/mtaiseeei/agentic-harness.git`
- Initial base: `fb9c30375dac5d4458ed0f522b3469cff2f6b949`
- Current synchronized base: `7108da7276150771308bacaf8a419a464416d83d` (Agentic Harness v0.4.2)
- Downstream: `https://github.com/mtaiseeei/yasashii-harness.git`

## 対応方針

上流の全ファイルはdownstreamにも保持する。本文差分は `gentle-overlay/anchors.tsv` の
`yasashii` 見出し追加だけ、配布識別metadata差分は `metadata-overrides.json` のfieldだけである。
downstream独自ファイルは `gentle-overlay/downstream-files.txt` に列挙する。
例外として `gentle-overlay/downstream-owned.txt` に列挙したファイル（`README.md`、
`scripts/check-positioning.mjs`、`LICENSE`）はdownstream所有とし、同期時に内容を
合成・検査しない。上流でこれらのパスが変わった場合は同期のたびに人が差分を確認する。

| 上流面 | downstreamでの扱い |
|---|---|
| root guidance / KNOWLEDGE | 保持 |
| README | downstream所有。やさしいシリーズ（やさしいセクレタリの開発の脳）としての位置づけを書き下ろし |
| Claude marketplace / plugin manifest | 保持。宣言済み配布識別metadataだけ上書き |
| Codex marketplace / plugin manifest | 保持。宣言済み配布識別metadataだけ上書き |
| Planner / Generator / Evaluator | 保持。各agentにyasashii節を追加 |
| using-harness / harness-loop | 保持。harness-loopにyasashii節を追加 |
| commands / hooks | 上流資産として保持。Claude Codeで使用し、Codexには配布しない |
| runtime resolver / checker / init guidance | 上流実装を保持。node有無の薄いwrapperだけ追加 |
| templates / vendor | そのまま保持 |
| LICENSE | downstream所有。著作権表示だけdownstream名義（MITは維持） |
| checkout-only positioning check | downstream所有。README検査だけやさしいシリーズの位置づけ文言へ追随し、他の検査は上流のまま |

## 上流全ファイル

以下は現在の同期基点のtreeであり、削除しない。新規・削除が上流に生じた場合はsync検査を失敗させ、
この対応表と分類を人が更新してから取り込む。

```text
.agents/plugins/marketplace.json
.claude-plugin/marketplace.json
.gitignore
AGENTS.md
CLAUDE.md
LICENSE
README.md
docs/KNOWLEDGE.md
docs/proposals/codex-model-routing.md
plugins/harness/.claude-plugin/plugin.json
plugins/harness/.codex-plugin/plugin.json
plugins/harness/agents/evaluator.md
plugins/harness/agents/generator.md
plugins/harness/agents/planner.md
plugins/harness/commands/harness.md
plugins/harness/hooks/hooks.json
plugins/harness/hooks/session-start.sh
plugins/harness/scripts/check-runtime-config.mjs
plugins/harness/scripts/init-guidance.sh
plugins/harness/scripts/resolve-runtime-config.mjs
plugins/harness/skills/harness-loop/SKILL.md
plugins/harness/skills/using-harness/SKILL.md
plugins/harness/templates/.harness/.gitignore
plugins/harness/templates/.harness/config.toml
plugins/harness/templates/AGENTS.md
plugins/harness/templates/CLAUDE.md
plugins/harness/templates/docs/harness-guidance.md
plugins/harness/vendor/smol-toml/LICENSE
plugins/harness/vendor/smol-toml/README.md
plugins/harness/vendor/smol-toml/index.cjs
scripts/check-positioning.mjs
```

## 同期後の目視確認

1. `bash scripts/sync-harness.sh --check` の機械検査を通す。
2. upstreamの追加・変更された節を読み、yasashii節と矛盾しないか確認する。
3. 6規律、3 Agent分離、証跡、評価閾値、回帰ゼロ許容が緩んでいないことを確認する。
4. 問題がなければdownstreamだけにcommitし、upstreamへpushしない。
