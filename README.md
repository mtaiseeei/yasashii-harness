# やさしいハーネス（yasashii-harness）

やさしいハーネスは、非エンジニア向けAI秘書 **やさしいセクレタリ（yasashii-secretary）** と連携して
「開発の脳」を担う補助プラグインです。秘書に「〇〇を作って」と頼んだときの設計・実装・検証を引き受けます。

上流Agentic Harnessの仕組みを保ち、進捗や判断理由を平易な日本語で説明します。
小変更は直接修正と必要な確認で完了し、通常機能は短い計画と完成時の独立レビューで進めます。
大きく曖昧な開発は必要な仕様とSprintを使い、高リスク操作の承認境界・実行前確認・実行後検証を守ります。

https://github.com/mtaiseeei/agentic-harness

## やさしいシリーズでの位置づけ

- **やさしいセクレタリ**: 記憶・予定・プロジェクトを扱うAI秘書。日々の窓口です。
- **やさしいハーネス**: 秘書から開発依頼を受け、目的・決定・現在地を引き継いで完成まで進める担当です。

https://github.com/mtaiseeei/yasashii-secretary

独立したpluginなので単体でもClaude Code / Codexから使えます。

## 入れ方

Claude Code:

```text
/plugin marketplace add mtaiseeei/yasashii-harness
/plugin install harness@yasashii-harness
```

Codex:

```text
codex plugin marketplace add mtaiseeei/yasashii-harness
codex plugin add harness@yasashii-harness
```

導入後は「〇〇なアプリを作って」「表示順を直して」と普通に依頼できます。
明示入口はClaude Codeの `/harness`、Codexの `$using-harness`。
共通の入口は [using-harness](plugins/harness/skills/using-harness/SKILL.md) です。

## 進め方

| 依頼 | 動き |
|---|---|
| 小さく可逆な修正 | 小さな挙動変更も直接修正・必要検証で完了。独立レビューやmicro契約を必須にしない |
| 通常の機能追加 | 必要な短い計画を作り、実装・検証後に独立レビュー |
| 移行・権限・本番重要操作 | 対象・影響・復旧方法と承認を実行前に確認し、実行後検証と独立レビュー |
| 大きく曖昧な開発 | 必要な資料と仕様で設計し、意味のある単位で実装・独立評価 |

行数・画面数・自動テストの有無だけで振り分けません。
承認済みの可逆な修理は進め、重要な未決判断や未承認の副作用だけを確認します。
資料にある決定を聞き直さず、今回必要な判断が解決したら質問を終えます。深いgrillingの依頼にも対応します。

現在状態から関係する仕様・コードを読み、理由や矛盾が必要なときだけ関連履歴を探します。
全Sprintや全履歴を毎回読みません。既存の正本を使い、CONTEXT.mdや定型文書群を一括追加しません。
現在状態は一つの文書を更新し、実装済み・検証済み・配備済みを分けます。過去詳細は履歴に保持します。

## 初期化・既存文書の移行

`/harness init` / `$using-harness init` は不足分だけを作り、既存文書を上書きしません。
`check` は読取専用の導入確認です。独自配置の仕様や状態も再利用できます。
これらの管理操作だけでは開発を開始しません。

plugin更新だけでは古いrepo指示は変わりません。`upgrade` は既存文書の候補確認から始めます。
変更範囲をpreviewし、独自規則・dirty・未解決事項を保持して、承認済み範囲だけを適用します。
元の内容は保管し、古い候補からの上書きや参照切れを検査します。

```bash
node /path/to/harness-plugin/scripts/harness.mjs upgrade --root /path/to/repo
```

必要時だけ [文書移行の手順](plugins/harness/skills/harness-loop/references/migration.md) を使います。
初期化は全OSでNode writerを使い、対象repoへの依存installは不要です。

## インストール済みpluginの更新

公開版を更新する場合は、登録元marketplaceを更新して同じpluginを取得します。
Claude Codeでは現在のscopeに合わせてください。

```bash
claude plugin marketplace update yasashii-harness
claude plugin update harness@yasashii-harness --scope user
claude plugin list --json
```

```bash
codex plugin marketplace upgrade yasashii-harness
codex plugin add harness@yasashii-harness
codex plugin list --marketplace yasashii-harness --json
```

ローカルpathで登録したmarketplaceはcheckoutを先に更新します。既存dirtyを保持し、cacheを直接編集しません。
本checkoutの未公開候補と公開済みpluginは別です。導入済みversionと実内容を確認します。

## モデル設定と検証

model/effortはhost継承が既定です。共有 `.harness/config.toml` と個人 `.harness/config.local.toml` の
明示したleafだけを使い、モデル名を推測変換しません。本チャットのモデル設定は変更しません。
roleの起動確認はhost metadataで確かめ、resolverの設定解決だけで起動成功を主張しません。
詳細は必要な場合だけ [runtime](plugins/harness/skills/harness-loop/references/runtime.md)。

UIは実操作、CLI/APIは実行と入出力で確認します。必要検証後、新しい懸念がなければ全検査を繰り返しません。
品質PASSと速度計測は区別し、未計測の高速化率は主張しません。

## 上流との同期

上流本体は保持し、日本語の補足は宣言した追加節、配布識別はmetadata allowlistで扱います。
README・positioning検査・LICENSEは下流所有です。
同期時だけ [対応表](docs/upstream-mapping.md) と [手順](gentle-overlay/README.md) を使います。

記事のgrill-with-docsと同梱grillingは別実装です。出典とMIT Licenseは
[grilling Skill](plugins/harness/skills/grilling/SKILL.md) と [設計背景](docs/KNOWLEDGE.md) に保持しています。

## ライセンス

MIT。詳細は [LICENSE](LICENSE)。
