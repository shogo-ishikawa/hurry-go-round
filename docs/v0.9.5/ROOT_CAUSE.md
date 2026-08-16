# v0.9.5 Root-Cause Analysis

This document records why the reported v0.9.4 behavior occurs and identifies the architectural corrections required in v0.9.5.

## 1. Wheat worker training is defined but not consumed by runtime

The workforce registry defines level-dependent wheat-worker capacities:

```text
wheat harvester capacities: 4 / 5 / 6
wheat transporter capacities: 6 / 8 / 10
move-speed multiplier: 1.00 / 1.15 / 1.30
operation interval multiplier: 1.00 / 0.85 / 0.70
```

However, the current wheat `WorkerSystem` uses fixed `GAME_CONFIG` values:

```text
harvestWorkerMoveSpeed
harvestWorkerHarvestDurationMs
harvestWorkerCarryCapacity
harvestWorkerDepositIntervalMs
transportWorkerMoveSpeed
transportWorkerCarryCapacity
transportWorkerLoadIntervalMs
transportWorkerUnloadIntervalMs
```

It does not call `getWorkerParametersForLevel()` for wheat workers.

Therefore, paying for training changes the saved level and management display, but the active wheat runtime keeps using level-1 speed, capacity, and intervals.

### Required correction

Create one authoritative level-aware parameter resolver for wheat runtime.

The runtime must consume:

```ts
getWorkerParametersForLevel("wheat-harvester", level)
getWorkerParametersForLevel("wheat-transporter", level)
```

or an equivalent specialized function.

No fixed capacity or interval may override the trained level.

## 2. Wheat harvesting and deposit are modeled as one-unit operations

The current worker logic harvests one crop node at a time and uses a one-unit deposit function:

```text
harvestWorkerCollectOne

depositHarvestWorkerCargoOne
```

The runtime visits the crate and transfers one unit per deposit interval.

This creates three player-facing problems:

1. the worker's physical trip and logical transfer are hard to correlate;
2. a short visit to the crate may look like no deposit occurred;
3. training does not produce a visually obvious larger batch.

The worker also chooses the globally nearest ready crop after each harvest. With two distant wheat clusters, it may switch field clusters repeatedly instead of completing an efficient local route.

### Required correction

Use a field-affinity batch plan:

```text
select field cluster
→ harvest nearest ready nodes inside that cluster
→ continue until trained capacity is reached
→ or local field has no ready nodes for a short grace period
→ return to crate
→ deposit the complete available batch atomically
```

The logical batch transfer may be atomic while the presentation animates several bundles over 250–450 ms.

A trip to the crate must never complete without one of these explicit results:

```text
batch deposited
crate full, worker waits with cargo
worker had zero cargo and the trip is cancelled before movement begins
```

## 3. Wheat layout is hard-coded in two separate places

The soil plots are drawn in `terrain.ts`, while wheat-node positions are independently hard-coded in `GameScene.createCrops()`.

Current wheat clusters are approximately:

```text
upper-left plot:
x = 290–850
y = 265–575

central/lower plot:
x = 760–1350
y = 885–1185
```

The training lodge is separately hard-coded around:

```text
x = 55–340
y = 655–865
entry near x = 350, y = 780
```

Because terrain, crop nodes, facility bounds, worker routes, signs, and save IDs are not generated from one layout definition, moving a field or lodge requires editing multiple unrelated modules and risks visual/logical divergence.

### Required correction

Create a centralized farm layout definition, for example:

```text
src/game/config/farmLayout.ts
```

It must define:

- training-lodge bounds and entrance;
- wheat-field plot bounds;
- wheat-node groups by expansion level;
- wheat crate and collection-box positions;
- field-entry waypoints;
- purchase pad and sign candidates;
- exclusion rectangles for pond, paths, buildings, and interactions.

Terrain drawing, `CropNode` creation, facility registry, worker routes, and layout tests must consume the same data.

## 4. Wheat expansion state does not exist

Corn has an explicit expansion level, costs, node counts, and crate capacities.

Wheat has fixed crop nodes and a fixed crate capacity. There is no persisted wheat-field level, expansion transaction, or planned expansion presentation.

### Required correction

Add:

```ts
wheatFieldLevel: 0 | 1 | 2
```

and pure functions for:

```text
cost
node count
crate capacity
purchase
maximum-level handling
```

## 5. Processing interactions exist logically but are not visibly represented

Current processing interaction coordinates include:

```text
processing yard purchase
mill construction
bakery construction
mill input
mill output
bakery input
bakery output
processing panel
```

But the current `ProcessingFacilityView` mainly draws:

- the overall yard rectangle;
- a planned-yard title;
- the mill building only after construction;
- the bakery building only after construction;
- the management board.

It does not provide clear matching floor pads, foundations, arrows, live buffer storage, or distinct input/output stations for all logical interactions.

### Required correction

Every logical processing interaction must have a corresponding visible world object whose displayed bounds match the logical radius.

Before construction, show foundations and purchase pads.

After construction, show:

```text
input station
machine
output storage
management board
```

with different shapes and colors.

## 6. Processing transfers are silent

The current processing runtime automatically attempts one transfer every short interval when the player stands within a logical input or output radius.

There is no guaranteed visible item animation, live transfer label, before/after count, or clear active-zone response.

A player therefore cannot reliably determine:

- when transfer begins;
- which material is removed;
- which machine receives it;
- when an output is ready;
- where output collection occurs;
- why transfer stopped.

### Required correction

Add explicit transfer state and feedback:

```text
input station pulses
resource icon moves from player to machine storage
player cargo count decrements visibly
machine input count increments visibly
short status: 搬入中 / 満杯 / 対応原料なし
```

Output collection requires the reverse presentation.

## 7. Bakery prerequisites and placement are implicit

The current processing runtime determines the next hold action in code:

```text
yard
→ mill
→ bakery
```

However, players do not receive a persistent construction checklist or visible unbuilt bakery foundation with exact cost and prerequisite state.

### Required correction

Show the complete processing build plan from the start:

```text
加工場用地
製粉機
ベーカリー
```

Locked foundations remain visible with a muted appearance and exact requirement checklist.

## 8. Unbuilt collection boxes are invisible

The current collection facility view sets each local box visible only when `box.built` is true.

This means an unbuilt wheat or corn collection box has no world presence, even though the logical build interaction exists.

A player can accidentally find one build zone but has no systematic way to discover all three.

### Required correction

Render two states for every collection box:

```text
planned / unbuilt
built / operational
```

The planned state must show:

- a small foundation;
- a resource icon;
- cost;
- build pad;
- prerequisite state;
- map/management-panel guide action.

## 9. Collection panel actions lack reliable acknowledgement

The current collection panel creates text-based buttons, emits a global event, immediately closes the overlay, and depends on a paused game scene's system listener to update state.

Even where the event is handled, the panel closes before it can show:

- success;
- failure reason;
- changed routing mode;
- new worker level;
- exact wallet deduction;
- updated box state.

Text-only interactive hit areas also provide weak touch affordance.

### Required correction

Create a reusable modal UI and button component with:

- rectangle hit area;
- text label;
- explicit depth;
- hover/pressed/disabled states;
- pointer and touch handling;
- keyboard activation;
- action result acknowledgement.

Do not close the collection panel immediately after an action.

The panel must remain open, refresh from authoritative state, and display a result message.

## 10. Existing E2E coverage does not test these player flows

Current save E2E validates persistence, but v0.9.4 processing, collection, and wheat-worker behavior were not all exercised through actual browser interactions before release.

### Required correction

v0.9.5 E2E must cover:

- trained wheat worker harvesting and batch deposit;
- wheat expansion purchase;
- processing-yard, mill, and bakery construction;
- manual input and output transfer;
- collection box discovery and construction;
- collection modal mouse/touch/keyboard actions;
- save/reload of all new state.
