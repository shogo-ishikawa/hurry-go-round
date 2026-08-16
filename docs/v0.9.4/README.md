# Hurry-Go-Round v0.9.4
## Runtime Completion & Save Recovery

対象リポジトリ：

```text
shogo-ishikawa/hurry-go-round
```

v0.9.4は、新しい作物や動物を追加するリリースではありません。

v0.9.0〜v0.9.3で追加されたとされる次の機能を、実際のGitHub Pages上で発見・購入・操作・保存・再開できる状態へ完成させるための修復リリースです。

```text
加工場
製粉機
ベーカリー
集配所
各集配ボックス
集配スタッフ
牧草地
牛舎
牛
牛乳
乳製品工房
バター
チーズ
酪農スタッフ
乳製品スタッフ
セーブ
自動保存
つづきから
```

## 1. 現在の状況

v0.9.3の`main`には、次の種類のコードが存在します。

- 加工レシピの純粋ロジック
- 集配ネットワークの純粋ロジック
- 牧草・牛・牛乳・バター・チーズの状態型と純粋ロジック
- 保存スキーマ
- migration
- 単体テスト
- `GameScene.update()`内の一部時間更新

しかし、次が不足しています。

- マップ上の施設
- 施設の購入範囲
- 前提条件の案内
- 実際の購入処理
- プレイヤーが利用する搬入・回収範囲
- 新しいスタッフの実体
- スタッフの移動と積載表示
- カメラ固定HUD
- 加工場・集配所・酪農施設の管理画面
- 実ゲーム状態を使った保存試験
- GitHub Pages上の保存→再読み込み→つづきから試験

したがって、型や関数が存在することと、ゲーム内で利用できることが一致していません。

## 2. v0.9.4の最優先原則

### 2.1 新機能追加を凍結する

次の機能はv0.9.4へ追加しません。

- 新しい作物
- 新しい動物
- 新しい加工品
- 時刻
- 季節
- 行商人
- 装飾品
- オフライン進行

v0.9.4は、既存の未完成機能を完成させることだけを目的とします。

### 2.2 一つの巨大なCodexタスクにしない

v0.9.4は、必ず次の4段階を別々のCodexタスク・別々のPRとして実装します。

```text
Phase 1: Save Recovery
Phase 2: Processing Runtime
Phase 3: Collection Runtime
Phase 4: Dairy Runtime & Final Release
```

各Phaseは、直前のPRが`main`へマージされた後に、最新`main`から新しいCodexタスクを開始します。

過去のCodexタスクやworktreeを継続使用しません。

### 2.3 「実装済み」の定義

機能は、次の6層がすべて揃った場合だけ実装済みとします。

1. **State**：権威ある状態がある
2. **Logic**：純粋ロジックがある
3. **Runtime**：Scene/Systemが毎フレーム処理する
4. **Interaction**：プレイヤーが購入・利用できる
5. **Presentation**：施設・人物・HUD・案内が見える
6. **Persistence & E2E**：保存・復元とブラウザー試験がある

状態型と単体テストだけでは実装済みとしません。

## 3. 実装順序

### Phase 1 — Save Recovery

目的：

```text
今すぐ保存
→ 実際に保存成功
→ ページ再読み込み
→ つづきから
→ 同じ状態へ復元
```

必須：

- 実ランタイムスナップショットの正規化
- 保存前検証
- 書込後検証
- primary/backup復旧
- IndexedDB失敗時fallback
- 保存自己診断
- ブラウザーE2E

Phase 1が通るまで、Phase 2以降へ進みません。

### Phase 2 — Processing Runtime

目的：

```text
東農地と鶏小屋を解放
→ 加工場予定地が見える
→ 条件と価格が分かる
→ 加工場を購入
→ 製粉機を建設
→ 原料を搬入
→ 小麦粉・コーンミールを生産
→ ベーカリーを建設
→ パン・コーンブレッドを生産
```

純粋ロジックを実際のマップ・操作・HUDへ接続します。

### Phase 3 — Collection Runtime

目的：

```text
集配所を建設
→ 集配ボックスを建設
→ 商品を預ける
→ 集配スタッフを雇う
→ スタッフが実際に移動
→ 加工場または倉庫へまとめて配送
```

`collectionNetwork`を状態だけでなく、実際に動くシステムへします。

### Phase 4 — Dairy Runtime & Final Release

目的：

```text
牧草地を購入
→ 牧草を収穫
→ 牛舎を建設
→ 牛を飼う
→ 干し草を与える
→ 牛乳を得る
→ 乳製品工房でバター・チーズを作る
→ 市場・契約・集配へ接続
```

Phase 4完了時にのみ、package versionと表示を正式な`0.9.4`へします。

## 4. バージョン運用

Phase 1〜3では、ゲームの公開バージョンを途中で更新しない方針を推奨します。

必要なら開発表示だけを次のようにします。

```text
v0.9.4-dev1
v0.9.4-dev2
v0.9.4-dev3
```

正式な、

```text
0.9.4
```

はPhase 4と最終受入試験の完了後に設定します。

## 5. 基準コミット

仕様書作成時点の最新`main`：

```text
e1186af34c32b9d23412bbc7c5bd36c3981e6d0b
```

各Codexタスク開始時には、このSHAを固定値として盲信せず、GitHub上の真の最新`main`を確認します。

実装前に必ず実行します。

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

HEADが真の最新`main`と一致しない場合、変更せず停止します。

## 6. 各Phaseの必須ドキュメント

```text
docs/v0.9.4/ROOT_CAUSE.md
docs/v0.9.4/PHASE_1_SAVE_RECOVERY.md
docs/v0.9.4/PHASE_2_PROCESSING_RUNTIME.md
docs/v0.9.4/PHASE_3_COLLECTION_RUNTIME.md
docs/v0.9.4/PHASE_4_DAIRY_RUNTIME.md
docs/v0.9.4/FINAL_ACCEPTANCE.md
docs/v0.9.4/CODEX_TASKS.md
```

## 7. 変更禁止

実際の不具合が確認されない限り、次を再作成しません。

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
tsconfig.json
既存の仕様書
既存の入力方式
既存の市場・契約ロジック
```

`/hurry-go-round/`のPages baseを維持します。

## 8. リリース条件

v0.9.4は、次がGitHub Pages上で確認できるまで公開完了としません。

```text
1. 保存できる
2. 再読込後につづきから再開できる
3. 加工場を購入・利用できる
4. 集配所を購入・利用できる
5. 牧草地・牛舎・乳製品工房を購入・利用できる
6. 各スタッフが実際に移動して資源を運ぶ
7. 市場・契約へ新商品が流れる
8. PCとスマートフォンで主要操作が成立する
9. コンソールエラーがない
10. 30分相当の連続シミュレーションで負数・二重生成・停止がない
```

## Phase 3 implementation

The collection network is now connected to the playable runtime. After purchasing the processing yard, players can build the collection hub and resource-specific boxes, deposit or recover matching cargo, hire and train a visible courier, select routing, and deliver batches to the processing intake or barn. Collection construction, inventories, courier progress, and routing continue through the existing v0.9.4 save snapshot.
