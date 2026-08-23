# Phase 3 — Contract Truthfulness & Final Release

Phase 3 fixes offer replacement, resource naming, delivery sources, completion, and final v0.9.6 release metadata.

## 1. Canonical contract resource model

Every contract resource row must use:

```ts
RESOURCE_DEFINITIONS[resource]
```

Required supported contract resources:

```text
麦
とうもろこし
たまご
小麦粉
コーンミール
パン
コーンブレッド
牛乳
バター
チーズ
```

`干し草` remains ineligible unless a later release explicitly enables feed contracts.

Do not map unknown resources to `たまご`.

## 2. Offer card identity

Every offer card shows a short stable identity:

```text
依頼 #000123
```

The identity comes from contract sequence/ID.

When an offer is replaced, the new card must visibly have a different identity even if its resources and amounts happen to be similar.

## 3. Decline behavior

Pressing `見送る` must:

1. validate that the selected offered ID exists;
2. remove that exact offer immediately;
3. increment `offersDeclined` once;
4. generate one replacement with a new ID;
5. keep the number of offers at three;
6. show `依頼 #... を見送り、新しい依頼を追加しました`;
7. priority-save the changed state;
8. never close silently on failure.

## 4. Decline cooldown correction

Do not retain a cooldown that can remain positive forever when no active contract exists.

Preferred v0.9.6 design:

- remove the 30-second business cooldown;
- use only a short UI/action debounce of approximately 250 ms to prevent a double click;
- debounce is transient and is not contract progression state.

If `declineCooldownMs` remains for save compatibility:

- normalize old values to zero during migration/load;
- decrement it independently of active-contract time;
- never use it to leave an unchanged offer on screen without an explanation.

## 5. Structured contract commands

Use a result contract equivalent to:

```ts
interface ContractCommandResult {
  changed: boolean;
  command: ContractCommand;
  message: string;
  reason?: ContractFailure;
  prioritySaveRequested: boolean;
}
```

Commands:

```text
accept offer
decline offer
cancel active contract
deliver next item
complete contract
```

Failures include:

```text
offer not found
active contract already exists
no active contract
no deliverable stock
contract incomplete
button debounce
```

The UI displays the returned Japanese message.

## 6. Contract panel layout

Offer cards display:

- offer ID;
- type;
- every required resource with localized name;
- amount;
- base reward;
- early bonus target;
- `受注` and `見送る` controls.

Active contract displays one row per required resource:

```text
小麦粉  2 / 5
持ち物 1　倉庫 3　不足 1
```

Also show:

```text
基本報酬
早期達成ボーナス
経過時間
出荷場へ案内
契約を中止
```

The panel must work for mixed contracts with up to three resources.

## 7. Deliverable inventory

The contract dock may consume only:

```text
1. player cargo
2. warehouse inventory
```

Use cargo first, then warehouse.

Do not implicitly consume:

```text
market shelf
wheat or corn field crate
collection box
chicken egg storage
processing input
active-cycle reserved inputs
processing output
milk tank
dairy workshop output
```

Those locations remain visible in the inventory panel so the player can collect or transfer them intentionally.

## 8. Delivery transaction

Replace warehouse-only delivery with a pure transaction equivalent to:

```ts
function deliverNextContractResourceOne(
  state: ContractState,
  cargo: CarriedCargo,
  barn: ResourceAmounts,
): {
  state: ContractState;
  cargo: CarriedCargo;
  barn: ResourceAmounts;
  resource: ResourceId | null;
  source: "cargo" | "barn" | null;
  changed: boolean;
  reason?: string;
}
```

Rules:

- use the existing deterministic round-robin cursor;
- choose a resource still required;
- consume cargo first for that resource;
- otherwise consume warehouse;
- increment delivered exactly once;
- update cargo art and HUD if cargo changes;
- preserve all unrelated resources;
- never produce a negative amount;
- no stock means no state change and a clear message.

## 9. Delivery-dock feedback

While the player is at the dock, show:

```text
たまごを持ち物から1個出荷しました
```

or:

```text
小麦粉を倉庫から1個出荷しました
```

If nothing can be delivered:

```text
出荷できる商品がありません
不足：牛乳 3
```

Do not make the player guess which hidden resource is required.

## 10. Immediate completion

After every successful item delivery:

- check completion;
- complete exactly once when all rows reach their requirements;
- add base and bonus reward once;
- add reputation once;
- clear active contract;
- show the completion panel;
- priority-save.

A final item from cargo and a final item from warehouse must behave identically.

## 11. Cancellation

Cancellation continues to return already delivered items to the warehouse.

The panel must show the exact returned quantities.

No delivered resource may be duplicated or lost.

## 12. Offer generation and unlock rules

Generate only resources that are actually unlocked by the current facilities.

Before showing an offer, validate:

- the resource is contract-eligible;
- the corresponding production facility is built/unlocked;
- the UI has metadata for the resource;
- the delivery and inventory model supports the resource.

## 13. Contract timing

Separate:

```text
active-contract elapsed time
offer-action debounce
```

Active time advances only while gameplay is active.

Offer debounce must not depend on an active contract.

## 14. Migration compatibility

Schema remains 8 from Phase 1.

When loading older contract state:

- preserve offers, active progress, delivered amounts, seed, and sequence;
- normalize an obsolete stuck decline cooldown to zero;
- preserve contract statistics;
- do not regenerate active or offered contracts merely because the game version changed.

## 15. Unit tests

Add tests for:

- every eligible resource uses the correct Japanese name;
- non-wheat/non-corn resources never render as egg;
- decline removes the exact ID;
- replacement has a new ID;
- repeated declines work without an active contract;
- double activation changes state once;
- cargo-first delivery;
- warehouse fallback;
- mixed-resource round robin;
- egg-only contract from cargo;
- flour/bread/milk/butter/cheese contracts;
- no stock no-op;
- immediate exact completion;
- reward and reputation applied once;
- cancellation conservation;
- old positive decline cooldown normalizes safely.

## 16. Browser E2E

Add scenarios for:

### Decline replacement

- record all three offer IDs;
- decline one through the visible button;
- confirm the selected ID disappears;
- confirm one new ID appears;
- decline again with no active contract;
- confirm it also works;
- verify statistics and save/reload.

### Egg contract

- accept a true egg-only contract;
- verify the card says `たまご`;
- put eggs in player cargo;
- enter the actual dock;
- verify cargo decreases and delivered progress increases;
- complete and verify reward once.

### Processed-product contract

For flour, bread, or another processed product:

- verify the correct localized name;
- deliver from cargo;
- deliver remaining quantity from warehouse;
- complete.

### Dairy contract

- verify milk/butter/cheese names;
- verify eggs cannot satisfy them;
- deliver the actual requested resource.

### Mixed contract

- verify three resource rows;
- deliver in deterministic round-robin order;
- save/reload mid-contract;
- finish without duplication.

## 17. Final release metadata

After all Phase 3 tests pass, update:

```text
package.json version: 0.9.6
package-lock.json version: 0.9.6
GAME_VERSION: 0.9.6
title screen: v0.9.6
HUD version: v0.9.6
README release description
```

Save schema remains 8.

Do not create the Git tag or GitHub Release inside the Codex task. Create them only after merged Pages acceptance.