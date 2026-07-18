# Codex model routing と自動昇格の実装提案

Status: Implemented in v0.4.0 / 2026-07-18にCodex CLIのfull routingとCodex Appのpartial routingを実起動確認
対象: `agentic-harness` plugin本体  
対象外: Harnessを導入済みの各repoへの反映・移行

## 1. この提案で実現したいこと

CodexでHarnessを動かすとき、通常は処理量と品質のバランスを取りながら、難しいSprintや失敗が続く場面だけ
強いmodelへ切り替える。

- Orchestrator（Harnessを動かす本チャット）は `gpt-5.6-sol` を使う。
- Plannerは `gpt-5.6-sol` / `high` を使う。
- Generatorは通常 `gpt-5.6-luna` / `xhigh` を使う。
- Evaluatorは `gpt-5.6-sol` / `high` を使い、評価と自己レビューを行う。
- 難しいSprint、または通常Generatorで解決できない場合は、Generatorを `gpt-5.6-sol` / `high` へ昇格する。
- `gpt-5.6-terra` は通常経路にもfallback経路にも入れない。

ここでいう「昇格」は、modelを強い側へ切り替えることを指す。失敗を重ねたLunaの会話をそのまま再利用せず、
Solの新しいGeneratorを起動して、Sprint契約・進捗・Evaluator feedbackから読み直す。

## 2. 推奨する既定運用

| 役割 | 通常 | 強い経路 | 用途 |
| --- | --- | --- | --- |
| Orchestrator | Sol / medium | Sol / high | 状態遷移、役割分離、最終判断 |
| Planner | Sol / high | 同じ | 要件、受入条件、rubricの設計 |
| Generator | Luna / xhigh | Sol / high | 実装。失敗時や高リスク時だけ昇格 |
| Evaluator | Sol / high | 同じ | 実アプリ評価と自己レビュー |

Orchestratorはpluginがspawnするroleではなく、本チャットそのものである。したがって `.harness/config.toml` から
親チャットのmodelを変更したとは主張しない。READMEとconfigコメントで「Codexの本チャットをSol / medium、
高リスクならSol / highで開始する」ことを案内する。

### Generatorの昇格規則

1. 通常の初回実装はLuna / xhigh。
2. 1回目の `implementation-issue` はstandard tierを維持する。`resume: true`がmodel / effort保持を
   host metadataで確認済みの場合だけ同じLuna Generatorへ戻し、未確認ならfreshなLuna Generatorを使う。
3. 2回目の連続失敗では、freshなSol / high Generatorへ切り替える。
4. 3回目の連続失敗では、既存ルールどおり自動継続せずユーザーへ返す。
5. `spec-issue` はmodel昇格ではなくPlannerへ戻す。仕様の問題をGeneratorの強化で隠さない。

次のいずれかに該当するSprintは、失敗を待たず最初からSol / highを使う。

- 認証・認可、セキュリティ、個人情報を扱う変更
- DB migrationやデータ破壊の可能性がある変更
- 本番環境、課金、外部サービスへ書き込む変更
- 複数領域をまたぐ設計変更や、戻しにくいアーキテクチャ変更
- ユーザーが速度・コストより品質を優先すると明示した変更

Evaluatorは、評価の証拠に基づいて `Escalation Recommendation: strong` をfeedbackへ記録できる。ただし、
実際のmodel選択と `docs/sprints/state.md` の更新はOrchestratorが行う。Evaluator自身は再実装しない。

## 3. `.harness/config.toml` の提案

初期化で作られる共有configには、Codex向け推奨値を有効な既定値として最初から書く。Claude Codeはmodel名を
Codexから変換できないため、従来どおり `inherit` を既定とし、ユーザーがClaude Codeで利用可能な正式名を
明示した場合だけ適用する。

```toml
version = 1

# balanced: 新Sprintでも可能なら同じroleを再利用します。
# fresh: 新Sprint境界でGeneratorとEvaluatorを新しくします。
# どちらでもGeneratorとEvaluatorは別のAgentまたは独立作業単位です。
lifecycle = "balanced"

# OrchestratorはHarnessを実行している本チャットです。pluginからmodelを変更できません。
# Codexでは gpt-5.6-sol / medium、高リスク時は gpt-5.6-sol / highを推奨します。

[hosts.codex.roles.planner]
model = "gpt-5.6-sol"
effort = "high"

[hosts.codex.roles.generator]
model = "gpt-5.6-luna"
effort = "xhigh"

[hosts.codex.roles.generator.escalation]
model = "gpt-5.6-sol"
effort = "high"
after_failures = 2
on_evaluator_recommendation = true

[hosts.codex.roles.evaluator]
model = "gpt-5.6-sol"
effort = "high"

[hosts.claudeCode.roles.planner]
model = "inherit"
effort = "inherit"

[hosts.claudeCode.roles.generator]
model = "inherit"
effort = "inherit"

[hosts.claudeCode.roles.evaluator]
model = "inherit"
effort = "inherit"
```

実ファイルでは、この例に加えて次をコメントだけで理解できるようにする。

- `inherit` は、対象roleへoverrideを渡さず、本チャットまたはhost既定を継承する指定であること。
- model名とeffort名を確認するOpenAI / Anthropic公式URL。
- configに値が書かれていても、host側にrole別model指定の実行面が無ければ適用されないこと。
- Lunaが利用不能ならSol / highを試し、Solも利用不能なら `inherit` とwarningへ戻ること。
- 曖昧なmodel名を推定・補正しないこと。
- Terraは自動選択しないこと。

個人設定 `.harness/config.local.toml` は、これまでどおり明示したleafだけを上書きする。たとえばGeneratorを
親チャットへ戻す場合は次だけでよい。

```toml
[hosts.codex.roles.generator]
model = "inherit"
effort = "inherit"
```

## 4. 実装上の重要な境界

configを正しく読み取れることと、実際に指定modelでSubagentが起動することは別問題である。

```text
config.toml
   -> parser / merge / validation
   -> routing decision
   -> host capability check
   -> dispatchへmodel・effortを渡す
   -> 実際に起動したAgentのmetadataで確認
```

resolverのJSONに `gpt-5.6-luna` と表示されただけでは、end-to-end（設定から実起動までを通した）テストの
PASSにはしない。

Codex pluginは現在skillsを配布し、role Agent定義そのものは配布しない。したがってCodexでmodel / effortを
本当に適用するには、次のどちらかが必要になる。

- hostが提供するspawn時のmodel / effort指定
- 利用repoにすでに存在するCodex custom agent

Harnessは、その実行面を観測できた場合だけ設定を渡す。既存の `.codex/agents/`、`.claude/agents/`、
`AGENTS.md`、`CLAUDE.md`、configは上書きしない。実行面が無い場合は、独立作業単位fallbackを維持し、
「指定modelを適用済み」とは表示しない。

## 5. 変更候補

次の会話では、まず現在の実装を再確認してから、必要な範囲だけ変更する。

- `plugins/harness/templates/.harness/config.toml`
  - Codexの推奨既定値、昇格設定、単体で理解できるコメントを追加する。
- `plugins/harness/scripts/resolve-runtime-config.mjs`
  - `generator.escalation` のschema、merge、validation、fallback、診断結果を追加する。
  - retry数、Evaluator推薦、Sprintリスクから `standard` / `strong` を解決する。
- `plugins/harness/scripts/check-runtime-config.mjs`
  - parser / resolver / fallback / no-overwriteの回帰テストを追加する。
- `plugins/harness/skills/harness-loop/SKILL.md`
  - 昇格判断、fresh切替、state更新順、3回失敗時の停止を定義する。
- `plugins/harness/agents/evaluator.md`
  - 評価＋自己レビューを維持し、証拠付き昇格推薦の出力形式を追加する。
- `README.md` と `docs/KNOWLEDGE.md`
  - 推奨運用、設定例、Codex / Claude Codeの違い、実適用の条件を説明する。
- 必要なhost adapterまたはcapability検出コード
  - 実際のdispatch面が確認できた場合だけ追加する。推測で「対応済み」にしない。

`docs/sprints/state.md` には、model名ではなく次の抽象状態を追加する案を採る。

```md
Model Tier: standard
```

値は `standard` / `strong` とする。具体的なmodel名はruntime configが解決するため、Sprint stateを特定modelへ
固定しない。model変更時は `Rotate: model-escalation` のような理由も残す。

## 6. テスト計画

### A. config / resolver回帰テスト

最低限、次を自動テストする。

1. 初期configがTOMLとしてparseできる。
2. PlannerはSol / high、GeneratorはLuna / xhigh、EvaluatorはSol / highへ解決される。
3. Orchestratorの推奨は説明されるが、pluginが親チャットへ適用したとは表示しない。
4. Generatorのretry 0〜1はLuna / xhighのままになる。
5. retry 2ではSol / highへ切り替わり、lifecycle actionが `fresh` になる。
6. Evaluatorの証拠付き推薦でもSol / highへ切り替わる。
7. 高リスクSprintは初回からSol / highになる。
8. `spec-issue` はPlannerへ戻り、Generator昇格を消費しない。
9. Lunaが利用不能ならSol / high、Solも利用不能なら `inherit` + warningになる。
10. 推奨経路・fallback経路のどこにもTerraが現れない。
11. `.harness/config.local.toml` のleaf overrideが、未指定の共有値を消さない。
12. 不正な型、未知のkey、不正な閾値、壊れたTOMLが安全に診断される。
13. Claude Code設定はCodexのmodel名を受け取らず、既定 `inherit` を維持する。
14. 既存config、guidance、Agent定義を初期化処理が上書きしない。

### B. orchestration contractテスト

fixtureのSprint state / feedbackを使い、次を確認する。

- Orchestratorだけが `docs/sprints/state.md` の `Model Tier` とretry数を更新する。
- Evaluator feedbackの推薦だけではstateが勝手に変わらない。
- Orchestratorが推薦を採用してstateを記録した後に、freshなSol Generatorをdispatchする。
- model昇格後に古いLuna Generatorをresumeしない。
- 3回目の連続失敗では、modelを追加で切り替えずユーザーへ返す。
- `implementation-issue` と `spec-issue` のrouteが混ざらない。

### C. 実起動テスト

これはA・Bとは分けて実施する。

1. Codexで実際に利用可能なrole別dispatch面を特定する。
2. Luna / xhighのGeneratorを1回起動する。
3. hostが返すsession metadata、trace、またはdispatch記録からmodel / effortを確認する。
4. retry条件を作り、freshなSol / high Generatorへ変わったことを同じ証拠で確認する。
5. GeneratorとEvaluatorが別sessionまたは別作業単位であることを確認する。
6. Claude Codeでも、利用可能なAgent frontmatter / dispatch面と `inherit` fallbackを確認する。

Agent本人に「何のmodelですか」と尋ねた自己申告だけは証拠にしない。host側metadataを取得できない場合は、
実起動テストを `unverified` と記録し、resolverテストだけで「指定どおり起動した」と結論づけない。

#### 2026-07-18 実起動結果

- Codex CLI: Sol/highの親Agentがnative `spawn_agent`を使い、`fork_turns: "none"`でLuna/xhighを起動。
  子sessionの`turn_context`でも`gpt-5.6-luna` / `xhigh`を確認した。
- Codex App: freshなSol/high、Terra/xhighは子metadataと一致した。Lunaは`Unknown model`で拒否された。
- Codex App resume: 完了済みのSol/highおよびTerra/xhighへfollow-upすると、次turnはSol/lowになった。
  このためmodel / effort保持を確認できるまではfresh起動を使う。
- この差はcapabilityとして扱い、App/CLI別の希望値を共有configへ重複させない。将来AppでLunaが
  利用可能になれば、同じGenerator設定をnative Lunaへ解決する。

### D. pluginとしての回帰確認

```bash
node scripts/check-positioning.mjs
node plugins/harness/scripts/check-runtime-config.mjs
claude plugin validate plugins/harness
```

加えて、隔離したCodex marketplace installで `harness@agentic-harness-local` を再installし、cache内のskill、
template、同梱parserでも同じテストが通ることを確認する。

## 7. 完了条件

- 新規初期化されたconfigに、Codex推奨routingと説明コメントが入る。
- configのparse、merge、validation、昇格判断が自動テストで保護される。
- 通常Generator、失敗時のSol昇格、高リスク時の初回Solが期待どおり解決される。
- model変更時はfreshなGeneratorになる。
- Evaluatorは評価＋自己レビューを行い、証拠付き推薦だけを出す。
- Terraを通常・昇格・利用不能fallbackのいずれでも自動選択しない。
- Claude CodeとCodexで、設定表現は共有しつつhostごとの実行能力の違いを正直に扱う。
- resolverのPASSと実起動のPASSを分けて報告する。
- 実起動を証明できた場合はmodel / effortのhost側証拠を残す。証明できない場合は未対応または未検証と明記する。
- Harness導入済みrepoは変更しない。

## 8. 実装時の推奨判断

次の会話では、追加質問が必要になる新事実が見つからない限り、以下を採用して進める。

- config形式はTOMLのままにする。
- 昇格設定はGenerator配下の `[...generator.escalation]` に置く。
- retry 2、Evaluatorの証拠付き推薦、高リスクSprintをSol昇格条件にする。
- Luna利用不能時は明示されたSol / highへfallbackし、Solも利用不能なら `inherit` + warningにする。
- `docs/sprints/state.md` には具体的model名ではなく `Model Tier` を記録する。
- model tierが変わるときは、`balanced` でも対象Generatorをfreshにする。
- Claude Codeは既定 `inherit`。利用可能なmodel名を推定したり、Codex名から変換したりしない。
- 実dispatch経路を確認できなければ、resolverまで実装しても「実適用済み」とは扱わない。

## 9. 参考資料

- OpenAI model guidance: <https://learn.chatgpt.com/docs/models>
- Codex subagents / custom agents: <https://learn.chatgpt.com/docs/agent-configuration/subagents>
- Codex config reference: <https://developers.openai.com/codex/config-reference>
- Anthropic model configuration: <https://docs.anthropic.com/en/docs/about-claude/models>

model名、effort名、host機能は更新される可能性がある。実装開始時に公式資料と現在のhost capabilityを再確認する。

## 10. 新しい会話へ渡すプロンプト

以下をそのまま新しい会話へ貼り付ける。

```text
/Users/taisei/workspace/agentic-harness で、Codex model routingとGenerator自動昇格を実装してください。

最初に、このrepoのAGENTS.mdと
docs/proposals/codex-model-routing.md
を最後まで読み、現在の実装と差分を確認してください。この提案書を今回の正本として扱います。

目的:
- Codexの既定を Planner=Sol/high、Generator=Luna/xhigh、Evaluator=Sol/high にする
- 難しいSprint、2回目の連続implementation failure、Evaluatorの証拠付き推薦では、freshなGeneratorをSol/highへ昇格する
- 3回目の連続失敗は既存どおりユーザーへ返す
- Terraは通常経路にもfallback経路にも入れない
- Evaluatorは「評価＋自己レビュー」とし、実装は行わない
- Claude Codeは既定inheritを保ち、Codex名からmodelを推定・変換しない

重要:
- 既存のHarness導入repoには一切変更を加えないでください。変更対象はagentic-harness plugin本体だけです。
- configを解決できることと、実際に指定model / effortでSubagentが起動することを別々に検証してください。
- resolver出力だけで実起動までPASSしたと判断しないでください。
- host側metadataで実起動を証明できなければ、未検証または未対応と正直に記録してください。
- CodexとClaude Codeの配布・dispatch方式の違いを無視して、見かけだけ両対応にしないでください。
- 既存のAGENTS.md、CLAUDE.md、.codex/agents、.claude/agents、runtime configを上書きしないでください。
- target repoにpackage installを要求しないでください。同梱parser方針を維持してください。

進め方:
1. まずread-onlyで、現行schema、resolver、capability、dispatch経路、テストを調査する
2. docs/proposals/codex-model-routing.mdのテスト計画を、失敗する回帰テストとして先に追加する
3. config template、resolver、harness-loop、Evaluator、README / KNOWLEDGEを必要範囲で実装する
4. 実際のCodex dispatch面を確認し、可能ならLuna/xhighからfreshなSol/highへの切替をhost側証拠で検証する
5. Claude Codeのinheritとcapability-gatedな適用も回帰確認する
6. node scripts/check-positioning.mjs、node plugins/harness/scripts/check-runtime-config.mjs、可能ならclaude plugin validateを実行する
7. 最後にEvaluator視点の評価と、自分の変更に対する自己レビューを行う

完了時は、次を分けて報告してください。
- config / resolverで確認できたこと
- orchestrationで確認できたこと
- 実際のSubagent起動で確認できたこと
- 未検証またはhost制約で実現できなかったこと
- 変更ファイル、テスト結果、残るリスク

新しい事実により大きな設計判断が必要になった場合だけ質問してください。それ以外は提案書の「実装時の推奨判断」を採用して進めてください。テストが通ったら日本語のcommit messageでcommitし、Draft PRを作成してください。
```
