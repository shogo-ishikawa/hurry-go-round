# Phase 1 — Inventory Ledger & Processing Guidance

Phase 1 makes inventory location and processing instructions unambiguous without changing resource quantities, recipes, production timing, or save schema.

## 1. Phase scope

Implement:

- an authoritative per-resource inventory ledger;
- a default carried-and-warehouse comparison view;
- a complete all-location view;
- responsive scrolling or pagination;
- exact compact-HUD entry points;
- a guaranteed-visible processing overview;
- structured processing cards;
- actual on-screen visibility tests.

Do not implement in Phase 1:

- batch contract delivery;
- collect-all till behavior;
- unified wheat-field coordinates;
- schema 9;
- public version 0.9.7.

Keep package version 0.9.6 and save schema 8.

## 2. Canonical inventory ledger

Create one pure authoritative view model, conceptually:

```ts
interface InventoryLedgerRow {
  resource: ResourceId;
  name: string;
  iconId: string;
  color: number;

  carried: number;
  barn: number;
  market: number;

  wheatFieldCrate: number;
  cornFieldCrate: number;
  eggStorage: number;
  hayRack: number;
  milkTank: number;

  collectionBoxes: number;
  processingIntake: number;

  machineInput: number;
  machineReserved: number;
  machineOutput: number;

  dairyInput: number;
  dairyReserved: number;
  dairyOutput: number;

  availableForContract: number;
  totalOnFarm: number;
}

interface InventoryLedgerViewModel {
  rows: InventoryLedgerRow[];
  carriedTotal: number;
  carriedCapacity: number;
  barnTotal: number;
  marketTotal: number;
  marketCapacity: number;
  farmBufferTotal: number;
  productionTotal: number;
  totalOnFarm: number;
}
```

Every player-facing inventory display must consume this view model or a view model derived from the same location extractors.

Do not independently reconstruct quantities in `UIScene`.

## 3. Location accounting rules

Use exact authoritative sources.

### Carried

```text
state.cargo.amounts
```

### Warehouse

```text
state.barn
```

### Market shelf

```text
state.market
state.marketCapacity
```

### Farm production buffers

At minimum:

```text
wheat field crate
corn field crate
chicken egg storage
hay rack
milk tank
```

### Collection network

At minimum:

```text
wheat local collection box
corn local collection box
egg local collection box
processing intake
courier cargo
```

Courier cargo must be shown as `配送中`, not silently omitted.

### Processing

For grain mill and bakery, separate:

```text
input buffer
active-cycle reserved input
output buffer
processing-worker cargo
```

### Dairy processing

Separate:

```text
workshop input
active-cycle reserved milk
workshop output
```

Do not double-count a resource that moved from input to reserved input.

## 4. Total definitions

Use clearly named totals.

```text
持ち物合計
倉庫合計
売り場合計
集荷・集配合計
生産設備内合計
農場内総数
```

`農場内総数` includes resources still owned by the player across all active locations.

It excludes:

- goods already delivered into an active contract;
- goods already purchased by a customer;
- deleted or consumed recipe inputs;
- future or expected production.

Do not present a total whose included locations are not explained.

## 5. Invariants

Add pure invariant helpers.

Required checks:

```text
sum(carried rows) == getCarriedTotal(cargo)
sum(barn rows) == total(state.barn)
sum(market rows) == total(state.market)
sum(all row location columns) == totalOnFarm
all displayed amounts are finite nonnegative integers
no location is counted twice
```

In development and E2E builds, a violated invariant must throw a descriptive error.

In production, do not crash the game for a display-only mismatch; log one bounded error and fall back to authoritative raw values.

## 6. Compact HUD

Keep the compact HUD usable while making the complete detail one action away.

### Carried card

Required heading:

```text
持ち物  N / capacity
```

Show a bounded number of nonzero rows and a visible control:

```text
一覧
```

If rows are hidden, show both hidden type count and hidden unit count:

```text
ほか 4種類・7個
```

Do not show only `ほか 4種類`.

### Warehouse card

Required heading:

```text
倉庫  合計 N
```

Show a bounded number of nonzero rows and the same visible `一覧` control.

### Interaction

Clicking or tapping either carried or warehouse card opens the inventory ledger directly on:

```text
持ち物・倉庫
```

Keyboard shortcut:

```text
I
```

## 7. Full inventory panel

Title:

```text
在庫台帳
```

Default section:

```text
持ち物・倉庫
```

Required sections:

```text
持ち物・倉庫
全保管場所
生産設備内
集荷・集配
```

### Default table

Columns:

```text
商品 | 持ち物 | 倉庫 | 利用可能計
```

Show all eleven resources in stable `RESOURCE_IDS` order.

Zero rows must remain available. A filter may hide zero rows, but the initial default should make it clear how to show them.

Recommended controls:

```text
すべて表示
在庫ありのみ
```

### All-location table

For each resource, show exact location details. On desktop, use columns. On narrow screens, use one resource card at a time or stacked rows.

Example:

```text
小麦粉
持ち物          2
倉庫            5
売り場          3 / 6
製粉機入力      0
製粉中予約      2
製粉機完成品    1
農場内総数     13
```

Do not use an ambiguous single `その他` total.

## 8. Responsive modal architecture

Create or extend a reusable modal content component.

Acceptable designs:

```text
ScrollableModalContent
PaginatedLedger
ModalListViewport
```

It must provide:

- clipping to the visible panel;
- mouse wheel scrolling;
- trackpad scrolling;
- touch drag scrolling;
- keyboard PageUp/PageDown or arrow scrolling;
- stable tab controls;
- visible scroll position or page indicator;
- no world movement behind the modal;
- no buttons outside the viewport.

Required viewports:

```text
1920 x 1080
1440 x 900
844 x 390
390 x 844
320 x 568
```

## 9. Processing overview

Add a first processing page titled:

```text
概要
```

The first time the processing panel is opened in a session, open this page.

The overview must contain a concise, guaranteed-visible explanation:

```text
加工場では、農産物を価値の高い商品へ加工できます。

1. 搬入口へ原料を入れる
2. 製粉機またはベーカリーで加工する
3. 受取口から完成品を回収する
```

Show the current construction chain:

```text
加工場用地
  ↓
製粉機
  ↓
ベーカリー
```

Show the current available recipes:

```text
麦 2 → 小麦粉 1
とうもろこし 2 → コーンミール 1
小麦粉 1 + たまご 1 → パン 1
小麦粉 1 + コーンミール 1 + たまご 1 → コーンブレッド 1
```

Use localized names from resource and recipe metadata.

## 10. Processing panel pages

Required pages:

```text
概要
建設
製粉機
ベーカリー
スタッフ
```

### Construction page

For each facility:

- public name;
- built / available / locked state;
- prerequisite checklist;
- exact cost;
- exact location guide;
- one primary action.

### Machine page

Show separate cards:

```text
運転状態
必要原料
入力バッファ
加工中に予約済み
進捗
完成品バッファ
次に行うこと
```

Do not combine all cards into one long text block.

### Recipe cards

Each card shows:

- product name;
- input formula;
- output quantity;
- duration;
- current status;
- missing ingredients;
- whether mode prevents selection.

### Staff page

Show:

- hired state;
- level;
- capacity;
- current task;
- training cost;
- maximum-level state.

## 11. Processing world guidance

When the player approaches the processing yard, show a concise context hint.

Examples:

```text
加工場管理を開く：E
原料を入れる場所：青い搬入口
完成品を受け取る場所：緑の受取口
```

At individual stations:

```text
製粉機 搬入口
麦・とうもろこしを入れます
```

```text
製粉機 受取口
小麦粉・コーンミールを回収します
```

The hint must disappear after leaving the range.

## 12. Explanation visibility acceptance

A processing explanation is accepted only if:

- its rendered bounds intersect the visible modal content viewport;
- it is not behind another object;
- its text is not clipped horizontally;
- it can be reached by scrolling on short screens;
- its font size remains readable;
- the player can navigate to every page by mouse, touch, and keyboard.

Do not pass E2E by reading a hidden text object's `.text` property alone.

## 13. E2E diagnostics

Expose VITE_E2E-only serializable diagnostics:

```ts
interface VisibleTextDiagnostic {
  label: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  clipped: boolean;
  visible: boolean;
}
```

Also expose:

- current inventory section;
- current processing page;
- scroll position;
- scroll maximum;
- button rectangles;
- panel rectangle;
- ledger row values;
- machine card values.

Do not expose Phaser GameObjects across `page.evaluate`.

## 14. Unit tests

Add tests for:

- every resource has one ledger row;
- carried and warehouse columns match authoritative state;
- total-on-farm conservation;
- no location double counting;
- courier cargo is included as in transit;
- processing input/reserved/output separation;
- dairy input/reserved/output separation;
- hidden row message contains hidden type and unit counts;
- all-zero and all-nonzero inventories;
- responsive pagination calculations;
- processing overview localized recipes;
- processing primary action selection.

## 15. Browser E2E

Add scenarios for:

### A. Exact carried and warehouse ledger

1. Seed a different quantity for every resource in carried and warehouse state.
2. Open the panel through the actual carried HUD card.
3. Verify all eleven product names.
4. Verify every carried amount.
5. Verify every warehouse amount.
6. Verify row totals.
7. Verify panel totals.
8. Save and reload.
9. Verify the same ledger.

### B. Location accounting

Seed resources across:

- cargo;
- warehouse;
- market;
- field crates;
- collection boxes;
- courier cargo;
- processing input/reserved/output;
- dairy input/reserved/output.

Verify exact location rows and total conservation.

### C. Processing explanation visibility

At every required viewport:

1. Open the actual processing panel.
2. Confirm `概要` is selected.
3. Confirm the three-step explanation is visible.
4. Confirm all four recipes are reachable.
5. Confirm no required text is outside the panel after scrolling.
6. Confirm tab and button rectangles remain in bounds.

### D. Input methods

Verify inventory and processing panels with:

- mouse;
- touch;
- Tab / Shift+Tab;
- Enter / Space;
- Escape.

## 16. Phase 1 acceptance

Phase 1 is complete only when a player can answer, without mental arithmetic:

```text
What am I carrying?
What is in the warehouse?
Where is the rest of this resource?
What is the processing yard doing?
What should I do next?
```
