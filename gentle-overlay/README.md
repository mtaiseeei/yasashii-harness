# gentle-overlay

`yasashii-harness` は、上流の本文・skills・agents・runtimeロジックを書き換えません。
やさしさ差分は `anchors.tsv` に列挙した、見出しに `yasashii` を含む追加セクションだけです。

例外は `downstream-owned.txt` に列挙したdownstream所有ファイル（`README.md`、
`scripts/check-positioning.mjs`、`LICENSE`）です。READMEと位置づけ検証はやさしいシリーズ
としての位置づけを全面的に書き下ろし、LICENSEは著作権表示だけをdownstream名義にするため、
同期時に内容を合成・検査しません。上流でこれらのパスに変更が入った場合は、
同期のたびに人が差分を確認して取り込み要否を判断します。

配布識別子だけは `metadata-overrides.json` の field allowlist に従って変更します。
同期時は `scripts/sync-harness.sh --apply`、検査時は `scripts/sync-harness.sh --check --offline` を使います。
上流の新しい節がやさしさ規約や6規律と矛盾しないかは、機械検査後に必ず目視確認します。
