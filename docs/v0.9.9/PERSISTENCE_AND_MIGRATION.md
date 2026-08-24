# v0.9.9 Persistence & Migration

## 方針

v0.9.9では、仕込み計画とレシピ別製造統計を永続化するため、save schemaを9から10へ更新する。

資源、進行中サイクル、スタッフ、施設を一切失わない。

---

# 1. 新しい保存状態

```ts
interface PersistedProcessingPlan {
  targetCyclesByRecipe: Partial<Record<RecipeId, number>>;
  completedCyclesInCurrentPlan: Partial<Record<RecipeId, number>>;
  completionMode: "repeat" | "stop-on-complete";
  supplyMode: "cargo-first" | "barn-first" | "cargo-only" | "barn-only";
  autoBalance: boolean;
}
```

機械ごとに保存する。

```text
processing.millPlan
processing.bakeryPlan
```

統計：

```ts
interface PersistedProcessingStats {
  completedByRecipe: Record<RecipeId, number>;
  legacyUnattributedCycles: Record<MachineId, number>;
  lastCompleted: PersistedCompletionRecord | null;
  recentHistory: PersistedCompletionRecord[];
}
```

`recentHistory`は最大20件。

---

# 2. 既存状態を維持

schema 9の次をそのまま移す。

- processing.land
- mill / bakery built
- level
- enabled
- selectedMode
- input amounts / capacity
- output amounts / capacity
- activeCycle
- reservedInputs
- remainingMs
- durationMs
- completedCycles
- millOperator
- baker
- routingPolicy
- rawReserves
- autoSelectionRoundRobin

---

# 3. deterministic migration

## selectedModeが単品

例：

```text
selectedMode = bakery-bread
```

移行後：

```text
bread target = 1
cornbread target = 0
```

## selectedModeがauto

対応する各レシピを1回分にする。

製粉機：

```text
flour 1
cornmeal 1
```

ベーカリー：

```text
bread 1
cornbread 1
```

## 入力庫

既存入力庫を変更しない。

- 計画より多い：余剰
- 計画より少ない：不足
- 容量以上の異常値：資源を削除せず、明示エラーまたはbackup復旧

## activeCycle

進行中なら完全維持する。

ロード直後にキャンセル、再開始、原料再消費をしない。

## completedCycles

内訳を推定しない。

```text
legacyUnattributedCycles[machine] = completedCycles
completedByRecipe[*] = 0
```

---

# 4. 保存しない状態

- パネルopen状態
- 選択ページ
- slider drag中
- hover / focus
- 搬入口armed
- transfer animation
- 通知表示
- 一時診断cache
- world marker

ロード後はarmed=trueへ戻す。

---

# 5. 原子的保存単位

次は一回の状態変更、一回のpriority saveとする。

- 仕込み回数変更
- completion mode変更
- supply mode変更
- 手持ちから目標まで補充
- 倉庫から目標まで補充
- 余剰返却
- 入力庫全量返却
- 一回の生産開始
- 一回の生産完了
- 完成品一括回収
- 完成品一括倉庫移送

同じ操作の途中状態を複数回保存しない。

---

# 6. 資源保存則

診断・再配分・移送の前後で、対象資源について、

```text
cargo
+ barn
+ machine input
+ active reserved
+ machine output
+ processing worker cargo
+ collection intake
```

の総和が、レシピによる正当な消費・生産以外では変化しないことを検証する。

余剰返却で資源を廃棄しない。

---

# 7. migration tests

- schema 9の製粉機入力がとうもろこし24
- selectedModeが小麦粉
- activeCycleなし

を移行し、とうもろこし24が維持され、wrong-mix-full診断になる。

- schema 9のベーカリーactiveCycleがパン、remainingMs 2100

を移行し、同じrecipeId、remainingMs、reservedInputsになる。

- completedCycles 17をlegacyUnattributedCycles 17へ移す。

- schema 10を再読み込みしてidempotent。

- primary破損時のbackup復旧。

- JSON export/import。
