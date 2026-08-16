# Phase 1 — Wheat Workforce & Farm Layout

This phase fixes wheat-worker training, batch behavior, training-lodge placement, and wheat-field expansion.

## 1. Authoritative farm layout

Create a centralized layout module, for example:

```text
src/game/config/farmLayout.ts
```

It must be the authoritative source for:

- wheat field bounds;
- wheat node positions and stable IDs;
- wheat expansion groups;
- training lodge bounds and entrance;
- wheat crate location;
- wheat collection-box location;
- wheat field purchase pad;
- worker field-entry waypoints;
- worker crate waypoint;
- sign anchors;
- obstacle and exclusion rectangles.

Do not keep separate coordinate copies in:

```text
terrain.ts
GameScene.createCrops()
facilities.ts
workerRoutes.ts
WorkerSystem.ts
CollectionFacilityView.ts
```

Those modules must consume the shared layout.

## 2. Training lodge and upper-left field swap

Move the training lodge into the former upper-left wheat-field area.

Preferred placement:

```text
training lodge bounds:
x = 330
y = 285
width = 390
height = 245

entrance:
x = 525
y = 555
radius = 100
```

Minor coordinate adjustments are permitted after collision testing, but the lodge must:

- occupy the former upper-left wheat area;
- not overlap wheat nodes;
- not overlap the pond;
- not overlap the loop road;
- remain reachable by click/tap movement;
- have a visible entrance and floor interaction marker;
- keep the existing staff-management functionality.

The former lodge/western open area becomes the relocated west wheat field.

Preferred maximum field bounds:

```text
west wheat field:
x = 35
y = 620
width = 650
height = 330
```

The existing central wheat field remains approximately:

```text
central wheat field:
x = 760
y = 885
width = 590
height = 300
```

The two fields must be connected visually by:

- one farm path;
- consistent fences;
- a shared wheat-management sign;
- worker entry waypoints;
- no unused large dirt patch.

## 3. Wheat-field levels

Add persisted state:

```ts
type WheatFieldLevel = 0 | 1 | 2;

interface LandExpansionState {
  wheatFieldLevel: WheatFieldLevel;
  // existing fields remain
}
```

Use these progression targets:

```text
Level 0:
30 active wheat nodes
15 west + 15 central
wheat crate capacity 16

Level 1:
42 active wheat nodes
21 west + 21 central
wheat crate capacity 24
cost 220 coins

Level 2:
54 active wheat nodes
27 west + 27 central
wheat crate capacity 32
cost 520 coins
```

The exact arrangement may use expansion strips, but each level must visibly enlarge both wheat plots rather than merely increasing an invisible number.

Recommended node grouping per field:

```text
base group: 15 nodes
expansion group 1: 6 nodes
expansion group 2: 6 nodes
```

Each node must have a stable ID independent of array position, for example:

```text
wheat-west-base-00
wheat-west-exp1-00
wheat-west-exp2-00
wheat-central-base-00
wheat-central-exp1-00
wheat-central-exp2-00
```

Do not derive persistent identity from array index after v0.9.5.

## 4. Wheat expansion purchase interaction

Add a visible wheat expansion station near the shared wheat-management route.

Preferred interaction behavior:

```text
hold duration: 1100 ms
level 0 → 1: 220 coins
level 1 → 2: 520 coins
level 2: maximum
```

Public Japanese text:

```text
麦畑を広げる
30 → 42株
220コイン
```

then:

```text
麦畑を広げる
42 → 54株
520コイン
```

maximum:

```text
麦畑
最大まで拡張済み
54株
```

The purchase pad must:

- match its logical radius;
- not overlap the lodge entrance;
- not overlap wheat nodes;
- not overlap the crate or collection box;
- show progress while holding;
- show exact missing coins;
- request priority save on success.

## 5. Wheat worker level parameters

The active runtime must use trained worker parameters.

Recommended wheat harvest-worker balance:

| Level | Capacity | Move speed | Harvest duration | Retarget interval |
|---|---:|---:|---:|---:|
| Lv1 | 4 | 155 | 850 ms | 250 ms |
| Lv2 | 7 | 178 | 650 ms | 190 ms |
| Lv3 | 10 | 202 | 480 ms | 140 ms |

Recommended wheat transport-worker balance:

| Level | Capacity | Move speed | Load interval | Unload interval |
|---|---:|---:|---:|---:|
| Lv1 | 6 | 185 | 150 ms | 150 ms |
| Lv2 | 8 | 213 | 115 ms | 115 ms |
| Lv3 | 10 | 241 | 85 ms | 85 ms |

These values may be expressed through multipliers, but runtime output must match the level.

Update the workforce registry so the displayed and runtime capacities are identical.

## 6. Field-affinity harvesting

The wheat harvest worker must maintain an active field cluster.

Recommended field-selection algorithm:

1. If the worker already has an active field with ready crops, remain in that field.
2. Select the nearest ready node inside that field.
3. Harvest until trained capacity is reached.
4. If the active field has no ready nodes, wait up to 600 ms for a nearby regrowth.
5. If another field has ready nodes and cargo is not full, switch fields once.
6. Return to the crate only when:
   - cargo reaches trained capacity;
   - no ready wheat exists in either field after the grace period;
   - the current field route becomes invalid.

Do not choose a globally nearest node after every harvest without field affinity.

## 7. No empty crate trips

Before starting a return-to-crate route, assert:

```text
worker carried wheat > 0
```

If carried wheat is zero, return to crop seeking or waiting without physical travel.

At the crate, exactly one of the following must happen:

```text
full batch deposited
partial batch deposited because crate has limited space
worker waits with remaining cargo because crate is full
```

The worker must not visually arrive, turn around, and leave without a state change or explicit full-crate status.

## 8. Atomic batch deposit

Add pure logic equivalent to:

```ts
function depositHarvestWorkerBatch(
  state: AutomationState,
  requestedAmount?: number,
): {
  changed: boolean;
  transferred: number;
  state: AutomationState;
  reason?: "empty" | "crate-full";
}
```

Transfer amount:

```text
min(worker cargo, crate remaining capacity, requested amount if provided)
```

The logical transfer must be atomic.

Presentation may animate up to five visible bundles and use a multiplier label for larger batches.

Recommended presentation duration:

```text
250–450 ms total
```

After the animation, show:

```text
7個を集荷箱へ格納
```

Do not wait one full deposit interval for every individual item.

## 9. Worker status feedback

Use concise statuses:

```text
西麦畑で収穫中 3/7
中央麦畑で収穫中 6/7
集荷箱へ運搬中 7個
7個を格納
集荷箱が満杯
麦の成長待ち
```

The cargo art must show the current level-dependent batch.

Training must produce an immediately visible difference in:

- number of wheat bundles harvested before return;
- movement speed;
- harvest animation frequency;
- deposited batch size.

## 10. Wheat crate and collection box relocation

Move the wheat field crate and wheat collection box so they serve both wheat fields without overlapping the lodge.

Preferred arrangement:

```text
wheat crate:
near the route between west and central fields

wheat collection box:
near the same farm road but outside the crate interaction circle
```

Their interaction circles must not substantially overlap.

The wheat crate capacity must derive from wheat-field level:

```ts
getWheatCrateCapacity(level)
```

The collection-box capacity remains part of the collection-network configuration and is independent from the worker crate.

## 11. Pure logic

Add or update pure functions equivalent to:

```ts
getWheatFieldNodeCount(level)
getWheatFieldExpansionCost(level)
getWheatFieldCrateCapacity(level)
purchaseWheatFieldExpansion(...)
getWheatWorkerRuntimeParameters(level)
selectWheatFieldCluster(...)
selectNextWheatNodeInCluster(...)
shouldWheatWorkerReturnToCrate(...)
depositHarvestWorkerBatch(...)
```

No Phaser dependency is permitted in these functions.

## 12. Tests

Add deterministic tests for:

- level 0 / 1 / 2 wheat node counts;
- expansion costs;
- maximum expansion;
- crate capacities 16 / 24 / 32;
- exact coin deductions;
- no purchase with insufficient coins;
- stable node IDs;
- schema-6 default migration to wheat level 0;
- Lv1 / Lv2 / Lv3 harvest capacities 4 / 7 / 10;
- trained move and operation parameters;
- worker stays in a field cluster while ready nodes remain;
- worker does not return with zero cargo;
- worker returns at trained capacity;
- worker returns after all fields are empty and grace period expires;
- atomic batch deposit;
- partial deposit when crate has limited space;
- crate-full wait preserves cargo;
- total wheat invariant;
- training lodge and both fields do not overlap;
- lodge entrance and purchase pad are reachable;
- no wheat node overlaps the pond or lodge.

## 13. Browser acceptance

Add a Playwright scenario that can seed a trained wheat worker in E2E mode and verify:

1. Lv1 worker deposits four or fewer wheat in one batch.
2. Lv2 worker harvests at least five before returning when crops are available.
3. Lv3 worker harvests at least eight before returning when crops are available.
4. Every crate visit with cargo produces a deposit or explicit crate-full wait.
5. Wheat expansion purchase changes visible node count.
6. Save/reload preserves wheat-field level and crop state.
