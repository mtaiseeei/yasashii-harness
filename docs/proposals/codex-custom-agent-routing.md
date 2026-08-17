# 廃止済み: Codex custom-agent Luna routing実験

Status: Historical record only. Distributed routing removed in Harness 0.5.3.

この文書はHarness 0.5.1で試した互換経路の歴史資料であり、現在の設定・導入手順ではない。
2026-08-03時点のCodex Appでは、custom Agent定義を使ったLuna起動とdispatch supplied effortの適用を確認した。
当時はnativeなLuna direct dispatchがAppで安定していなかったため、一時的な代替経路として採用した。

2026-08-17、Codex Desktop `0.148.0-alpha.9`、multi-agent v2でbuilt-in/default Agentへ
`gpt-5.6-luna` / `xhigh`を直接渡す起動がhost metadataまで一致した。child sessionは
`01a00c9a-94b4-78c3-9398-6361f49d9f69`、agent roleは`default`だった。

この証拠に基づき、Harness 0.5.3では次の変更を行った。

- Lunaを含む明示model / effortはnative `spawn_agent`のbuilt-in/default Agentへ直接渡す。
- Harness専用Agent定義の検査、作成、provisioning、routing分岐を配布物から撤去する。
- 旧`hosts.codex.custom_agents`tableは互換性のため受理するが、値を無視して非推奨warningを出す。
- 既存設定とユーザー所有Agent定義は変更せず、削除も要求しない。
- Luna→configured strong Sol→`inherit`のavailability fallbackとTerra非選択を維持する。

現在の実装・運用契約は[Codex model routing と自動昇格の実装記録](codex-model-routing.md)を参照する。
