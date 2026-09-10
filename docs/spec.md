# Spec Index

Agentic Harnessの保守変更の正本インデックス。Sprint 001はCodex model routingの
native direct dispatchへの一本化、Patch 001はPlannerによる必要時のgrilling利用を扱う。

## 必読

- [Product](spec/product.md) — 対象、目的、成功状態、対象外
- [Features](spec/features.md) — 配布時の振る舞いと互換性
- [Constraints](spec/constraints.md) — fallback、安全境界、配布上の不変条件
- [Evaluation Rubric](spec/rubric.md) — 合否基準と証拠のsafe harbor

## 実行契約

- [Sprint 001](sprints/sprint-001.md) — native Luna direct dispatchへの一本化
- [Sprint 001 Patch 001](sprints/sprint-001-patch-001.md) — Plannerが必要性を判断してgrillingを利用する

Patch 001の振る舞い・対象外・受け入れ基準は上記Patch契約を正本とし、採点にはrubricの
Patch専用節を使う。Sprint 001の過去の契約・採点基準は変更しない。
