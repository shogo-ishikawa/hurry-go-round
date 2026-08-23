# Phase 2 — Instant Shipping & Till Collection

Phase 2 removes passive waiting from contract delivery and sales-revenue collection while preserving exact resource and coin accounting.

## 1. Phase scope

Implement:

- one-interaction batch contract delivery;
- cargo-first and warehouse-second source ordering;
- exact partial-delivery summaries;
- same-interaction contract completion and reward;
- one-interaction collect-all till behavior;
- bounded visual feedback;
- deterministic transaction tests and browser E2E.

Do not implement in Phase 2:

- unified wheat-field coordinates;
- schema 9;
- public version 0.9.7.

Keep package version 0.9.6 and save schema 8.

## 2. Batch contract delivery transaction

Add a pure transaction equivalent to:

```ts
interface ContractBatchDeliveryBreakdown {
  resource: ResourceId;
  fromCargo: number;
  fromBarn: number;
  deliveredThisBatch: number;
  deliveredTotal: number;
  requirement: number;
  remaining: number;
}

interface ContractBatchDeliveryResult {
  changed: boolean;
  state: ContractState;
  cargo: CarriedCargo;
  barn: ResourceAmounts;
  breakdown: ContractBatchDeliveryBreakdown[];
  totalDelivered: number;
  complete: boolean;
  message: string;
  reason?:
    | "no-active-contract"
    | "no-deliverable-stock"
    | "already-complete";
}

function deliverContractBatch(
  state: ContractState,
  cargo: CarriedCargo,
  barn: ResourceAmounts,
): ContractBatchDeliveryResult;
```

## 3. Delivery ordering

For every required resource in stable `RESOURCE_IDS` order:

1. calculate unmet quantity;
2. consume as much as possible from player cargo;
3. consume the remaining amount from warehouse stock;
4. update delivered quantity;
5. leave unrelated resources unchanged.

Example:

```text
Contract requirement:
たまご 5
パン 3

Before:
持ち物  たまご 2 / パン 1
倉庫    たまご 7 / パン 2

One batch delivery:
持ち物から たまご2・パン1
倉庫から   たまご3・パン2

After:
Contract complete
倉庫の余り たまご4
```

Do not consume from:

- market shelf;
- machine input;
- machine output;
- field crates;
- collection boxes;
- processing intake;
- coop egg storage;
- dairy tanks;
- courier cargo.

The player must first move those goods into carried inventory or warehouse stock.

## 4. Partial batch delivery

If the player does not have enough stock, deliver all currently available required goods in one transaction.

Show an exact summary:

```text
一括納品しました：合計 8個
持ち物から 3個
倉庫から 5個

残り：
小麦粉 2
チーズ 1
```

Do not make the player wait for each available item to animate individually.

A second visit or action may deliver newly produced stock.

## 5. Same-interaction completion

If the batch satisfies all requirements:

1. update delivered quantities;
2. recognize completion immediately;
3. calculate reward exactly once;
4. add reward to wallet exactly once;
5. clear the active contract;
6. update statistics exactly once;
7. emit one priority-save request;
8. open the completion summary.

Do not require an extra frame, extra dock visit, or separate completion button.

## 6. Contract-dock interaction model

Replace repeated per-interval delivery with an armed batch interaction.

Recommended state:

```ts
private contractDockArmed = true;
```

Rules:

- entering the dock while armed performs one batch delivery;
- after the transaction, disarm;
- leaving the dock rearms;
- pressing `E` or the visible action button may explicitly rearm and perform another batch;
- one pointer/tap action produces one transaction;
- standing inside the dock must not repeatedly consume newly arriving stock without a new intentional action.

Public prompt:

```text
契約商品を一括納品
E / タップ
```

When there is no active contract:

```text
進行中の契約はありません
```

When there is no deliverable stock:

```text
納品できる商品がありません
在庫台帳で持ち物と倉庫を確認してください
```

## 7. Contract batch visual feedback

Use bounded feedback independent of batch size.

Required:

- one crate/cart animation from player or barn direction to dock;
- at most 8 resource icons or particles;
- one floating summary such as `合計 27個を納品`;
- per-resource detail in a result panel or hint;
- no 27 separate 180ms waits;
- no frame spike from hundreds of tweens.

The logical transaction must complete before or independently of the cosmetic animation.

## 8. Collect-all till transaction

Replace `collectTillCoin(...)` with an atomic pure operation equivalent to:

```ts
interface CollectTillResult {
  changed: boolean;
  economy: Economy;
  collected: number;
  message: string;
}

function collectAllTillCoins(economy: Economy): CollectTillResult;
```

Rules:

```text
collected = max(0, tillCoins)
walletCoins += collected
tillCoins = 0
```

If the till is empty:

```text
changed = false
collected = 0
```

Never create or lose coins.

## 9. Till interaction model

When the player touches or enters the cash-collection zone:

- collect the entire current till balance in one transaction;
- update wallet and till HUD immediately;
- request one priority save;
- show one result;
- do not require the player to remain in the zone.

Result example:

```text
売上 184コインを回収しました
```

If additional customer sales occur while the player remains in the zone, choose one deterministic policy:

### Preferred policy

- the collection zone rearms after the till changes from zero to positive;
- collect the new accumulated balance in one later batch;
- cap visual feedback frequency with a short cosmetic cooldown.

The state transaction itself must never revert to one coin per frame.

## 10. Till visual feedback

Use:

- at most 6 coin particles;
- one `+Nコイン` floating label;
- wallet pulse once;
- till display changes directly to zero.

Do not create one tween for every coin.

## 11. Save and event behavior

A batch contract delivery requests at most one normal dirty save, or one priority save if it completes the contract.

A collect-all till transaction requests one priority save.

Do not emit one save request per item or coin.

Do not persist:

- dock armed state;
- till animation state;
- temporary batch summary;
- particle count;
- interaction cooldown.

## 12. Resource and coin conservation

Add invariant helpers.

### Contract delivery

For every resource:

```text
before cargo
+ before barn
+ before delivered
=
after cargo
+ after barn
+ after delivered
```

### Contract cancellation

Cancellation still returns delivered resources to the warehouse exactly once.

### Contract completion

Completed goods are consumed by the contract and must not return to inventory.

### Till collection

```text
before wallet + before till
=
after wallet + after till
```

## 13. Unit tests

Add tests for:

- single-resource full batch from cargo;
- single-resource full batch from warehouse;
- cargo-first then warehouse fallback;
- multi-resource mixed batch;
- partial batch with exact remaining quantities;
- no-stock no-op;
- unrelated-resource preservation;
- completion and reward exactly once;
- cancellation after partial batch;
- large quantities without loops proportional to quantity;
- till collect-all with zero, one, and large balances;
- coin conservation;
- one priority-save request per transaction.

## 14. Browser E2E — contract batch

Use the actual contract board and dock.

Required scenarios:

### A. Cargo-only full delivery

1. Accept a contract.
2. Put every required item in player cargo.
3. Move to the actual contract dock.
4. Trigger one batch action.
5. Confirm cargo decreases to the correct values in one interaction.
6. Confirm the contract completes immediately.
7. Confirm reward once.
8. Confirm no repeated deduction while standing in the dock.

### B. Cargo plus warehouse

1. Split every requirement between cargo and warehouse.
2. Enter the actual dock once.
3. Confirm cargo-first usage.
4. Confirm warehouse fallback.
5. Confirm completion.

### C. Partial delivery

1. Provide only part of a mixed contract.
2. Perform one batch action.
3. Confirm all available eligible stock is delivered.
4. Confirm remaining requirements are exact.
5. Add the missing stock.
6. Perform one additional action.
7. Confirm completion.

### D. All eligible resource classes

Cover at least:

```text
たまご
小麦粉
パン
牛乳
バター
チーズ
mixed contract
```

## 15. Browser E2E — till collection

1. Seed or earn a nontrivial till balance, for example 184 coins.
2. Confirm wallet and till before collection.
3. Move the player to the actual cash zone.
4. Trigger one real interaction.
5. Confirm till becomes zero in one state transition.
6. Confirm wallet increases by exactly 184.
7. Confirm one visible summary.
8. Confirm no additional change while the till remains zero.
9. Save and reload.
10. Confirm the collected wallet value persists.

## 16. Performance acceptance

The logical time required to deliver or collect is independent of quantity.

A batch of 1 and a batch of 100 must require the same number of state transitions.

Cosmetic animation may last a short fixed duration, but the player must not wait for quantity-proportional animation before moving away.

## 17. Phase 2 acceptance

Phase 2 is complete when:

```text
One dock interaction delivers every currently available required item.
One cash-zone interaction collects the complete till balance.
No item or coin is lost, duplicated, or applied twice.
```
