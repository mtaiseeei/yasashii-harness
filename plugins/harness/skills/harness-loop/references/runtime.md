# Runtime dispatch

初回dispatchとhost/config変更時に読む。確認済みで変更がなければ保持した解決手順を使う。

### 0.5 Agent runtime設定を解決する

各roleをdispatchする前に、pluginの `scripts/resolve-runtime-config.mjs` で実効設定を確認する。
plugin rootが分かる場合の例：

```bash
node "$PLUGIN_ROOT/scripts/resolve-runtime-config.mjs" --root "$(pwd)" --host claudeCode --event initial
node "$PLUGIN_ROOT/scripts/resolve-runtime-config.mjs" --root "$(pwd)" --host codex --event sprint-change
node "$PLUGIN_ROOT/scripts/resolve-runtime-config.mjs" --root "$(pwd)" --host codex --event retry \
  --retry-count 2 --failure-kind implementation-issue --current-model-tier standard
```

- 共有設定は `.harness/config.toml`、個人設定は `.harness/config.local.toml`。優先順位は
  `個人の明示項目 > 共有の明示項目 > plugin既定` で、設定オブジェクト全体を置換しない。
- 旧`hosts.codex.custom_agents`設定は互換読込だけを行い、routingへ影響させない。resolverは
  非推奨path、無視したこと、実効経路がnative direct dispatchであることをwarningへ出す。
  既存設定やAgent定義を削除する必要はなく、新規configにはこのtableを生成しない。
- TOMLが無く旧JSONだけがある場合は互換読込して移行warningを出す。TOMLがあれば旧JSONはmergeしない。
- plugin既定は `lifecycle: balanced`。両hostの全roleとGeneratorのstrong経路は
  `model: inherit` / `effort: inherit`。明示設定がある場合だけ、その正確な値を適用する。
- `--event` は初回 `initial`、新Sprintへの遷移 `sprint-change`、同一Sprintの不合格修正 `retry`。
- `--current-model-tier`には、resolver呼出し前にstate.mdから読んだ現在の`Model Tier`を必ず渡す。
  旧stateに項目が無い場合だけ`unknown`を渡す。引数を省略した場合もresolverは安全側の`unknown`として扱う。
  resolverが返すdesired tierと現在tierが異なる場合はGeneratorをfreshにする。同じtierの継続も、
  capabilityの`resume: true`がmodel / effort保持をhost metadataで確認済みの場合だけresumeしてよい。
- capabilityの準備・更新・受け渡しはオーケストレーターの責務。Harness開始時とhost状態変更時に、
  実際のhost controlと保守された既定から観測できた項目だけをJSONファイルへ書く。
  未確認項目は `null` または省略とし、model知識から `true` を推定しない。
- CodexがAppかCLIかを自己判定・推定する必要はない。現在のnative dispatch面と実際のruntime parserが
  role別model / effort引数を受け付けるかをcapabilityへ記録する。Codex CLIでは、公開schemaに`model`、
  `reasoning_effort`が表示されなくてもruntime parserが受理する実装差を確認済みである。
  **公開schemaに欄が無いことだけを理由に`inherit`へ戻してはならない。** native `spawn_agent`があり、
  resolverが明示値を返した場合は、正確な`model` / `reasoning_effort`を付けて実roleを1回だけ
  `dispatch-attempt`する。built-in/default Agentへ直接渡し、`agent_role`は起動後のchild metadataで確認する。
- この契約は明示設定のLuna / Solだけに限定しない。共有config、個人config、またはユーザーが明示した任意の
  正式なmodel / effortについて、resolverの`effective`値を推測・別名変換せずそのままdispatchする。
  起動後はchildのhost metadataで指定値との一致を確認し、一致した場合だけ`launch-verified`とする。
- `model`または`reasoning_effort`自体が`unknown field`として子作成前に拒否された場合は、model値の
  launch rejectionではなくapplication path不在である。同じ呼び出しを再試行せず、capabilityの対応する
  `applicationPaths.roleModel` / `roleEffort`を未確認へ戻してresolverを再実行する。model名が
  `Unknown model`として拒否された場合だけ、後述のlaunch rejection経路を使う。
- 引数の適用経路は確認できるが利用可能値一覧が列挙されない場合、resolverは設定値を
  `dispatch-attempt`として返す。これは「実際のrole起動で試す」という意味であり、起動成功や適用済みを
  表さない。
- capabilityの`resume: true`は、単にfollow-upを送信できるという意味ではない。resume後もdispatch時の
  model / effortを保持することをhost metadataまたはtraceで確認済み、という意味に限る。
- capabilityはJSON literalではなく `--capabilities <file>` で渡す。ファイルにはhost別の値一覧に加え、
  roleへ値を実際に渡す面を `applicationPaths.roleModel` / `applicationPaths.roleEffort` として記録する。
  値一覧だけでは適用可能とみなさない。ファイルの欠落・不正・型不正はwarning付きの保守的既定へ戻す。

```json
{
  "observedAt": "<ISO-8601 timestamp>",
  "evidence": "<host control or user-owned agent definition inspected>",
  "hosts": {
    "claudeCode": {
      "roleEffort": true,
      "efforts": ["<confirmed value>"],
      "applicationPaths": {
        "roleEffort": "<project agent frontmatter path or other observed surface>"
      }
    }
  }
}
```

- model / effortは前後空白だけを除去し、共有config内の公式referenceで正確なID / aliasを確認する。
  大文字小文字、世代名、provider名などから別modelへ推定変換しない。
- 実効設定とwarningをdispatch前に確認する。`dispatch-ready` はhostへ渡す面と利用可能値を確認した状態、
  `dispatch-attempt`は渡す面だけ確認でき、利用可能値を実roleのdispatchで確かめる状態である。どちらも実際に
  そのmodel / effortで起動した証明ではない。ダミーAgentではなく、resolverが選んだPlanner / Generator /
  Evaluatorそのものを設定値付きで起動する。`launch-verified` はhost側session metadataまたはtraceを取得できた
  場合だけ使い、metadataが無ければ実起動は`unverified`と記録する。
- `dispatch-attempt`が`Unknown model`、無効なeffortなどの同期的な入力検証で、子Agent作成前に拒否された場合だけ、
  拒否された正確な値を`--launch-rejected-model`または`--launch-rejected-effort`で同じhostのresolverへ渡して
  再解決する。Generatorのstandard modelが拒否された場合は`Model Tier: strong`と
  `Rotate: model-availability`をstate.mdへ記録してからfreshなstrong Generatorをdispatchする。strong modelも
  拒否された場合は`inherit`へ戻す。Planner / Evaluatorの拒否値も、その項目だけ`inherit`へ戻す。Terraや
  `codex exec`を自動fallbackに使わない。
- 実装失敗、テスト不合格、子Agentのcrash、timeout、通信エラーはlaunch rejectionとして扱わず、
  `--launch-rejected-model` / `--launch-rejected-effort`へ渡さない。子Agentが作成されたか不明なエラーでは、
  hostのtask一覧またはmetadataで重複が無いと確認するまで自動再dispatchしない。
- 明示値を適用できない場合はその項目だけ親セッション継承へ戻す。
  warningには問題項目、理由、実効値を含める。設定不備だけを理由にループ全体を停止しない。
- Claude Codeのrole modelはhostのsubagent model controlを使えるが、role effortは通常のper-dispatch項目ではない。
  project側Agent frontmatter等の具体的適用面がcapabilityで確認された場合だけrole effortを適用する。
  plugin同梱Agentのfrontmatterを自動書換えず、既定 `roleEffort` は未確認とする。
- Codexでは、現在のnative spawn面がrole別指定を受け付ける場合だけ適用する。Lunaを含む明示modelは
  built-in/default childへ`model` / `reasoning_effort`を直接渡す。Harness専用custom agentを検査・作成・選択しない。
- resolverの`hosts.codex.roles.<role>.dispatch`を実際の起動契約として使う。`mode`は`direct`であり、
  `modelOverride`と`reasoningEffort`を正確に渡す。`status: blocked`ではdispatchしない。
- runtime解決やdispatchの準備を理由に、既存の `AGENTS.md`、`CLAUDE.md`、`.claude/agents/`、
  `.codex/agents/`、既存設定を書き換えない。別途明示承認されたguidance保守は通常loopの保護条件に従う。
- CodexのGeneratorは設定済みstandard値を使う。起動前にmodelが拒否された場合はresolverの
  availability fallback契約に従い、対象のstrong設定、さらに`inherit`へ進みwarningを出す。
  未設定のmodelを独自に候補へ加えない。
- **2026-07-20 CLI実起動基準 / 2026-08-17 App追加確認**: Codex CLIではSol/highの親からnative `spawn_agent`へ
  `fork_turns: "none"`、`model: "gpt-5.6-luna"`、`reasoning_effort: "xhigh"`を渡し、子metadataでも
  Luna/xhighを確認済み。CLI `0.144.6`では公開schemaに両引数が無くてもruntime parserが受理した。
  さらに2026-08-17にはCodex Desktop `0.148.0-alpha.9`、multi-agent v2でbuilt-in/default Agentへ
  Luna/xhighを直接渡し、child session `01a00c9a-94b4-78c3-9398-6361f49d9f69`のmetadataでも
  model `gpt-5.6-luna`、effort `xhigh`、agent role `default`を確認済み。
- 上記は固定の製品判定ではない。Harness開始時とhost更新後に現在のspawn面・利用可能model一覧・
  application pathを再観測する。明示値はnative direct dispatchへ適用し、コードや導入repoのconfigを
  書き換えない。ユーザー明示のTerraは利用可能なら適用できるが、自動経路には入れない。
- Codex Appの完了済みAgentへのfollow-upではSol/highおよびTerra/xhighが次turnでSol/lowになった。
  CLIを含めresume後のmodel / effort保持をhost metadataで確認できるまでは、指定routingが必要なroleを
  resumeせず、正本ファイルを読み直すfreshなnon-full-history spawnを使う。
- Orchestratorは本チャットでありruntime configからmodelを変更できない。本チャットのmodel / effortは
  ユーザーまたはhostの選択に従い、この設定から適用済みとは表示しない。

#### Generator model routing

- `standard`: 通常の初回実装と1回目の`implementation-issue`。設定済みstandard model / effortを使う。
- `strong`: 高リスクSprint、Retry Countが2に達した`implementation-issue`、またはEvaluatorの
  `Escalation Recommendation: strong`をオーケストレーターが証拠確認済みとして採用した場合。設定済みstrong model / effortを使う。
- 高リスクとは、認証・認可、セキュリティ、個人情報、DB migration、データ破壊、本番・課金・外部書込み、
  複数領域の戻しにくい設計変更、またはユーザーが品質優先を明示したSprintを指す。
- 推薦だけではstate.mdを変更しない。オーケストレーターがfeedbackの具体的証拠を確認し、採用してから更新する。
- `spec-issue`はPlannerへ戻し、Retry Countを増やさず、Generator昇格を消費しない。
- Retry Countが3に達したら追加modelを試さずユーザーへ返す。

#### lifecycleの適用

- `balanced`（既定）: `resume: true`としてmodel / effort保持を実証済みのhostだけ、同じroleのAgentを
  Sprint間resumeする。GeneratorとEvaluatorは
  常に別Agent / 別作業単位で、相互のsessionをresumeしない。
- `fresh`: 新Sprint境界でGeneratorとEvaluatorをそれぞれfreshにする。同一Sprintのretryは
  `resume: true`の実証がある場合だけGeneratorをresumeし、EvaluatorもGeneratorとは別のまま
  同一Sprintの評価文脈をresumeしてよい。未実証ならfreshな独立作業単位にする。
- 例外として、Model Tierが`standard`から`strong`、または`strong`から`standard`へ変わるときは
  `balanced`でもGeneratorをfreshにする。同じtierでも`resume: true`の実証が無ければfreshにする。
  resolverの`routing.rotateReason`（`model-escalation`または`model-availability`）をstate.mdへ記録してから、
  Sprint契約・progress・feedbackを読み直す新しいGeneratorをdispatchする。
- Plannerは初回ヒアリング中は継続してよい。重大な仕様再計画、resume失敗、明らかなcontext劣化、
  role逸脱や評価biasが疑われる場合は、理由を通知して対象roleだけfreshへローテーションする。
- resume / Subagentが使えない場合は、正本ファイルを読み直す独立作業単位へfallbackする。
  GeneratorとEvaluatorの分離、および1作業単位1roleの原則は変えない。

### Step 2: 実装（Generator を dispatch）
- resolverの`routing.nextRole`、Generatorの`routing.modelTier` / `reason` / `rotateReason`、lifecycle actionを確認する。
- `routing.nextRole`が`generator`でない場合、Generatorの`routing.modelTier`は`null`である。dispatch対象外の値を
  state.mdへ永続化せず、`spec-issue`では現在のModel Tierを保持してPlannerへ戻す。
- state.mdに保持した、最後に実dispatchした`Model Tier`を`currentModelTier`としてresolverへ渡す。
- 旧stateに`Model Tier`が無ければ`currentModelTier=unknown`として解決し、desired tierと
  `Rotate: runtime-migration`をstate.mdへ記録してからfresh dispatchする。`unknown`自体はstateへ書かない。
  `Rotate`だけが無ければ`none`を補う。
- resolverのdesired tierとcurrentModelTierを比較し、異なる場合はstate.mdの`Model Tier`をdesired tier、
  `Rotate`をresolverの`routing.rotateReason`へ更新してからfreshなGeneratorをdispatchする。通常modelの利用不能による
  fallbackは`model-availability`、それ以外の通常のtier切替は`model-escalation`になる。同じ場合は`Rotate: none`として、
  `balanced`かつcapabilityの`resume: true`がmodel / effort保持を実証済みなら既存Generatorをresumeする。
  follow-up可能なだけ、または保持未確認ならfreshなGeneratorをdispatchする。
- state.md の `Current ID` のStatus、Retry Count、Spec-Issue Count、Model Tier、Rotateをすべて確定してから
  dispatchする。dispatch前に `Lineage Dispatches` が上限に達していれば+1せず停止してユーザーへ報告し、
  未満なら+1を記録してからdispatchする（検証スコープガード参照）。
- 対象Sprintと必要正本を渡す。freshは必要な仕様・契約・progress・feedbackを読み、resumeは更新/未読/矛盾する箇所だけ再読する。
- **1回の dispatch で1スプリントのみ**。
- 解決済みruntime設定のGenerator用model / effort / lifecycle actionを、ホストが受け付けるdispatch項目にだけ渡す。
  Agentへは設定値を再解釈させず、正本ファイルのpathと対象Sprintだけを渡す。
- high-risk Sprint、2回目の連続`implementation-issue`、証拠付きEvaluator推薦ではresolverが最初からstrongを
  選ぶため、standardの試行を挟まず設定済みstrong値をdispatchする。起動試行はモデル選択後に行い、昇格規則を上書きしない。
- strong判定はdispatch前に適用する。strong Generatorも`dispatch.mode`は`direct`であり、
  設定済みstrong model / effortをbuilt-in/default Agentへ渡してfresh dispatchする。
- 完了後、対象の `docs/progress/sprint-*.md` に自己評価と引き渡し事項（起動方法・URL・テストシナリオ・
  回帰チェックの実行コマンド）が書かれていることを確認し、Status を `awaiting-eval` にする。
- 前スプリントの不合格フィードバックがあれば、Generator はそれを先に直す。

### モデル指定の方針

- プラグイン側で Claude 固有の `opus` などのモデル名や最高effortを固定しない。Claude Codeは親を継承する。
- model / effortは `host × role` ごとに独立して解決し、Claude Code用の値をCodexへ、またはその逆へ
  推測変換しない。
- ホストがrole別指定をサポートし、設定された値を現在の契約で利用できると確認できた場合だけ適用する。
- 指定不能・利用不能・未対応なら該当項目だけ `inherit` へ戻してwarningを出す。別モデルを勝手に選ばない。
