# v0.9.1 永続化とmigration

# 1. 基本方針

v0.9.1では、v0.9.0のschema 3へ集配ネットワークの永続状態を追加するため、セーブスキーマをschema 4へ更新します。

```text
schema 1 → schema 2 → schema 3 → schema 4
```

過去のmigrationを削除したり、schema 3だけを受け付ける実装へ置き換えたりしないでください。

既存の有効なv0.9.0セーブは、資源、契約、加工状態、スタッフ、機械buffer、生産途中の予約原料を失わずに移行します。

---

# 2. バージョン

```ts
SAVE_SCHEMA_VERSION = 4
GAME_VERSION = "0.9.1"
```

保存形式：

```text
hurry-go-round-save
```

チェックサム：

```text
SHA-256
```

primary/backup、JSON書き出し・読み込み、2 MiB上限、保存後再検証を維持します。

---

# 3. 保存対象

## 3.1 集配ネットワーク

推奨構造：

```ts
interface PersistedCollectionNetwork {
  hubBuilt: boolean;

  boxes: {
    wheat: PersistedCollectionBox;
    corn: PersistedCollectionBox;
    egg: PersistedCollectionBox;
  };

  processingIntake: {
    amounts: ResourceAmounts;
    capacity: number;
    roundRobinIndex: number;
  };

  courier: {
    hired: boolean;
    level: 0 | 1 | 2 | 3;
    carried: ResourceAmounts;
    capacity: number;
    stage: CollectionCourierStage;
    sourceId: CollectionSourceId | null;
    destinationId: CollectionDestinationId | null;
    waitMs: number;
    sourceRoundRobinIndex: number;
  };

  routingMode: "auto" | "processing-first" | "barn-first";
  lastServedSourceId: CollectionSourceId | null;
  sourceAgesMs: Record<CollectionSourceId, number>;
}

interface PersistedCollectionBox {
  built: boolean;
  amounts: ResourceAmounts;
  capacity: number;
}
```

各箱が単一資源専用の場合でも、保存形式を`ResourceAmounts`に統一しておくとvalidationと将来拡張が容易です。

ただし、専用箱へ異なる資源が入っているセーブは不正とします。

## 3.2 研修小屋

研修小屋の座標、看板位置、開いているパネルは保存しません。

保存対象：

- スタッフの雇用
- スタッフレベル
- 集配スタッフの状態
- 研修小屋チュートリアル完了ID
- 最後に選択したスタッフカード（任意）

保存しないもの：

- 小屋のPhaserオブジェクト
- 看板の実座標
- 操作円
- 開いているTween
- ポインター状態

ロード時にFacility Registryから再構築します。

## 3.3 用語変更

「背負い籠」から「持ち物」「運搬かご」への変更は表示だけです。

既存セーブの`cargo`、`carryCapacityLevel`、`operations`を変更する必要はありません。

古い施設選択IDが保存されている場合：

```text
operations-office → training-lodge
```

へ正規化します。

---

# 4. schema 3 → schema 4 migration

## 4.1 初期値

schema 3セーブに集配ネットワークがない場合：

```ts
collectionNetwork = {
  hubBuilt: false,
  boxes: {
    wheat: { built: false, amounts: emptyResourceAmounts(), capacity: 24 },
    corn: { built: false, amounts: emptyResourceAmounts(), capacity: 28 },
    egg: { built: false, amounts: emptyResourceAmounts(), capacity: 18 },
  },
  processingIntake: {
    amounts: emptyResourceAmounts(),
    capacity: 36,
    roundRobinIndex: 0,
  },
  courier: {
    hired: false,
    level: 0,
    carried: emptyResourceAmounts(),
    capacity: 0,
    stage: "not-hired",
    sourceId: null,
    destinationId: null,
    waitMs: 0,
    sourceRoundRobinIndex: 0,
  },
  routingMode: "auto",
  lastServedSourceId: null,
  sourceAgesMs: {
    wheat: 0,
    corn: 0,
    egg: 0,
  },
};
```

migrationで資源やコインを追加・削除しないでください。

## 4.2 施設ID

保存された：

```text
lastSelectedFacilityId = "operations-office"
```

は、次へ変換します。

```text
lastSelectedFacilityId = "training-lodge"
```

不明な施設IDは`null`へ正規化します。

## 4.3 tutorial ID

旧チュートリアルIDを維持します。

新しいID例：

```text
training-lodge-opened
collection-hub-built
first-collection-box-built
collection-courier-hired
first-processing-delivery
```

migration時は未完了として追加します。

## 4.4 checksum

migration後のpayloadでチェックサムを再計算します。

```text
旧checksumをそのまま使わない
```

migration結果を現行schema validatorへ通した後に適用します。

---

# 5. ランタイム復元

## 5.1 集配スタッフ

保存時に集配スタッフが資源を持っていた場合、その資源を失わせません。

復元ルール：

```text
積載0
→ 集配所の待機地点から再開

積載あり・配送先が加工場
→ 加工場受入ボックスへ向かう

積載あり・配送先が倉庫
→ 倉庫へ向かう

積載あり・配送先不明
→ 自動判定を一度行う
→ 判定不能なら倉庫へ向かう
```

ロード後に集配元へ戻して、同じ資源を再積込してはいけません。

## 5.2 加工場受入ボックス

保存された受入資源をそのまま復元します。

ロード直後に全資源を機械bufferへ一括転送しないでください。通常の自動仕分けintervalから再開します。

## 5.3 集配ボックス

各箱の資源量を復元します。

未建設箱に資源が入っているセーブは不正です。

ただしmigration中に安全な復旧を行う場合は、資源を倉庫へ戻し、警告を表示しても構いません。

## 5.4 一時停止

次の間は集配時間を進めません。

- タイトル画面
- 管理メニュー
- 研修小屋画面
- 集配所画面
- 契約画面
- 設定画面
- アプリ終了中

オフライン集配を実装しません。

---

# 6. 自動保存

優先保存を要求する操作：

- 集配所建設
- 各集配ボックス建設
- 集配スタッフ雇用
- 集配スタッフ研修
- 配送モード変更
- JSON読み込み
- migration適用

通常dirty保存でよい変化：

- 箱への1個転送
- スタッフの積込・荷下ろし
- 受入ボックスから機械bufferへの移送
- スタッフの位置・stage変化

大量の1個転送ごとにIndexedDBへ即時書き込みしないでください。既存のdirty debounceを使用します。

---

# 7. validation

## 7.1 集配ボックス

- `built`がboolean
- 各資源が有限非負整数
- 合計がcapacity以下
- capacityが有限正整数
- 専用箱に許可外資源が入っていない
- 未建設箱の合計が0

## 7.2 加工場受入ボックス

- 合計がcapacity以下
- パン・コーンブレッドが0
- roundRobinIndexが有限非負整数

## 7.3 集配スタッフ

- hiredとlevelが一致
- 未雇用ならlevel 0
- 雇用済みならlevel 1〜3
- 積載合計がレベル別capacity以下
- 未雇用なら積載0
- stageが既知enum
- sourceIdとdestinationIdが既知IDまたはnull
- carriedがある状態で`not-hired`は禁止

## 7.4 routing

```text
auto
processing-first
barn-first
```

以外を拒否します。

## 7.5 既存state

v0.9.0の次のvalidationを弱めないでください。

- cargo容量
- market容量
- 契約進捗
- 機械buffer
- reservedInputs
- processing cycle
- worker cargo
- land expansion
- crop ID一意性

---

# 8. JSON入出力

書き出しプレビューへ追加：

```text
集配所：建設済み／未建設
集配ボックス：0〜3
集配スタッフ：未雇用／Lv1〜3
配送モード
加工場受入量
```

読み込みプレビューへ同じ内容を表示します。

schema 3のJSONを読み込んだ場合は、schema 4へmigrationすることを明示します。

```text
v0.9.0のセーブをv0.9.1へ変換します
集配ネットワークは未建設の状態で追加されます
```

---

# 9. migrationテスト

必須：

1. schema 1→4が成功
2. schema 2→4が成功
3. schema 3→4が成功
4. v0.9.0の加工中cycleを維持
5. reservedInputsを維持
6. 7資源の倉庫・市場を維持
7. 契約候補と進行中契約を維持
8. スタッフ雇用・レベル・積載を維持
9. とうもろこし畑レベルを維持
10. 集配ネットワークが未建設で追加
11. migrationで資源総量が変わらない
12. 旧施設IDが研修小屋へ正規化
13. checksumが再計算される
14. 不正checksumを拒否
15. schema 5以上を拒否

---

# 10. セーブ不変条件

保存前と復元後で、資源別総量が一致することを確認します。

集配関連を含む総量：

```text
プレイヤー所持
既存集荷箱
既存スタッフ積載
集配ボックス
集配スタッフ積載
加工場受入ボックス
機械input
機械reservedInputs
機械output
倉庫
市場
契約納品済み
餌箱・卵置き場
```

生産・加工・販売・契約による正規の変換を除き、save/loadだけで総量を変えてはいけません。
