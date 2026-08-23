# Phase 2 — Inventory Truth & Processing Information

Phase 2 makes every visible stock number correspond to an authoritative state value and reorganizes processing information around player decisions.

## 1. Canonical resource presentation

Every player-facing resource label, icon, color, order, price, and capacity must come from:

```ts
RESOURCE_IDS
RESOURCE_DEFINITIONS
```

Do not use ternaries such as:

```ts
resource === "wheat" ? "麦" : resource === "corn" ? "とうもろこし" : "たまご"
```

Do not hard-code a partial resource list in HUD, processing, contracts, market, collection, or cargo art.

Create reusable helpers equivalent to:

```ts
getResourceName(id)
getResourceIcon(id)
getResourceColor(id)
formatResourceAmount(id, amount)
getNonZeroResources(amounts)
```

## 2. Inventory-location terminology

Use these exact concepts consistently:

```text
持ち物（プレイヤーが運搬中）
倉庫（納品済みの保管在庫）
売り場（お客さんが購入できる棚）
未回収売上（売上台にあるコイン）
所持コイン（購入に使える財布）
生産設備内（機械の入力・加工中・完成品）
```

Do not call shop stock or carried stock a warehouse.

## 3. Compact carried-item HUD

The compact HUD must show:

```text
持ち物  total / capacity
```

Below it, show all nonzero resources using localized names or icons.

Rules:

- displayed resource sum must equal `getCarriedTotal(cargo)`;
- no supported resource may be omitted logically;
- if all rows do not fit, show the first rows plus `ほか N種類` and provide a full panel;
- processed and dairy products must never appear as wheat;
- empty state shows `空 0 / capacity`.

Recommended compact ordering:

1. resources with nonzero counts;
2. stable `RESOURCE_IDS` order;
3. no zero-count rows unless required for a tutorial.

## 4. Full inventory panel

Clicking/tapping the carried-item HUD or pressing a documented key opens:

```text
在庫一覧
```

Sections:

```text
持ち物
倉庫
売り場
生産設備内
集荷・集配
```

For each resource, show only relevant locations and exact quantities.

Example:

```text
小麦粉
持ち物 2
倉庫 5
製粉機 完成品 1
売り場 3 / 6
```

The panel is informational in v0.9.6. It must not silently move resources.

## 5. Character cargo art

Update `Farmer.drawStack()` so every resource is represented truthfully.

At minimum use category-specific art:

```text
raw crops: crop bundle
Egg: egg crate
Flour/cornmeal: sack
Bread/cornbread: tray or loaf
Hay: hay bale
Milk: milk can
Butter/cheese: dairy package
```

The visible stack may cap the number of drawn objects for performance, but:

- category and relative mix must remain recognizable;
- a multiplier or full badge may represent large counts;
- all non-corn/non-egg resources must not fall through to wheat art.

## 6. Warehouse HUD

The warehouse portion must show:

```text
倉庫  合計 N
```

Then show a bounded set of nonzero resource rows. Provide `一覧` access when more rows exist.

Do not condition warehouse visibility only on land unlocks. A resource with a nonzero authoritative amount must be visible even if its originating facility is no longer the current progression focus.

## 7. Upper-right economy HUD

The upper-right card must be explicitly titled:

```text
売り場
```

Show:

```text
販売棚 合計 current / totalCapacity
未回収売上 Xコイン
所持コイン Yコイン
```

Optional detail rows show nonzero market stock and authoritative per-resource capacity.

Use:

```ts
state.marketCapacity[resource]
```

Do not hard-code `8`, `6`, or `4` in the HUD.

Include milk, butter, and cheese when unlocked or nonzero.

## 8. HUD layout and responsive behavior

Required viewports:

```text
1920 x 1080
1440 x 900
844 x 390
390 x 844
320 x 568
```

On small screens:

- compact cards show totals and at most a few rows;
- full details use a modal with tabs or scrolling;
- no important number is clipped;
- no HUD region triggers world movement;
- labels remain distinguishable from buttons.

## 9. Inventory view model

Create a pure view model equivalent to:

```ts
interface InventoryLocationViewModel {
  carried: ResourceRow[];
  barn: ResourceRow[];
  market: ResourceRow[];
  production: ProductionResourceRow[];
  farmBuffers: ResourceRow[];
  totals: {
    carried: number;
    barn: number;
    market: number;
  };
}
```

The compact HUD and full panel consume the same view model.

Add invariant helpers that compare every displayed total with authoritative state.

## 10. Processing panel information architecture

Replace the current large text dump with four sections or tabs:

```text
建設
製粉機
ベーカリー
スタッフ
```

### Construction section

Show cards for:

```text
加工場用地
製粉機
ベーカリー
```

Each card shows:

- built / available / locked;
- exact prerequisite checklist;
- exact cost;
- next action;
- guide button.

### Grain-mill section

Show:

```text
運転モード
選択中レシピ
必要原料
原料置き場
加工中に確保済みの原料
進捗と残り時間
完成品置き場
搬入口へ案内
受取口へ案内
```

### Bakery section

Use the same structure.

### Staff section

Show processing-worker hire/training state, capacity, current task, and cost if supported.

## 11. Recipe cards

Use localized recipe cards.

Examples:

```text
小麦粉
麦 2  ->  小麦粉 1
3.5秒
```

```text
パン
小麦粉 1 + たまご 1  ->  パン 1
5.5秒
```

Do not show recipe IDs such as `mill-flour`.

A recipe card must indicate:

- ready;
- missing ingredients;
- output full;
- currently active;
- stopped by mode.

## 12. Separate inventory stages

Processing UI must distinguish:

```text
入力バッファ
加工中に予約済み
完成品バッファ
```

When production starts, input quantities may decrease because ingredients move to reserved inputs. The UI must explain this transition rather than appearing to lose items.

Example:

```text
小麦粉を製造中
麦 2個を使用中
残り 2.8秒
```

## 13. One primary next action

Each machine section shows one primary action based on state:

```text
原料を搬入してください
製造中です
完成品を受取口から回収できます
完成品置き場が満杯です
停止中です
```

Do not give equal visual emphasis to every low-level field.

## 14. World status simplification

World status panels remain compact.

Mill example:

```text
製粉機
小麦粉を製造中  62%
完成品 2
```

Bakery example:

```text
ベーカリー
原料待ち：たまご
```

Detailed inventory belongs in the management panel, not permanent map text.

## 15. Processing actions

Mode buttons must:

- stay in the panel;
- use localized labels;
- show selected state;
- show no-op if already selected;
- never create a misleading success message;
- never charge unless the action is an actual paid upgrade.

Guide buttons must point to the authoritative build/input/output/management interaction.

## 16. State update integrity

All systems that change cargo or warehouse stock must update:

- `GameState`;
- farmer cargo art when cargo changes;
- UI state event;
- save dirty state.

Audit at minimum:

```text
manual harvest
wheat crate pickup
corn crate pickup
egg pickup
processing input/output
collection deposit/withdraw
contract delivery
warehouse delivery
```

The HUD must not remain stale after a system uses a direct state setter.

## 17. Unit tests

Add tests for:

- all eleven resources have localized names and display metadata;
- carried displayed sum equals authoritative total;
- warehouse displayed sum equals authoritative total;
- market uses authoritative capacities;
- dairy and processed products appear in correct sections;
- no resource falls through to egg or wheat labels;
- processing view model separates input/reserved/output;
- recipe cards use localized names;
- next-action selection;
- responsive row truncation and `ほか N種類`;
- state-change paths emit UI refresh.

## 18. Browser E2E

Add scenarios that:

1. place every resource type into player cargo in turn;
2. verify its correct localized row and total;
3. verify character cargo category art or diagnostics;
4. move resources among cargo, warehouse, market, machine input, active cycle, and output;
5. verify each location panel updates exactly;
6. verify the upper-right card is labeled as shop/sales/wallet rather than warehouse;
7. verify processing tabs and recipe cards at desktop and mobile sizes;
8. save/reload with mixed cargo and confirm the same inventory view.

The E2E bridge may seed resources for setup, but assertions must use rendered UI and authoritative diagnostics.