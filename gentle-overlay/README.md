# gentle-overlay

`yasashii-harness` は、上流の本文・skills・agents・runtimeロジックを書き換えません。
やさしさ差分は `anchors.tsv` に列挙した、見出しに `yasashii` を含む追加セクションだけです。

配布識別子だけは `metadata-overrides.json` の field allowlist に従って変更します。
同期時は `scripts/sync-harness.sh --apply`、検査時は `scripts/sync-harness.sh --check --offline` を使います。
上流の新しい節がやさしさ規約や6規律と矛盾しないかは、機械検査後に必ず目視確認します。
