# Sprint 004 Patch 001 実装記録

対象: [契約](../sprints/sprint-004-patch-001.md) / Issue #13。基点 `08a80b0` と今回の作業差分。

- state/migration正本とLoop再開導線に、先頭の固定「現在地」一欄の置換、更新契機、旧値の履歴扱い、
  有効事項・counter保持、200行で打ち切らない検索、保護拒否時の整理未完了と独立作業への復帰を明記。
- initializerの新規stateにも同じ見出しを使用。既存CLI・保護検査・原文退避を再利用し、機能追加なし。
- `scripts/check-guidance-migration.mjs`: 合成長stateの既存例を拡張し、保護拒否/fallbackを1例追加。
  10,000行 / 210,150 bytes → 22行 / 900 bytes。9,501行目以降の承認・制約・未解決・counter・復帰先、
  旧Current ID 2個、原文archiveのbyte一致、preview無変更を確認。
  拒否時は原文無変更。fallback後の3回の引き渡しで現在地一欄を置換し、旧本文・counter・保留を保持、
  archiveを増殖させないことを確認。入力と候補は合成で、実顧客内容は使用していない。

検証: migration **9 PASS / 0 FAIL**、loop rules **4 surfaces**、positioning **5 checks**、`git diff --check` 成功。
追加検証コードの量は実行コード変更（initializerの見出し）を上回る。既存テスト内での合成入出力検証に限定した。

限界: 候補の意味判断・短い現在地からの新session再開は独立Evaluatorの確認対象。
上記テストはAgentが作成した候補と通常更新を再現し、自動要約やLLM判断の検証を称していない。
実業務repo、installed/global設定、実際のSprint stateは変更していない。commit/push/配備は未実施。
親は独立評価後にPatch 002 / #14へ進む。
