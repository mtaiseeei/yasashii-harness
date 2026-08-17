# Product

## 対象

- Agentic HarnessをCodex AppまたはCodex CLIで利用し、roleごとのmodel / effortを明示する利用者
- Agentic Harnessの配布物、runtime resolver、導入ガイダンスを保守する開発者

## 背景

Codex Desktop `0.148.0-alpha.9`では、custom agentを指定せずbuilt-in/default Agentへ
`gpt-5.6-luna` / `xhigh`を直接渡す起動が確認された。2026-08-17の確認では、子session
`01a00c9a-94b4-78c3-9398-6361f49d9f69`の最初のhost metadataがmodel `gpt-5.6-luna`、
effort `xhigh`、agent role `default`を記録した。

この確認により、Lunaを起動するためだけに`harness_luna_worker`を用意する配布経路は不要になった。

## ゴール

- Codexで明示されたLunaを、custom agent定義に依存せずbuilt-in/default Agentへ直接dispatchする。
- 配布物からcustom agentの作成・検査・routing案内を取り除き、利用者が追加定義を準備しなくてもよい状態にする。
- 旧`hosts.codex.custom_agents`設定が残る既存repoを停止させず、非推奨で無効な入力として分かりやすく案内する。
- Lunaが現在のhostで同期的に拒否された場合の安全なfallbackを維持する。
- App / CLIの古い説明を、確認できた事実と未確認事項を区別した現在の説明へ直す。

## 成功状態

明示的にLunaを選んだCodex roleがdirect dispatch契約を受け取り、global custom agent定義の有無に左右されない。
旧custom-agent設定が残っていても解決処理は継続し、native経路を使うことがwarningから分かる。
配布テンプレートと利用者向け説明にはcustom agentの作成手順が残らず、既存のfallbackと保護境界は回帰しない。

## 非ゴール

- ユーザー所有の`~/.codex/agents`配下を変更または削除すること
- Harness導入済みrepoの`.harness/config.toml`や`.harness/config.local.toml`を自動編集すること
- Codexの配布時model既定を`inherit`から変更すること
- Claude Codeのrole routingやmodel既定を変更すること
- resume時のmodel / effort保持を新たに保証すること
- Terraを自動routing候補に追加すること
- pluginの公開、Marketplace更新、導入済みcacheの更新までをこのSprintで実行すること
