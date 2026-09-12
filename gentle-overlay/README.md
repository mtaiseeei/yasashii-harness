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

## 未commitの上流候補をローカルで確認する

確定した同期基点は `upstream-base.txt` のcommitです。commit前の承認済み修正を両版で確認する場合だけ、
同じHEADを持つ別の上流checkoutを `--upstream-worktree <絶対パス>` で明示します。

```bash
bash scripts/sync-harness.sh --apply --offline --upstream-worktree /absolute/path/to/agentic-harness
bash scripts/sync-harness.sh --check --offline --upstream-worktree /absolute/path/to/agentic-harness
bash scripts/regression-check.sh --upstream-worktree /absolute/path/to/agentic-harness
```

この経路は `CANDIDATE_OK` と表示し、固定SHAや公開versionを更新しません。候補反映後の引数なし
`--check` は旧基点との差を検出します。これは確定同期完了ではありません。
上流候補の追跡対象ファイルとgitignore対象外の追加ファイルを読み、下流固有ファイルは取り込みません。
下流所有のREADME・positioning検査・LICENSEは従来どおり別に確認します。
`--apply` は最初の書込み前に全対象を確認し、HEADとも合成結果とも異なる既存編集やsymlinkを拒否します。
ローカルの削除も保護します。削除済みの上流ファイルを意図して復元するときだけ `--restore-missing` を併用します。
拒否された編集を消して進めず、内容を確認して競合箇所だけを統合します。

上流でcommitされた変更を取り込む段階では、通常の基点更新と差分レビューへ戻ります。
commit / push / release / cache更新は、この候補確認の権限には含まれません。

明示承認済みの正式配布では、候補確認と区別して確定した上流commitを通常mergeし、`upstream-base.txt`と対応表を更新します。競合は既存変更と追加節を保持して必要箇所だけ解消し、固定SHAのsync検査と独立評価後にdownstreamのoriginへ公開します。初期化や候補確認そのものは公開を許可しません。
