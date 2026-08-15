# Hurry-Go-Round v0.9.3 実装仕様
## Dairy Expansion & Reliability Release
## 乳製品拡張と基盤安定化

対象リポジトリ：

```text
shogo-ishikawa/hurry-go-round
```

本タスクは、v0.9.1の最新`main`へ追加する**増分実装**です。

仕様作成時点の基準コミット：

```text
05141387cbefa08c60e1af3aa5705a77eaeec9d0
```

このコミットにはv0.9.1の研修小屋・集配ネットワーク実装が含まれています。

v0.9.2として検討していた牧草・牛・牛乳・バター・チーズの構想へ、実機プレイで判明した次の二つの重大問題を統合し、リリース番号を**v0.9.3**とします。

1. 東農地と鶏小屋を解放しても、加工場の解放場所・条件・操作方法が分からず、実際の加工システムへ到達できない
2. 手動保存・自動保存・続きからの再開が実機で正常に利用できない

したがってv0.9.3は、機能追加だけの更新ではありません。

```text
最優先：加工場と保存を実際に使える状態へ修復
次点　：牧草・牛・牛乳・バター・チーズを追加
将来性：行商人・輸入食材・装飾品へ拡張できるデータ設計
```

という三層構成です。

---

# 0. 作業開始前の必須確認

過去のCodexタスクや古いworktreeを再利用しないでください。

新しいCodexタスクを、最新の`main`から開始してください。

ファイル変更前に、次を実行します。

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

`HEAD`がGitHub上の最新`main`と一致しない場合は、ファイルを変更せず停止してください。

この仕様作成時点のSHAは、次です。

```text
05141387cbefa08c60e1af3aa5705a77eaeec9d0
```

この後に`main`が更新されている場合は、上記SHAへ固定せず、GitHub上の真の最新`main`を基準としてください。

## 増分実装の制約

次を再作成しないでください。

```text
Vite / Phaserプロジェクト
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
tsconfig.json
既存の契約システム
既存の永続化システム
既存の集配ネットワーク
過去の仕様書
```

既存ファイルが大量に「新規追加」扱いになる場合は、古い作業コピーを使用しています。PRを作成せず停止してください。

---

# 1. バージョン

次を更新します。

```text
package.json      0.9.1 → 0.9.3
package-lock.json 0.9.1 → 0.9.3
```

公開表示：

```text
Hurry-Go-Round v0.9.3
Dairy Expansion & Reliability Release
```

セーブスキーマ：

```text
schema 4 → schema 5
```

schema 1〜4の既存セーブを引き続き読み込める必要があります。

---

# 2. 実装順序

Codexは、次の順番で実装してください。

## Phase A：リリース阻害バグの修正

1. 実際の保存失敗を再現できるテストを追加
2. 時間値と整数在庫値の検証を分離
3. 手動保存・自動保存・再読込を実用可能にする
4. 保存結果を画面内で明確に表示
5. 加工場のランタイムシステムを実装・接続
6. 東農地＋鶏小屋解放後に、加工場への導線を明示
7. 製粉機・ベーカリーの建設・操作・生産を実機で可能にする
8. 集配所・加工場受入ボックスが実際に動作することを確認

Phase Aの受入条件を満たす前に、乳製品追加へ進まないでください。

## Phase B：牧草・酪農

1. ワールド拡張
2. 牧草地用地
3. 干し草
4. 牛舎
5. 牛1〜3頭
6. 干し草台
7. ミルクタンク
8. 牛乳生産
9. 酪農スタッフ
10. 集配ネットワーク接続

## Phase C：乳製品加工

1. 乳製品工房
2. バター
3. チーズ
4. 乳製品スタッフ
5. 市場・契約対応
6. 生産方針・保護在庫

## Phase D：保存・移行・総合検証

1. schema 5保存
2. schema 1〜4 migration
3. 保存中の加工・酪農状態の復元
4. Pages上で保存→再読込
5. PC・スマートフォン受入試験
6. 長時間自動化試験

---

# 3. v0.9.3の必須範囲

## 基盤修正

- 加工場の実体化
- 加工場解放条件の可視化
- 「次の目標」表示
- 加工場への案内機能
- 製粉機・ベーカリーの実ランタイム接続
- 集配ネットワークの実ランタイム接続
- 手動保存の修正
- 自動保存の修正
- タイトル画面の「つづきから」の修正
- 保存結果の明確な日本語表示
- IndexedDB失敗時の安全なfallback
- JSON書き出し・読み込みの回帰確認

## 牧草・酪農

- 牧草地用地
- 牧草地2段階拡張
- 干し草
- 牛舎
- 牛1〜3頭
- 干し草台
- ミルクタンク
- 牛乳
- 酪農スタッフ
- 酪農用集配ポイント

## 乳製品加工

- 乳製品工房
- バター
- チーズ
- 乳製品スタッフ
- 工房レベル1〜3
- 牛乳保護在庫
- 市場販売
- 出荷契約

## 将来拡張への互換性

- 将来の行商人・市場仕入れを想定した商品metadata
- 農場生産品と外部仕入れ品を区別できる設計
- 食肉は農場内の家畜減少と結び付けない
- 装飾品をResourceAmountsへ混ぜない

---

# 4. 今回実装しないもの

- 実際の行商人NPC
- フルーツ販売
- 食肉販売
- 装飾品ショップ
- トマト
- レタス
- じゃがいも
- サンドイッチ
- クッキー
- プリン
- チーズトースト
- 牛の繁殖
- 牛の病気
- 牛の寿命
- 牛肉
- 屠畜表現
- 羊
- 豚
- 季節
- 天候
- クラウドセーブ
- アカウント同期
- オフライン生産
- 課金
- 広告
- マルチプレイヤー

ただし、将来これらを追加しても資源・商品・装飾品の型を全面再設計しなくて済むよう、metadataと保存拡張点を用意します。

---

# 5. 仕様書構成

```text
docs/v0.9.3/
├── README.md
├── RELEASE_BLOCKERS.md
├── PASTURE_AND_DAIRY.md
├── DAIRY_LOGISTICS_AND_FUTURE_TRADE.md
├── PERSISTENCE_AND_MIGRATION.md
└── VALIDATION.md
```

各ファイルをすべて読んでから実装してください。

---

# 6. 公開UI方針

公開文字列は、ゲーム名とバージョン以外すべて日本語にします。

重要な表示例：

```text
次の目標
加工場を建てられるようになりました
加工場へ案内
保存しました
保存に失敗しました
簡易保存へ切り替えました
牧草地
牛舎
干し草台
ミルクタンク
乳製品工房
酪農スタッフ
乳製品スタッフ
```

エラーや前提不足を無反応にしないでください。

---

# 7. Codexへ渡す短い起動プロンプト

この仕様書PRを`main`へマージした後、新しいCodexタスクへ次だけを貼り付けます。

```text
Implement Hurry-Go-Round v0.9.3 as an incremental update to the latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read all files under docs/v0.9.3/.
3. Read README.md, docs/V0.9.1_SPEC.md, docs/ART_DIRECTION.md,
   docs/v0.9.0/, docs/v0.9.1/, and the current implementation/tests.
4. Run git rev-parse HEAD, git log -1 --oneline,
   git branch --show-current, and git status --short.
5. Confirm HEAD is the true latest main commit.
   If not, stop without modifying files.

Implement every required item in docs/v0.9.3/.

Treat the following as release blockers and complete them first:
- saving, autosaving, continue-from-save, and visible save feedback
- actual processing-yard unlock, construction, runtime operation, and guidance
- actual collection-network runtime integration

Then implement pasture, hay, cows, milk, the dairy workshop,
butter, cheese, dairy workers, market/contracts integration,
schema-5 persistence, migrations, and all required tests.

Preserve all working v0.9.1 gameplay, controls, contracts,
collection-network data, existing processing data, and the Pages base path:
/hurry-go-round/

Do not recreate the project, CI, Pages workflows, AGENTS.md,
Vite configuration, or previous specifications.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build

Review the complete diff and create a focused pull request.
If existing project files appear as newly added instead of incrementally modified,
stop without creating the pull request.
```

---

# 8. 最終報告に含める項目

1. 基準にした`main`のSHA
2. 保存失敗の再現条件
3. 保存失敗の根本原因
4. 保存修正内容
5. Pages上で行った保存確認
6. 加工場解放が分かるようにした方法
7. 加工場ランタイムの接続内容
8. 新しい資源
9. 牧草・牛乳の生産条件
10. バター・チーズのレシピ
11. 新スタッフの価格・積載量
12. 集配ネットワーク接続
13. schema 5の変更
14. migration結果
15. 自動テスト数と結果
16. PC確認
17. スマートフォン確認
18. 意図的に未実装とした機能
19. Pages公開後に利用者が確認すべき項目
