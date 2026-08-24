# v0.9.8 Persistence & Compatibility

## 方針

v0.9.8ではsave schemaを9のまま維持します。

今回必要な永続状態は、すでにschema 9へ含まれています。

```text
processing.millOperator
processing.baker
dairy.dairyWorker
dairy.workshopWorker
dairy.hayRack
dairy.milkTank
dairy.workshopInput
dairy.workshopOutput
workers.transportWorker
inventory.fieldCrate
collectionNetwork
```

## 保存する状態

### 加工スタッフ

- hired
- level
- carriedResource
- carriedAmount
- publicStatus

### 酪農スタッフ

- hired
- level
- carried
- amount

### 牛舎・工房

- hayRack
- milkTank
- cows
- cow production remaining time
- readyMilk
- workshopInput
- workshopOutput
- active cycle
- reservedMilk
- workshopMode

### 麦物流

- wheatFieldLevel
- fieldCrate
- fieldCrateCapacityはlevelから正規化
- transport worker hired/level/carried
- barn wheat

### 集配

- hub/box built
- box amounts
- courier state
- routing mode
- processing intake

## 保存しない状態

- facility panel page
- panel open/closed
- focused button
- hover state
- progress ring
- holdMs
- armed state
- transfer animation
- notification
- dynamic view GameObject
- current tween

ロード後はすべてのarmed状態をtrueへ初期化します。

## 旧セーブの異常値を捨てない

特に麦運搬スタッフについて、

```text
worker carried > current level capacity
```

でも、ロード時に切り捨てません。

正しい回復:

```text
ロード
→ 積載済みと判定
→ 倉庫へ出発
→ 全量納品
```

不正な回復:

```text
capacityへclamp
→ 超過分消失
```

## 正規化

schema bumpはしませんが、ロード時に次を正規化できます。

- 負数を0
- 非有限数を0
- fieldCrateCapacityをwheatFieldLevelから再計算
- processing worker level 0ならhired=false
- dairy worker level 0ならhired=false
- 持ち物・箱・bufferの整数化

資源総量を減らす正規化は禁止します。整合不能な場合はbackup復旧または明示エラーを使用します。

## 取引の保存単位

次は一回の取引として保存します。

- cargo全量→barn
- cargo source全量→collection box
- collection box→cargo空き分
- barn hay→hay rack
- milk tank→barn
- barn→machine one recipe batch
- machine output→barn
- worker batch load
- worker batch unload
- facility construction
- staff hire/train

途中状態を複数回保存し、再読込で半分だけ重複する構造を避けます。

## 保存テスト

各Phaseで次を行います。

1. 取引直前保存
2. 取引実行
3. priority save
4. reload
5. 取引後状態が一回だけ反映
6. backupも有効
7. JSON export/import
8. v0.9.7 schema 9 saveからcontinue

## version表示

Phase 1・2では0.9.7のままです。

Phase 3で0.9.8へ更新します。

schemaVersionは常に9です。
