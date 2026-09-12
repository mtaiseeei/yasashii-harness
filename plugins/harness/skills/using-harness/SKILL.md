---
name: using-harness
description: 新しいアプリ・まとまった機能開発、Harness管理repoの次Sprint・Patch、Harnessの初期化・導入確認の入口。監査や質問だけでは開発を開始しない。
---

<SUBAGENT-STOP>
特定roleのためdispatchされたsubagentはこの入口を繰り返さず、自分の担当作業に集中する。
</SUBAGENT-STOP>

# Harness を使う

短い指示から大きな開発を継続する入口。現在の依頼と既存承認を優先する。

## 管理コマンド

- `$using-harness init` / 「Harnessを初期化して」: plugin rootの `scripts/harness.mjs init --root <repo>` をNode.jsで実行する。
- `$using-harness check` / 「Harnessの導入状態を確認して」: 同じCLIの `check --root <repo>`。完全read-only。
- Harness CLIによる既存repo guidanceの`upgrade`: 未実装と報告し、既存ファイルを変更せず最新版とも判定しない。
  plugin自体の更新はhostのmarketplace/plugin管理で行う別操作であり、この未実装の対象ではない。

init/checkだけなら結果を報告し、PlannerやSprintを開始せず、`harness-loop`へ進まない。
対象repoにpackage.json/lockfile/node_modulesを作らず、package installを要求しない。
plugin rootはこのSkillの2階層上。init/checkでは既存guidance・設定・Agent定義は上書きしない。

## 開発する依頼

「アプリを作って」「まとまった機能を実装」「次のSprintを進めて」「続きから」なら
[ループ](../harness-loop/SKILL.md)へ進む。`/harness`の追加入力は要求しない。
承認済みの監査で必要修正まで依頼された場合も、範囲を引き継いで進める。

- 非管理下のリポジトリ（stateとspecが両方ない）ではtypo、1行変更、設定変更など単発の非機能修正は直接扱える。
- Harness管理下は[変更分類](../harness-loop/references/scope.md)で直接修正 / micro / 通常Patchを選ぶ。
  microは同一の機能面・同一フローに閉じ、低リスクで独立検証できる場合。既存自動チェックだけを資格にしない。

どう動くか（3 role）: Plannerが仕様・契約、Generatorが実装・progress、Evaluatorが独立評価・feedbackを書く。
stateはオーケストレーターだけが書く。ホストが複数Agentを扱える場合はdispatchし、不可ならroleごとの独立作業単位へfallbackする。
初回の不足分生成・runtime・移行・失敗時の詳細はループが条件に応じて案内する。
