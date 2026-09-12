# 保護境界

- 初期化は既存guidance・設定・Agent定義を上書きしない。承認済み保守移行と区別する。
- 保守移行は元履歴、ユーザー独自規則、dirtyを保持する。ユーザー所有のruntime / model / 権限設定を無関係に変更しない。
- 今回はroot guidance、role指示、Skill、templates、docs、必要なruntime / migration実装と検査の整合修正を承認済み。
  過去の「常に3役」「Agent定義変更不可」を今回の設計変更の拒否理由にしない。host所有Agent設定への権限は増やさない。
- 重要なユーザー判断・高リスクの副作用は既存承認境界を守る。沈黙を承認扱いしない。
- target repoへpackage manifest / lockfile / node_modulesや新しいネットワーク依存を追加しない。
- resolverのmodel / effort解決・dispatch・availability fallbackは継承する。値の推測補正、未観測のlaunch-verified主張をしない。
- 既存の初期化・hookの安全境界とClaude / Codexの対応を維持する。Playwright MCPを必須にしない。
- 顧客code・source・詳細履歴をfixture / docsへ転記しない。検証資料は合成する。
- 正式downstream手順に従いAgentic確定後にYasashiiへ反映し、下流branding / 配布識別と双方dirtyを保持する。
- 限定commitはSprint ID prefix付き対象差分のみ。remote push / tag / Release / installed更新は今回の承認に含まない。
