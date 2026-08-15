# Phase 3 — Collection Runtime

## 1. 前提

次が`main`へマージ済みであること。

```text
Phase 1: Save Recovery
Phase 2: Processing Runtime
```

Phase 3は、最新`main`から新しいCodexタスクとして開始します。

## 2. 目的

v0.9.1で追加された`collectionNetwork`を、実際に建設・利用できる集配システムへ完成させます。

完了ループ：

```text
加工場を解放
→ 集配所を建設
→ 生産地の集配ボックスを建設
→ 持ち物から商品を預ける
→ 集配スタッフを雇う
→ スタッフが集配ボックスへ移動
→ 商品をまとめて積む
→ 加工場受入ボックスまたは倉庫へ運ぶ
→ 加工・市場・契約へ流れる
```

## 3. PR

推奨ブランチ：

```text
codex/v0.9.4-collection-runtime
```

推奨PRタイトル：

```text
Complete v0.9.4 collection hub, local boxes, and courier runtime
```

## 4. Runtime System

次を実装します。

```text
CollectionNetworkSystem
CollectionFacilityView
CollectionCourierEntity
CollectionPanel
```

`GameScene`へ、

```ts
private collectionSystem!: CollectionNetworkSystem;
```

を追加し、

```ts
this.collectionSystem.update(delta);
```

を呼びます。

純粋ロジックだけで遠隔的に資源を移動する実装は禁止です。

## 5. Facility / Interaction Registry

既存の次の施設定義を実際に使用します。

```text
collection-hub
wheat-collection-box
corn-collection-box
egg-collection-box
processing-intake
```

次のInteractionを追加します。

```text
build-collection-hub
build-wheat-collection-box
build-corn-collection-box
build-egg-collection-box
open-collection-panel
deposit-wheat-collection-box
deposit-corn-collection-box
deposit-egg-collection-box
withdraw-wheat-collection-box
withdraw-corn-collection-box
withdraw-egg-collection-box
```

集配スタッフの雇用・研修は、

```text
研修小屋
集配所パネル
```

の両方から行えます。

内部取引関数は同じものを使います。

## 6. 集配所

### 6.1 建設条件

```text
加工場用地を購入済み
600コイン
```

### 6.2 見た目

- 木造または石造の小さな配送事務所
- 荷車置き場
- 配送伝票掲示板
- 空の荷台
- ルート案内板
- 集配スタッフ待機場所
- 加工場・倉庫へつながる道

裸の地面文字を使用しません。

### 6.3 建設操作

```text
範囲内に1200ms
進捗リング
成功時に600コインを1回だけ減算
hubBuilt = true
優先保存
```

## 7. 生産地集配ボックス

### 7.1 麦畑

```text
建設費：180コイン
容量：24
対応資源：麦
```

### 7.2 東農地

```text
建設費：260コイン
容量：28
対応資源：とうもろこし
前提：東農地解放済み
```

### 7.3 鶏小屋

```text
建設費：280コイン
容量：18
対応資源：たまご
前提：鶏小屋解放済み
```

### 7.4 見た目

各ボックスは資源ごとに異なる形を使います。

```text
麦：木箱＋麦束
とうもろこし：背の高い木枠＋黄色い実
たまご：藁入り低箱＋卵ケース
```

空・少量・半分・満杯を視覚化します。

### 7.5 プレイヤー預入

持ち物から対応資源だけを1個ずつ預けます。

```text
麦箱は麦のみ
とうもろこし箱はとうもろこしのみ
卵箱はたまごのみ
```

他資源は持ち物へ残します。

一個あたり：

```text
100〜160ms
```

実際の表示範囲と判定範囲を一致させます。

### 7.6 取り出し

物流詰まりから復旧できるよう、集配パネルまたは別側の小さな回収範囲から、プレイヤーが対応資源を取り出せます。

- 持てる数を超えない
- ボックスを負数にしない
- 配送スタッフと同時アクセスしてもatomic

## 8. 集配スタッフ

### 8.1 雇用

```text
480コイン
前提：集配所建設済み
```

### 8.2 研修

```text
Lv1：積載10
Lv2：積載14
Lv3：積載18
```

速度・積込・荷下ろし間隔も改善します。

### 8.3 Runtime stages

```ts
type CollectionCourierStage =
  | "not-hired"
  | "idle-at-hub"
  | "select-source"
  | "moving-to-source"
  | "loading"
  | "waiting-for-batch"
  | "select-destination"
  | "moving-to-processing"
  | "moving-to-barn"
  | "unloading-processing"
  | "unloading-barn"
  | "returning-to-hub";
```

既存state名と整合させます。

### 8.4 実体

- 配送帽
- 大きな荷車
- 積載物の物理表示
- 空・部分積載・満載
- 道路上を移動
- 建物を通り抜けない
- shutdown時に破棄

### 8.5 Source選択

次を考慮します。

```text
box在庫
source age
round-robin
現在の積載資源
目的地での需要
```

同じボックスだけを永久に優先しません。

### 8.6 バッチ出発

次のいずれかで出発します。

```text
積載上限へ到達
sourceが空
900ms待機
加工場の緊急原料不足
```

1個だけ積んで長距離往復する挙動を防ぎます。

## 9. 配送先

### 9.1 モード

```text
自動
加工場優先
倉庫優先
```

### 9.2 加工場優先

加工場受入ボックスが受け入れ可能で、対応機械が存在する場合、加工場へ運びます。

対象：

```text
麦
とうもろこし
たまご
```

### 9.3 倉庫fallback

次の場合は倉庫へ運びます。

```text
加工場未建設
対象機械未建設
機械停止中
受入ボックス満杯
対象レシピなし
加工場ルート利用不能
```

スタッフを永久停止させません。

### 9.4 自動モード

優先順位：

```text
1. 進行中契約の保護量
2. 鶏の緊急餌
3. 加工機械の実需要
4. 市場最低在庫
5. 倉庫
```

ただし、Phase 3では過剰な最適化を行わず、決定的で説明可能なルールを使います。

## 10. 加工場受入ボックス

### 10.1 見た目

- 大型仕分け箱
- 麦・とうもろこし・たまごの区画
- 入荷方向
- 機械方向の矢印
- 容量ゲージ

### 10.2 容量

```text
36
```

### 10.3 自動仕分け

`ProcessingSystem`と協調し、1個ずつ機械inputへ移します。

```text
麦・とうもろこし → 製粉機
小麦粉・コーンミール・たまご → ベーカリー
```

Phase 3のローカル集配箱は原料3種だけですが、受入ボックス自体は既存加工品の入力にも対応できる設計を維持します。

### 10.4 一つの権威ある更新

`ProcessingSystem`と`CollectionNetworkSystem`の両方が同じフレームに、同じ受入在庫を独立更新しません。

推奨：

```text
CollectionNetworkSystem：受入ボックスへの配送
ProcessingSystem：受入ボックスから機械への仕分け
```

update順序を固定します。

```text
collection.update(delta)
processing.update(delta)
```

または、明確なtransaction queueを使います。

## 11. CollectionPanel

集配所でE/Spaceまたはボタンから開きます。

表示：

```text
集配所
配送モード：自動
集配スタッフ：Lv1　倉庫へ運搬中
積載：麦 8 / 10

麦畑集配箱  12 / 24
東農地集配箱  18 / 28
鶏小屋集配箱  6 / 18
加工場受入箱  20 / 36
```

操作：

- 集配所建設
- 各ボックス建設
- 集配スタッフ雇用
- 研修
- 配送モード変更
- ボックスから倉庫へ緊急移送
- 詰まり状態の説明

## 12. 状態と通知

公開状態例：

```text
集配所で待機
麦畑へ移動中
麦を積み込み中 8/10
加工場へ配送中
倉庫へ配送中
加工場受入箱が満杯
配送できないため倉庫へ変更
```

内部enum名を表示しません。

通知は中央GuidanceSystemを使用します。

## 13. 保存・復元

保存対象：

- hubBuilt
- box built状態
- box在庫
- processing intake
- routingMode
- courier hired/level/capacity
- courier carried
- stage
- sourceId
- destinationId
- waitMs
- roundRobin index
- source ages

ロード時：

```text
積載0 → hubから再開
積載あり＋processing destination → 加工場へ再出発
積載あり＋barn destination → 倉庫へ再出発
不正destination → 安全に倉庫へfallback
```

資源を失いません。

## 14. Unit tests

- 建設価格と前提
- 二重建設防止
- 対応資源だけ預入
- 対応資源だけ取出
- box容量
- atomic simultaneous access
- source selection公平性
- batch departure
- processing destination
- barn fallback
- intake capacity
- sorting allowlist
- worker hire/train
- route stage transition
- save/restart task
- 資源不変条件

## 15. Browser E2E

fixture：

```text
加工場解放済み
所持金5000
持ち物：麦10、とうもろこし10、たまご8
```

必須：

```text
1. 集配所建設
2. 麦箱建設
3. 麦を預ける
4. 集配スタッフ雇用
5. スタッフが麦箱へ移動
6. 複数個積載
7. 加工場または倉庫へ配送
8. 箱在庫減少
9. destination在庫増加
10. 保存
11. 再読込
12. 建設・在庫・スタッフ状態維持
```

追加：

```text
加工場受入満杯
→ 倉庫fallback
```

```text
プレイヤーとスタッフが同時取得
→ 負数なし
```

## 16. 完了条件

- マップ上に集配設備がある
- 建設できる
- 預けられる
- スタッフを雇える
- スタッフが画面上で動く
- 複数個をまとめて運ぶ
- 加工場・倉庫へ配送する
- 詰まりから復帰する
- 保存・復元できる
- E2Eが成功する
