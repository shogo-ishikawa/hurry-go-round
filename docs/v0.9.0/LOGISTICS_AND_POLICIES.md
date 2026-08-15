# v0.9.0 Logistics, Workers, and Routing Policies

## 1. Processing-yard land

Add one purchasable processing-yard parcel.

Recommended state:

```ts
interface ProcessingLandState {
  yardUnlocked: boolean;
  millBuilt: boolean;
  bakeryBuilt: boolean;
}
```

Recommended purchase conditions:

```text
Processing yard
Cost: 800 coins
Prerequisites:
- east corn field unlocked
- chicken coop unlocked

Grain mill
Cost: 350 coins
Prerequisite:
- processing yard unlocked

Bakery
Cost: 850 coins
Prerequisites:
- processing yard unlocked
- grain mill built
```

Each transaction must:

- use exact costs
- enforce prerequisites
- prevent duplicate purchase
- preserve unrelated state
- request a priority save
- unlock corresponding visuals and interactions
- never charge on failure

Create pure functions equivalent to:

```ts
getProcessingFacilityAvailability(...)
purchaseProcessingYard(...)
buildProcessingMachine(...)
```

## 2. Processing-yard layout

The yard must be visibly separate from raw production and poultry.

Recommended layout:

```text
north / road side:
processing management board

west:
grain mill
mill input bay
mill output bay

center:
processing warehouse and cart turnaround

south / east:
bakery
bakery ingredient bay
bakery finished-goods bay

road edge:
worker hiring and training access
```

The following must not overlap:

- mill input and output zones
- bakery input and output zones
- worker hiring zones
- machine upgrade zones
- management-board interaction
- signs
- worker routes
- locked land gate
- decorative props

Use the facility and sign registries introduced in v0.8.0.

Do not add fixed-coordinate text labels that bypass those registries.

## 3. Routing policy model

Add a farm-wide routing policy.

```ts
export type RoutingPolicyId =
  | "balanced"
  | "market-first"
  | "contract-first"
  | "processing-first";
```

State:

```ts
interface RoutingPolicyState {
  activePolicy: RoutingPolicyId;
  rawReserves: {
    wheat: number;
    corn: number;
    egg: number;
  };
  marketTargets: ResourceAmounts;
}
```

Recommended default reserves:

```text
wheat: 8
corn: 10
egg: 4
```

The corn reserve must account for chicken feed.

## 4. Protected resource quantities

Create pure calculations for protected quantities.

A resource may be protected by:

- emergency chicken-feed reserve
- active contract remaining requirement
- market target
- player-selected raw reserve
- active machine reserved inputs

Recommended helper:

```ts
interface ProtectedResourceBreakdown {
  chickenFeed: number;
  activeContract: number;
  marketTarget: number;
  rawReserve: number;
  activeProduction: number;
  protectedTotal: number;
}
```

Do not simply add overlapping requirements if they refer to the same physical stock need.

Use explicit documented rules.

Recommended policy interpretation:

### Balanced

```text
1. protect emergency chicken feed
2. protect active contract remaining quantity
3. protect default market target
4. protect raw reserve
5. process only surplus
```

### Market priority

```text
1. protect emergency chicken feed
2. protect market target
3. protect active contract minimum progress
4. protect a smaller raw reserve
5. process remaining surplus
```

### Contract priority

```text
1. protect emergency chicken feed
2. protect active contract remaining quantity
3. protect a small market floor
4. protect a small raw reserve
5. process remaining surplus
```

### Processing priority

```text
1. protect emergency chicken feed
2. protect active contract items already due soon or currently selected
3. protect a minimal market floor
4. protect only four units of each raw resource
5. process surplus aggressively
```

The exact calculation must be deterministic and unit tested.

## 5. Available-to-route calculation

Create a pure helper:

```ts
getAvailableForRouting(
  resource: ResourceId,
  barn: ResourceAmounts,
  protection: ProtectedResourceBreakdown,
): number;
```

Requirements:

- return an integer
- never return negative
- never exceed barn inventory
- do not count machine-buffer stock as barn stock
- do not count worker cargo as barn stock
- do not consume active-cycle reserved inputs

## 6. Mill operator

Add a visible mill operator.

Hiring cost:

```text
450 coins
```

Training costs:

```text
Lv1 → Lv2: 420 coins
Lv2 → Lv3: 900 coins
```

Recommended capacities:

```text
Lv1: 8 units
Lv2: 12 units
Lv3: 16 units
```

Recommended move-speed multipliers:

```text
Lv1: 1.00
Lv2: 1.15
Lv3: 1.30
```

Recommended operation-interval multipliers:

```text
Lv1: 1.00
Lv2: 0.82
Lv3: 0.68
```

### Mill operator responsibilities

The operator has two independent job categories:

```text
A. supply raw grain
barn wheat / corn
→ mill input

B. collect processed grain
mill flour / cornmeal output
→ barn
```

Task priority:

```text
1. collect mill output if output is near full
2. supply ingredients for the active or next selected recipe
3. collect any remaining output
4. wait at the mill office
```

### Batch behavior

The operator must load multiple units per trip.

For raw supply:

- determine needed recipe inputs
- determine available barn surplus after routing protection
- load up to worker capacity
- maintain one resource per trip
- deliver all loaded units to mill input
- if no eligible surplus exists, wait

For output collection:

- choose flour or cornmeal deterministically
- load up to capacity
- deliver all loaded units to barn
- preserve the other output resource

The operator must never teleport inventory.

The visible worker must travel between authored waypoints.

## 7. Baker

Add a visible baker or bakery logistics worker.

Hiring cost:

```text
700 coins
```

Training costs:

```text
Lv1 → Lv2: 650 coins
Lv2 → Lv3: 1300 coins
```

Recommended capacities:

```text
Lv1: 6 units
Lv2: 9 units
Lv3: 12 units
```

### Baker responsibilities

```text
A. supply flour, cornmeal, and eggs
barn
→ bakery input

B. collect bread and cornbread
bakery output
→ barn
```

Task priority:

```text
1. collect bakery output if near full
2. supply missing ingredients for active or next recipe
3. collect remaining output
4. wait at bakery counter
```

### Ingredient trips

The baker may carry only one resource type per trip.

This avoids visually ambiguous mixed worker cargo.

The player remains the only character with mixed cargo.

The baker should choose the most blocking missing ingredient first.

Example:

```text
selected recipe: cornbread
bakery has flour 4, cornmeal 0, egg 5
→ cornmeal is the highest-priority supply trip
```

Tie-breaking must be deterministic.

## 8. Worker state machines

Do not implement the mill operator or baker as one timer that moves remote inventory.

Use explicit phases.

Suggested mill-operator phases:

```ts
type MillOperatorPhase =
  | "idle"
  | "choosing-task"
  | "moving-to-barn"
  | "loading-raw"
  | "moving-to-mill-input"
  | "unloading-raw"
  | "moving-to-mill-output"
  | "loading-processed"
  | "moving-to-barn-with-output"
  | "unloading-processed";
```

Suggested baker phases:

```ts
type BakerPhase =
  | "idle"
  | "choosing-task"
  | "moving-to-barn"
  | "loading-ingredient"
  | "moving-to-bakery-input"
  | "unloading-ingredient"
  | "moving-to-bakery-output"
  | "loading-finished"
  | "moving-to-barn-with-finished"
  | "unloading-finished";
```

Worker runtime position and phase may remain runtime state, but canonical cargo and hire/level state must be serializable.

## 9. Worker cargo state

Extend canonical worker state.

Recommended structure:

```ts
interface ProcessingWorkerState {
  hired: boolean;
  level: 0 | 1 | 2 | 3;
  carriedResource: ResourceId | null;
  carriedAmount: number;
  publicStatus: string;
}
```

Allowed mill-operator cargo:

```text
wheat
corn
flour
cornmeal
```

Allowed baker cargo:

```text
flour
cornmeal
egg
bread
cornbread
```

Validation must reject incompatible worker cargo.

## 10. Partial-batch departure

A worker should not wait indefinitely for a full batch.

Recommended delay:

```text
processingWorkerBatchWaitMs: 800
```

Depart when:

- capacity is full
- source becomes empty
- exact task requirement is satisfied
- wait delay expires with at least one item loaded

Reuse or generalize the batch-departure helpers introduced by PR #18.

Do not duplicate similar logic in multiple systems.

## 11. Routing and active contracts

The contract system must support processed goods after their facilities are built.

Unlock rules:

```text
flour / cornmeal contracts:
- mill built

bread / cornbread contracts:
- bakery built
```

When calculating protected active-contract amounts:

- use remaining requirement, not total requirement
- subtract already delivered amounts
- do not reserve negative quantities
- do not reserve an ingredient if the contract requests only a finished good
- recipe planning may derive ingredient needs separately

Example:

```text
contract requires bread 6
already delivered bread 2
remaining bread 4

Contract reserve protects finished bread already in barn.
Production planning may additionally request ingredients to make the missing 4.
```

## 12. Market integration

Market shelves must support the seven canonical resources.

Recommended capacities:

```text
wheat       8
corn        8
egg         8
flour       6
cornmeal    6
bread       6
cornbread   4
```

Raw and processed goods share the existing customer queue.

Customer requests must only include unlocked goods.

Unlock rules:

```text
wheat:
always

corn:
east field unlocked

egg:
coop unlocked

flour and cornmeal:
mill built

bread and cornbread:
bakery built
```

Customer patience and abandonment behavior from v0.6.0 must remain unchanged.

## 13. Market restock and routing policy

The market restock system must respect the selected routing policy.

It must not blindly remove protected stock.

Use:

```ts
getMarketRestockAvailability(...)
```

Market restocking must:

- never remove active-cycle reserved ingredients
- preserve emergency chicken-feed corn
- preserve contract priority under contract-first mode
- preserve processing ingredients under processing-first mode only after minimum market floor
- remain deterministic
- avoid starving one shelf forever

Use round-robin fairness among eligible goods.

## 14. Production demand calculation

Create pure demand calculation for automatic mode.

Recommended structure:

```ts
interface ProductionDemand {
  resource: ResourceId;
  contractNeed: number;
  marketNeed: number;
  bakeryNeed: number;
  currentBarn: number;
  machineOutput: number;
  score: number;
}
```

Automatic recipe selection may use weighted scoring.

Suggested weights:

```text
active contract shortage: 100 per unit
bakery blocking shortage: 60 per unit
market below floor: 25 per unit
output imbalance: 5 per unit
```

Tie-breaking must be stable by recipe ID or saved round-robin index.

## 15. Operations-center integration

Extend the farm operations center with a processing section.

Cards:

```text
加工場
製粉機
ベーカリー
製粉スタッフ
製パンスタッフ
生産方針
```

Show:

- construction state
- machine level
- enabled state
- selected recipe mode
- active recipe
- remaining time
- input and output totals
- output-full warning
- ingredient-shortage warning
- worker hire and training state
- current routing policy

The operations center and on-site interactions must call the same pure transactions.

## 16. Machine construction and worker hiring saves

Request priority autosave after:

- processing-yard purchase
- mill construction
- bakery construction
- machine upgrade
- machine enable/disable change
- recipe mode change
- routing-policy change
- mill-operator hiring
- baker hiring
- worker training

Do not request priority save for every unit transfer.

Normal dirty-state autosave is sufficient for routine movement and buffer transfers.

## 17. Runtime performance

Requirements:

- one mill operator maximum
- one baker maximum
- no general pathfinding dependency
- authored static waypoint routes
- do not scan every facility every frame if unchanged
- do not recreate routing policy objects every frame
- do not recalculate contract ingredient demand more frequently than necessary
- do not create text objects each update
- bounded transfer effects
- bounded smoke and dust effects
- remove listeners on shutdown
- no browser `setInterval`

## 18. Pure logic tests

Add tests for:

- processing-yard purchase prerequisites and exact cost
- mill construction prerequisites and exact cost
- bakery construction prerequisites and exact cost
- duplicate construction prevention
- all routing policy IDs
- protected-resource calculations
- emergency chicken-feed corn protection
- active-contract reserve calculation
- market target protection
- processing-first minimum raw reserve
- available-to-route non-negative behavior
- mill-operator batch loading
- mill-operator allowed resources
- mill-operator output collection
- baker blocking-ingredient selection
- baker allowed resources
- baker finished-goods collection
- partial-batch departure after delay
- immediate departure when capacity is full
- exact worker hire costs
- exact training costs
- worker capacity by level
- incompatible worker cargo validation
- market unlock rules
- contract unlock rules
- market restock respecting protection
- deterministic recipe-demand scoring
- round-robin fairness
- priority-save request flags
