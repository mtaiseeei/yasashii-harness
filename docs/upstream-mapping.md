# Upstream mapping

- Upstream: `https://github.com/mtaiseeei/agentic-harness.git`
- Initial base: `fb9c30375dac5d4458ed0f522b3469cff2f6b949`
- Current synchronized base: `dd05b7e6717ef2de74d7c2366fb82f3de7ac5225` (Agentic Harness 0.6.0 release candidate)
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
| runtime resolver / checker / init guidance / Windows Node writer | 上流実装を保持。node有無の薄いwrapperだけ追加 |
| loop-rule vocabulary check (`scripts/check-loop-rules.mjs`) | 上流資産として保持。downstream回帰からも実行する |
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
.harness/.gitignore
.harness/config.toml
AGENTS.md
CLAUDE.md
LICENSE
README.md
docs/KNOWLEDGE-v0.5.5.md
docs/KNOWLEDGE.md
docs/feedback/sprint-001-patch-001.md
docs/feedback/sprint-001.md
docs/feedback/sprint-003-downstream.md
docs/feedback/sprint-003-incremental.md
docs/feedback/sprint-003.md
docs/harness-guidance.md
docs/progress/sprint-001-patch-001.md
docs/progress/sprint-001.md
docs/progress/sprint-003.md
docs/proposals/codex-custom-agent-routing.md
docs/proposals/codex-model-routing.md
docs/releases/v0.5.4-validation.md
docs/releases/v0.5.5.md
docs/spec.md
docs/spec/constraints.md
docs/spec/decisions.md
docs/spec/domain.md
docs/spec/features.md
docs/spec/product.md
docs/spec/rubric-history.md
docs/spec/rubric.md
docs/spec/runtime.md
docs/spec/ui.md
docs/sprints/sprint-001-patch-001.md
docs/sprints/sprint-001.md
docs/sprints/sprint-003.md
docs/sprints/state-through-v0.5.5.md
docs/sprints/state.md
plugins/harness/.claude-plugin/plugin.json
plugins/harness/.codex-plugin/plugin.json
plugins/harness/agents/evaluator.md
plugins/harness/agents/generator.md
plugins/harness/agents/planner.md
plugins/harness/commands/harness.md
plugins/harness/hooks/hooks.json
plugins/harness/hooks/session-start.sh
plugins/harness/scripts/check-runtime-config.mjs
plugins/harness/scripts/git-bash-path.mjs
plugins/harness/scripts/guidance-migration.mjs
plugins/harness/scripts/harness.mjs
plugins/harness/scripts/init-guidance.sh
plugins/harness/scripts/node-guidance-initializer.mjs
plugins/harness/scripts/platform-permissions.mjs
plugins/harness/scripts/resolve-runtime-config.mjs
plugins/harness/skills/grilling/LICENSE
plugins/harness/skills/grilling/SKILL.md
plugins/harness/skills/grilling/references/upstream.md
plugins/harness/skills/harness-loop/SKILL.md
plugins/harness/skills/harness-loop/references/evaluation.md
plugins/harness/skills/harness-loop/references/migration.md
plugins/harness/skills/harness-loop/references/planner-templates.md
plugins/harness/skills/harness-loop/references/runtime.md
plugins/harness/skills/harness-loop/references/scope.md
plugins/harness/skills/harness-loop/references/state.md
plugins/harness/skills/using-harness/SKILL.md
plugins/harness/templates/.harness/.gitignore
plugins/harness/templates/.harness/config.toml
plugins/harness/templates/AGENTS.md
plugins/harness/templates/CLAUDE.md
plugins/harness/templates/docs/harness-guidance.md
plugins/harness/vendor/smol-toml/LICENSE
plugins/harness/vendor/smol-toml/README.md
plugins/harness/vendor/smol-toml/index.cjs
scripts/check-guidance-migration.mjs
scripts/check-loop-rules.mjs
scripts/check-positioning.mjs
scripts/check-windows-init.mjs
```

## 同期後の目視確認

1. `bash scripts/sync-harness.sh --check` の機械検査を通す。
2. upstreamの追加・変更された節を読み、yasashii節と矛盾しないか確認する。
3. 小変更の直接完了、通常機能の完成時独立レビュー、高リスク承認境界、証跡とdirty保護が上流と整合することを確認する。
4. 問題がなければdownstreamだけにcommitし、upstreamへpushしない。

## v0.5.3 同期メモ

- upstream-owned coreは固定SHA `2579d715d13beef7767cc30c3eb10af607ecd932` のbytesを保持する。
- Harness専用custom agent定義を作る2つのprovisioning scriptは、上流での削除どおりdownstreamからも削除する。
- downstream-owned `README.md` には、native built-in/default AgentへのLuna direct dispatch、旧設定のwarning付き無視、
  Luna→設定済みstrong Sol→`inherit`、Terra非選択を利用者向けに短く反映した。
- downstream-owned `scripts/check-positioning.mjs` はYasashii配布識別を守りながら、0.5.3のversionとrouting説明も回帰対象にする。
- 上流Sprintのspec、progress、feedback、stateは上流treeの一部としてbytesを保持し、Yasashii側の別Sprintとして再解釈しない。

## v0.5.4 同期メモ

- 条件付きgrilling Skill・原文・MITライセンス、英語のみのモデル名に依存しない設定説明を同期した。設定値は保持する。
- やさしいPlanner追加節の固定3問を撤去し、上流の必要性判断と深掘りへ接続した。平易な日本語での対話を維持する。
- downstream所有のREADME・positioning検査を確認し、0.5.4の説明とversion確認へ反映した。

## v0.5.5 同期メモ

- 上流の確定commitを通常mergeし、上記固定基点で共通本文と宣言済み追加節を合成した。未commit候補ではない。
- upstreamの通常入口・条件付きreferences・hook・guidance保守・検証を同期。runtime/model設定とgrilling固定本文を保持。
- downstream所有READMEとpositioning検査は、やさしいシリーズの説明を維持して更新手順と0.5.5の版へ反映。LICENSE変更なし。
- syncは全対象事前検査でdirty・削除・symlinkを保護し、候補経路と正式固定SHA経路を区別する。
- 初回独立確認のREADME不整合を修正し、限定修理と独立再評価、条件外のユーザー判断を両版で揃えた。
- 導入済みcacheや利用repoの設定・guidanceを一括変更しない。詳しい変更はdocs/releases/v0.5.5.md、やさしい版の更新コマンドはREADME.mdの「既存pluginを0.5.5へ更新」を参照。

### A-16: Bash 3.2の引数なし管理回帰

正式固定SHAの引数なし回帰で、`set -u`と空配列転送が組み合わさり`SYNC_ARGS[@]: unbound variable`となる不具合を検出した。引数がある場合だけ配列を展開するBash 3.2対応表記へ直し、空引数・空白入り引数の保持を実行確認した。合否条件・期待結果・証拠要件は変更しない、Sprint内1回の既存検証限定修理として扱う。

## Sprint 003 自律実行と文書設計

上流の確定したlocal commitを通常mergeし、固定SHAの本文と追加節を合成する。README・positioning検査は下流の配布識別を保持して更新する。小変更へ常時3役を要求した旧補足は置換し、質問停止・必要検証の境界を上流に揃える。公開versionは変更せず、remote push/tag/Release・installed更新は行わない。検証結果は独立評価の引き渡しに記録する。

## 0.6.0 正式同期

- 固定基点は `dd05b7e6717ef2de74d7c2366fb82f3de7ac5225`。既存の独立PASS済み改善候補を起点に通常mergeした。
- 製品本文はmanifest version以外を継承。日本語overlayと配布識別のallowlistを維持した。
- downstream所有READMEのmerge競合は、元本文の全行を保持し、Yasashii向け0.6.0正式更新手順を追加して解決した。上流READMEの変更は版番号と正式更新の案内として確認した。
- 新しいrelease notesと公開前state原文は上流資産として同一bytesを保持する。旧基点の一覧・同期記録は履歴であり、現treeは固定SHAと同期checkerで確認する。
- 正式公開、通常installed更新、新sessionでの確認はそれぞれ別の実行証拠で判定する。未導入editionを通常hostへ追加しない。
