# agentic-harness

Agentic Harnessは、目的・決定・現在地を引き継ぎ、必要な設計と検証で開発を進めるClaude Code / Codex向けpluginです。
初回から堅い実装を支えながら、小変更は担当Agentが自律的に完了できます。
入力の短さは始めやすさであり、開発規模の上限ではありません。

| 変更 | 進め方 |
|---|---|
| 小さく可逆な修正（小さな挙動変更を含む） | 直接修正・必要検証で完了。計画・独立レビュー・micro契約は必須ではない |
| 通常の機能追加 | 必要な短い計画 → 実装・必要検証 → 完成時の独立レビュー |
| 移行・権限・本番重要操作等の高リスク変更 | 実行前に対象・影響・復旧方法と承認を確認し、実行後検証・独立レビュー |
| 大きく曖昧な開発 | 必要な領域仕様で設計し、意味のある単位のSprintで進行 |

行数・画面数・自動テストの有無だけで分類せず、影響範囲・可逆性・外部契約・データ・権限・失敗時影響を見ます。
承認済みの可逆な実装判断や修理は進め、重要な未決判断や未承認の副作用だけを確認します。

## インストール

### Claude Code

```
/plugin marketplace add mtaiseeei/agentic-harness
/plugin install harness@agentic-harness
```

インストール後、Claude Code では SessionStart フックが入口スキル（`using-harness`）
への短い案内を additionalContext として注入します。普段は「〇〇なアプリを作って」と普通に会話してください。
明示的に始めたい場合だけ `/harness` を使います。

After installing, just ask for what you want to build. You can also run:

```
/harness your app idea
```

### Codex

このリポジトリには Codex 用の repo marketplace も入っています。

GitHub から追加する場合:

```
codex plugin marketplace add mtaiseeei/agentic-harness
codex plugin add harness@agentic-harness-local
```

ローカル checkout から追加する場合は、**この `agentic-harness` リポジトリの root** を指定します。
取り込み先リポジトリで `.` を指定しないでください。

```
codex plugin marketplace add /absolute/path/to/agentic-harness
codex plugin add harness@agentic-harness-local
```

すでに `agentic-harness-local` marketplace を追加済みなら、取り込み先リポジトリでは次だけで十分です。

```
codex plugin add harness@agentic-harness-local
```

Codex では `AGENTS.md` をプラグインから上書きせず、`using-harness` skill が会話から起動して、
変更の影響に応じて直接修正または `harness-loop` へ進みます。必要な初期化はno-overwriteです。普段は「〇〇なアプリを作って」と普通に会話してください。
明示的に始めたい場合だけ `$using-harness` または `$harness-loop` を指定します
（`/harness` コマンドは Claude Code 専用で、Codex には配布されません）。

## インストール済みpluginの更新

GitHub登録のmarketplaceは、対象名を指定して更新してからpluginを更新します。
CodexのCLIでは専用の`plugin update`ではなく、更新済みmarketplaceから`plugin add`で再取得します。

```sh
codex plugin marketplace upgrade agentic-harness-local
codex plugin add harness@agentic-harness-local
codex plugin list --marketplace agentic-harness-local --json
```

Claude CodeのCLIでは次を使います。例の`user`は現在の導入scopeがuserの場合です。
`claude plugin list --json`で既存scopeを確認し、project / local等なら同じscopeを指定してください。

```sh
claude plugin marketplace update agentic-harness
claude plugin update harness@agentic-harness --scope user
claude plugin list --json
```

Codexでローカルcheckoutをmarketplaceとして登録している場合、`marketplace upgrade`はそのcheckoutを
更新しません。登録元checkoutの既存変更を保持して対象releaseを取り込み、その後`plugin add`します。
cache内のファイルを直接編集せず、設定、導入scope、既存repoのdirtyを維持してください。
更新後は対象pluginのinstalled versionが`0.6.0`であることを確認し、新しいセッションで利用します。
既存repoへの一括guidance書換えやruntime/model設定の変更はplugin更新に含みません。

## 使い方

普通に「アプリを作って」「この機能を直して」と依頼できます。[using-harness](plugins/harness/skills/using-harness/SKILL.md)が入口です。

### 短い新規開発の例

「社内の備品予約アプリを作って。予約の重複を防ぎたい」
既存資料から分かることは調べ、利用者が決める必要のある未決だけを推奨案付きで質問します。
今回必要な判断が解決したら実装へ進み、全設計分岐の質問を続けません。

### 既存repoを継続する例

「一覧の表示順を直して」なら影響に必要な確認を行って直接完了できます。
「予約の承認機能を追加して」なら短い計画と完成時の独立レビューで進めます。
既存の現在状態 → 該当仕様・コード → 理由や矛盾が必要な場合だけ関連履歴、の順に読みます。
全Sprint/全履歴の照合、CONTEXT.mdや定型文書群の一括追加は行いません。

### 初期化と既存repoの文書移行

`/harness init` / `$using-harness init` は不足分だけno-overwrite生成し、`check` は読み取り専用の導入確認です。
既存正本を利用し、新規でも短い仕様索引と現在状態から始めます。詳細仕様は必要になった領域だけ作ります。
独自配置では `--spec-path` / `--state-path` で既存正本を指定できます。

```bash
node /path/to/harness-plugin/scripts/harness.mjs init --root /path/to/repo
node /path/to/harness-plugin/scripts/harness.mjs check --root /path/to/repo
node /path/to/harness-plugin/scripts/harness.mjs upgrade --root /path/to/repo
```

plugin更新だけでは古いrepo指示は変わりません。`upgrade` は文書保守のpreviewから開始し、
対象差分、独自規則、dirty、未解決事項を確認して、承認済み範囲の候補だけを適用できます。
元の内容は保管し、古いpreviewからの上書きや参照切れを検査します。
[候補作成・適用手順](plugins/harness/skills/harness-loop/references/migration.md)を必要なときだけ使ってください。
初期化・導入確認だけでは開発を開始せず、更新時に消費repoを自動移行しません。
対象repoへの依存installは不要。初期化の安全確認とNode writerはmacOS/Linux/Windowsで共通です。

## 現在地と設計の継承

AGENTS.md/CLAUDE.mdは短い常設境界・基本コマンド・条件付き入口です。
既存repoは既存の仕様と現在状態を使います。既定の `docs/sprints/state.md` は目的、進行中作業、未解決事項、
次の一手、承認範囲、必要仕様、直近検証の対象版と証拠への参照を持ちます。
実装済み・検証済み・配備済みを分け、続報を無限追記せず現在内容を更新します。過去詳細は履歴へ保持します。
50行程度・数KBは初期の目安であり、公式値や停止ゲートではありません。有効な制約や未解決事項を落としません。
state/NEXT_SESSION/PROJECTに同じ現在状態の正本を増やしません。

通常機能は短い計画とレビュー結果で足ります。大きな開発ではPlanner / Generator / Evaluatorの役割を分け、
仕様・Sprint契約、実装・progress、独立評価・feedbackを必要な長さで残します。
ホストがsubagentに対応しない場合は独立作業単位を使い、実装者の自己評価を独立確認とは扱いません。
独立確認できない項目は未確認として残します。enterprise規模、期間、品質結果を保証するものではありません。

## Agent runtime設定

初期化時に、既存のTOML／旧JSON設定が無い場合だけ `.harness/config.toml` が作成されます。既定のlifecycleは
`balanced`です。GeneratorとEvaluatorは、同じAgentを再利用できる場合でも互いに別Agent、またはroleごとの
独立作業単位として分離します。

Codexの配布時既定は、Claude Codeと同じく全roleでhost設定を継承します。

| role | model | effort |
|---|---|---|
| Planner | `inherit` | `inherit` |
| Generator（standard） | `inherit` | `inherit` |
| Generator（strong） | `inherit` | `inherit` |
| Evaluator | `inherit` | `inherit` |

Sol / Lunaなどを共有設定、個人設定、またはユーザー指定で明示した場合は、以下のrouting機能を引き続き利用できます。
後述の検証例で使う正式IDは `gpt-5.6-luna` / `gpt-5.6-sol` です。

### Codex実行面の確認状況（2026-08-17）

ここでいう「フル経路」は、Planner / Generator / Evaluatorそれぞれについて、希望model / effortをnativeな
fresh Subagentの起動引数へ渡し、host側metadataで実値を確認できる経路を指します。Codex全機能の優劣を
表す言葉ではありません。

| 実行面 | このrouting機能の状況 | host側で確認できたこと |
|---|---|---|
| Codex CLI | フル経路を確認済み | CLI 0.144.6では公開schemaに欄が無くても`model` / `reasoning_effort`をruntime parserが受理し、freshなLuna/xhighの子session metadataと一致 |
| Codex App | Luna direct経路を確認済み | Desktop `0.148.0-alpha.9`、multi-agent v2でbuilt-in/default AgentへLuna/xhighを直接渡し、child session `01a00c9a-94b4-78c3-9398-6361f49d9f69`のmetadataがmodel `gpt-5.6-luna`、effort `xhigh`、agent role `default`と一致 |
| Claude Code | host設定を継承 | 既定は全role `inherit`。ユーザーがhostで有効な正式値を明示した場合だけ適用 |

AppとCLIの差をCodex自身に判定させません。Harnessは現在のnative dispatch面がmodel / effort引数を
受け付けるかを観測します。利用可能値一覧も取得できれば通常どおり事前解決し、引数はあるものの一覧が
取得できない場合はresolverが`dispatch-attempt`を返します。その場合はダミーAgentではなく、設定値を付けた
実際のbuilt-in/default roleを起動します。

Codex CLIでは、公開された`spawn_agent` schemaに`model`、`reasoning_effort`が表示されなくても、
runtime parserが受理する場合があります。表示に欄が無いことだけで`inherit`へ戻さず、resolverの正確な値を
実roleへ1回だけ直接渡して成否を確認します。`agent_role`はchild metadata側の確認値であり、dispatch入力には使いません。
これはLuna / Solだけの特例ではありません。共有config、個人config、ユーザー指定を含め、resolverが選んだ
任意の正式なmodel / effortを名前変更せずdispatchし、child metadataと一致した場合だけ`launch-verified`にします。

旧`hosts.codex.custom_agents`設定は互換性のため読み取りますが、値が`true`でも`false`でもroutingには使いません。
resolverは非推奨pathをwarningへ示し、実効経路がnative direct dispatchであることを伝えます。既存設定や
ユーザー所有のAgent定義を削除する必要はありません。新規初期化configには旧tableを生成しません。

`dispatch-attempt`が`Unknown model`などの同期的な入力検証で子Agent作成前に拒否された場合だけ、正確な拒否値を
resolverへ返して再解決します。standardにLuna、strongにSolを明示している場合、Lunaが拒否されるとfreshな
Sol/highへfallbackし、Solも拒否されると`inherit`へ戻ります。高リスクSprint、2回目の連続失敗、
証拠付きEvaluator推薦では明示されたstrong設定を選びます。Terraと`codex exec`は自動fallbackに使いません。

Codex Appで完了済みAgentへfollow-upした検証では、指定値がSol/lowへ変わったため、model / effortを保つresumeは
未対応として扱います。CLIを含め、resume後も同じroutingがhost metadataで確認できるまでは、指定値が必要な
roleはfresh起動を使います。これらのresume結果は以前の実行面での観測であり、host更新後は
capabilityと実起動証拠を取り直します。

strongへ昇格するのは、高リスクSprint、2回目の連続`implementation-issue`、またはEvaluatorの証拠付き推薦を
オーケストレーターが確認・採用した場合です。model tierが変わるときは`balanced`でも古いLuna Generatorを
resumeせず、`Model Tier: strong`と`Rotate: model-escalation`をstateへ記録してからfreshなSol Generatorを
起動します。3回目の連続失敗では追加modelを試さずユーザーへ返します。`spec-issue`はPlannerへ戻し、
Generator昇格の回数として消費しません。

通常modelがhostで利用不能なためstrongへfallbackする場合は、失敗昇格と区別して
`Rotate: model-availability`を記録します。resolverがGeneratorをdispatchしない経路ではmodel tierを`null`で返し、
その値をstateへ永続化しません。

OrchestratorはHarnessを動かす本チャットであり、pluginがspawnするroleではありません。そのためruntime configから
本チャットのmodelを変更したとは主張しません。Codexでは本チャットをSol/medium、高リスク時はSol/highで
開始することを推奨します。

Claude Code / Codexごとの `planner` / `generator` / `evaluator` に `model` と `effort` を設定できます。
個人差分はgit管理外の `.harness/config.local.toml` に必要な項目だけ書き、共有設定の他項目を保持します。
Claude CodeとCodexの配布時既定は、どちらも全roleで`inherit`です。Codex名からClaude Codeのmodel名を
推定・変換しません。無効・利用不能・host未対応の値は、その項目だけ警告付きで `inherit` へ戻ります。
standardにLuna、strongにSolを明示した構成でLunaが利用不能と確認できた場合はSol/highを試し、
Solも利用不能ならmodel / effortを`inherit`へ戻します。
Harness自身はTerraを通常・昇格・利用不能fallbackのどこでも自動選択しません。
AIエージェントへmodel / effortの変更を依頼した場合は、共有TOMLに記載した該当hostの公式URLを
その時点で実際に確認し、正式なmodel ID / alias / effortをそのまま使います。確認できない値は
推測で書かず、現在値を維持します。前後空白以外を自動補正せず、曖昧なmodel名を候補へ変換しません。

たとえばCodexのGeneratorだけを本チャットのmodelへ戻す最小の個人設定は次です。

```toml
# .harness/config.local.toml
[hosts.codex.roles.generator]
model = "inherit"
effort = "inherit"
```

個人設定は明示したleafだけを上書きし、未指定のlifecycle、他role、effortなどは共有
`.harness/config.toml` の値を維持します。共有側にも指定が無ければplugin既定を使います。
`inherit` は、そのleafについて対象roleへmodelまたはeffortのoverrideを渡さない指定です。ここでいう「親」はHarnessを実行している
本チャットを指し、本チャットで選ばれているmodel／effort、またはチャット側に明示指定が無い場合はhost既定を継承します。

TOML parserはplugin内に固定版を同梱しているため、利用repoでpackage manifest、lockfile、`node_modules`を
作ったり、`npm install`やnetwork accessを行ったりする必要はありません。旧 `config.json` / `config.local.json`
だけのrepoは互換読込と移行warningで動作し、TOMLとの併存時はTOMLだけを正本として旧JSONをmergeしません。

```bash
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host claudeCode --event initial
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host codex --event sprint-change
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host codex --event retry \
  --retry-count 2 --failure-kind implementation-issue --current-model-tier standard
node /path/to/harness-plugin/scripts/resolve-runtime-config.mjs --root "$(pwd)" --host codex --event initial \
  --current-model-tier standard --launch-rejected-model gpt-5.6-luna
```

`--launch-rejected-model` / `--launch-rejected-effort`は、同じhostが子Agent作成前に値を明示拒否した場合だけ使います。
繰り返し指定でき、App / CLIの名称判定ではなく、その実行面で観測した拒否値を今回の解決へ渡します。

`--current-model-tier`にはstate.mdの現在値を渡します。resolverが返すdesired tierと異なるときはfresh化します。
同じtierを継続する場合も、現在の実行面がmodel / effortを保つresumeをhost metadataで確認できた時だけ同じ
Generatorをresumeします。未確認または不一致の場合は正本ファイルを読み直すfresh Agentを使います。
旧版のstate.mdに`Model Tier`が無い場合は、`standard`と推定せず`unknown`を渡します。resolverのdesired tierを
`Model Tier`、`runtime-migration`を`Rotate`へ一度だけ記録してからfresh dispatchします。`unknown`は
resolver入力専用で、state.mdには保存しません。`Model Tier`があり`Rotate`だけ無い場合は`none`を補います。
この互換処理は次回Harness継続時に行い、plugin更新が既存導入repoを直接書き換えることはありません。
Sprint合格時に次Sprintが残っている場合、stateのModel Tierは最後に実dispatchした値を保持します。次のStep 2で
その値とdesired tierを比較してからstateを更新するため、strong→standardの切替でも古いSolを誤ってresumeしません。
全Sprint完了で次dispatchが無い場合だけ`standard` / `none`へ戻します。

Codex plugin manifestはAgent定義を配布しません。Codexのrole別指定は現在のnative spawn面が対応するときだけ、
built-in/default Agentへ直接適用します。Harnessは既存の `AGENTS.md`、`CLAUDE.md`、Agent定義、
設定を上書きしません。

Claude Codeのrole別effortは通常のper-dispatch項目ではありません。project側Agent frontmatterなど、
対象roleへeffortを渡す具体的な適用面をcapabilityファイルで確認できた時だけ有効になります。
capabilityファイルはオーケストレーターがHarness開始時またはhost変更時に観測事実から作成し、
`--capabilities <file>` で渡します。値一覧だけでは適用済みになりません。

resolverの`dispatch-ready`は、設定値とhostの受け渡し面を確認できたという意味です。実際にそのmodel / effortで
Subagentが起動した証明ではありません。`launch-verified`はhost側のsession metadata、trace、dispatch記録で
model / effortを確認できた場合だけ使います。host側証拠を取得できなければ、実起動は`unverified`と報告します。
`dispatch-attempt`は受け渡し面だけ確認でき、値の利用可否を実role起動で確かめる状態です。これも実起動の証明では
ありません。実装失敗、子Agentのcrash、timeout、通信エラーは起動拒否として扱わず、自動で別modelを重複起動しません。

## 配布と検証

Claude Codeはagents/commandsと短いSessionStart hook、Codexはskillsの発見から入口へ進みます。
hookは文書を書かず、Skill本文も一括注入しません。共通の指示・script・parser・licenseをplugin内に同梱します。

UIは利用可能なブラウザで実操作、CLI/API/pluginはコマンドと入出力を確認します。
Playwright MCPは既設の場合だけ利用でき、必須依存ではありません。
再評価は修正箇所と影響範囲中心。必要な検証が済み、新しい懸念がなければ全検査を反復しません。

品質PASSと速度実測は分けて報告します。完了時間・読取量・質問数・手戻りを改善指標とし、
未計測の高速化率は主張しません。公開、下流同期、installed更新はそれぞれ対象版と実施結果で区別します。

## 設計の参考と出典

今回の構成はユーザー承認による製品設計です。少ない常設context、条件付き読取、小変更での計画省略、
実行可能な検証という考え方を参考にし、公式標準として扱っていません。

https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra
https://learn.chatgpt.com/docs/build-skills
https://code.claude.com/docs/en/best-practices

資料を使う質問の参考記事:
https://note.com/taki4416/n/nbbd9fb2bea78

記事のgrill-with-docsと同梱mattpocock/skills grillingは別実装です。Harnessはローカルの資料活用・停止条件を追加し、
元のgrilling本文とMIT Licenseを保持しています。詳細は [grilling](plugins/harness/skills/grilling/SKILL.md)。
過去の設計と他の参考資料は [KNOWLEDGE](docs/KNOWLEDGE.md) から必要なときだけ確認できます。

## ライセンス

MIT。詳細は [LICENSE](LICENSE)。
