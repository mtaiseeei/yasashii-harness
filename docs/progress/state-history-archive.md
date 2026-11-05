# state履歴の退避とローカル適用

## 計画（2026-11-06）

目的: v0.6.1の実適用で残ったstate肥大化を解消し、現在地を短く保ちながら原文・有効な承認・未完了・counterを保護する。
利用者は11/6に残り5項目の実行を承認。上流/下流v0.6.1公開と両hostの導入は完了済み。

- 既存upgradeへ、Agentが明示レビューした履歴範囲を原文archiveへ移す計画情報を追加する。既定の原文保護は不変。
- 退避範囲は元文書の行範囲・SHA256・理由で固定し、短い現在地と同じ原文archiveへのリンク、現行として保持するexact fragmentを必須にする。意味の自動要約や無条件bypassは作らない。
- 履歴内の古いrepo外リンクは原文backupの文字列として保存するだけで、辿らない。live候補のリンク/パス制約は緩めない。
- stale source、無指定の保護原文脱落、不正範囲/範囲hash、現在地/原文参照なし、unsafe live linkは変更前に拒否。apply後は原文bytes、候補bytes、index/runtime/無関係差分の保持を確認する。
- 独立評価後、Mac miniの承認済み5repoで最新作業を確認し、短いstateと原文退避を1repoずつ適用。業務の実行・配備は行わない。
- 今回の文書差分を既存stage/dirtyと区別してcommit/push。fresh読込の確認後、両hostのglobal暫定ブロックを最小fallbackへ整理する。進行中セッションを停止しない。

確認: migration回帰（古いrepo外リンクを含む10k行の原文、現行承認/未完了/counter保持、誤計画拒否、再適用、dirty/index保護）、関連loop/positioning/runtime/manifestチェック、独立レビュー。
公開: 上流修正のpatch版を正式公開し、下流へ正式同期、両hostを正式更新する。顧客文書・原文backupを上流fixtureや公開repoへ持ち込まない。
完了後の復帰先: 5repoの通常開発へ、更新した現在地から戻れる状態を引き渡す。軽微なfindingの追加修理を完了条件にしない。

## 実装・検証

- `archiveSections`で原文の行範囲・SHA256・理由を指定。現行preserve、一つの現在地、同じ原文archiveへのリンクを必須化した。
- migration 12件、positioning 5件、loop 4件、runtime 57件がPASS。CRLF・最終改行なしを含む10k行の原文保全、不正計画の拒否、再適用、archive破損の拒否を確認した。
- 2026-11-06、隔離checkoutでFable（`claude -p`）が独立評価しPASS。コード必須修正なし。実適用前に原文の別保管を作る手順条件を採用した。
- 見送り: Agentが意味を誤判定したpreserve（F1/I6）、例へのplan.id補足（F2/I2）、旧検証基点の件数表記（F1/I1）。意味の引継ぎは実repo候補の独立レビューで確認する。
- 公開・host更新・5repo適用は後続の運用作業。sourceのテスト合格を実適用完了とは扱わない。
