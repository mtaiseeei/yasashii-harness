# Sprint 001 — Native Luna direct dispatchへの一本化

- Type: main
- Risk: standard

## 目的

CodexでLunaを明示したroleをbuilt-in/default Agentへ直接dispatchする経路を正式経路とし、
配布pluginからHarness専用custom agentのprovisioningとrouting依存を撤去する。

## 背景と前提

- 2026-08-17にCodex Desktop `0.148.0-alpha.9`、multi-agent v2で、custom agentを指定しない
  `gpt-5.6-luna` / `xhigh` childがhost metadataまで一致することを確認済み。
- 確認したchild sessionは`01a00c9a-94b4-78c3-9398-6361f49d9f69`、agent roleは`default`。
- 計画時点の`main`は`origin/main`と一致し、土台はHarness `0.5.2`のcommit
  `fd77e47d752e7973cb5bfdeaa83798b69b0721c7`。
- ユーザーは残る小さな設計判断をPlannerへ委ねた。既存ローカル環境の移行や削除は求めていない。
- このrepoには合格済みBase Sprintがないため、Patchではなく最初のmain Sprintとする。

## Scope

1. Codex Luna routingをnative direct dispatchへ統一し、custom agent定義の状態でrouting結果が変わらないようにする。
2. 旧`hosts.codex.custom_agents`入力を非推奨として許容し、無視したことと実効native経路をwarningで伝える。
3. 配布テンプレートから旧custom-agent設定を削除する。
4. Harness専用Luna Agentの検査・provision用scriptと、それを使うruntime分岐を配布コードから削除する。
5. Skill、AGENTS / CLAUDE template、harness-guidance template、README、KNOWLEDGE、routing提案、回帰テストを現在のnative経路へ整合させる。
6. 以前のcustom-agent提案は、残す場合も廃止済みの歴史資料として明示する。
7. Luna→configured strong Sol→`inherit`の同期的な起動前拒否fallbackと、Terra非選択を維持する。
8. runtime配布変更としてversion正本を`0.5.3`へ同期する。

削除対象の配布実行コードには、少なくとも次を含む。

- `plugins/harness/scripts/codex-custom-agent.mjs`
- `plugins/harness/scripts/provision-codex-agent.mjs`

## Non-scope

- `~/.codex/agents/harness-luna-worker.toml`を含むユーザー所有ファイルの変更・削除
- 導入済みrepoの`.harness/config.toml`、`.harness/config.local.toml`、Agent定義の自動変更
- 配布時のmodel / effort既定、Claude Code routing、retry閾値、high-risk判定の変更
- resume保持能力の再設計
- Terraまたは`codex exec`の自動fallback追加
- pluginの公開、Marketplaceへのupload、導入済みplugin/cacheの自動更新

## 受け入れ基準

### AC-01 Native Luna contract

Codex roleが明示的に`gpt-5.6-luna` / `xhigh`へ解決されるとき、resolverのdispatch契約は
`mode: direct`で正確なmodel / effort overrideを持ち、custom agent名、定義status、provisioningを起動条件にしない。

### AC-02 Legacy config compatibility

共有または個人configに`hosts.codex.custom_agents`が残っていてもresolverは失敗しない。
旧`enabled`値はroutingへ影響せず、非推奨path、無視すること、native direct dispatchを使うことがwarningで分かる。
ユーザーへ設定やglobal Agent定義の削除を必須作業として要求しない。

### AC-03 Distributed surface removal

新規初期化configと現在形の配布ガイダンスは`harness_luna_worker`の作成・選択を案内しない。
Harness専用Luna Agentの検査・作成scriptは配布コードから削除され、resolverもそれらをimport・呼び出し・出力しない。

### AC-04 Safe fallback preservation

Lunaの子作成前`Unknown model`だけが既存availability fallbackへ入り、通常Generatorはconfigured strong Solへfreshに切り替わる。
Solも同期的に拒否された場合は`inherit`へ戻る。実装失敗などをlaunch rejectionへ誤分類せず、Terraも自動選択しない。

### AC-05 Documentation truthfulness

現在形のApp対応説明は2026-08-17のdirect Luna/xhigh起動証拠を反映する。
過去の`Unknown model`やcustom-agent実験は当時の記録と明記し、現在必要な手順として読めない。
resolver成功とhost metadataによる`launch-verified`を引き続き区別する。

### AC-06 Regression and release consistency

既存のpositioning、loop-rule、runtime-config回帰がすべて成功し、変更対象JSON manifestが妥当である。
Claude marketplace、Claude plugin manifest、Codex plugin manifestのversion正本が`0.5.3`で一致する。

### AC-07 User-owned state protection

実装・検証はユーザー所有の`~/.codex/agents`と導入済みrepo設定を変更・削除しない。
repo外の実ファイルを移行する処理を追加しない。

## 検証スコープ（着手時に固定）

- resolverのnative dispatch契約
- 旧custom-agent設定の互換warning
- Luna / Solの起動前拒否fallback
- 新規初期化テンプレートと配布ガイダンス
- custom-agent検査・provisionコードの配布撤去
- staleなApp / CLI説明の更新
- manifest version同期
- 既存回帰コマンドのgreen

UI、ブラウザ、外部サービス、公開済みMarketplace、ユーザーのglobal Agent directoryは検証対象外。

## 必須証拠とsafe harbor

合否には[Evaluation Rubric](../spec/rubric.md)のsafe harborを使う。
特に次をprogress / feedbackへ残す。

1. `node scripts/check-positioning.mjs`
2. `node scripts/check-loop-rules.mjs`
3. `node plugins/harness/scripts/check-runtime-config.mjs`
4. 変更したJSON manifestに対する`python3 -m json.tool`
5. 配布面からprovision用scriptと現在形のcustom-agent案内が消えたread-only検索結果
6. direct Luna、legacy設定、Luna→Sol→inherit、Terra非選択に対応するresolver assertionの結果

これは非UI pluginのため、ブラウザ操作やスクリーンショットは要求しない。上記コマンドと既存の
2026-08-17 child metadata記録が揃えば十分であり、追加の証拠収集基盤は作らない。

## 実装上の引き渡し条件

- Generatorは変更ファイル、削除ファイル、version変更、テスト結果、未実施のoptional確認をprogressへ記録する。
- GeneratorはSprint ID `sprint-001`をprefixにした日本語commitを作成する。
- Evaluatorは実装を修正せず、各findingを`product`または`verification-infra`へ分類する。
