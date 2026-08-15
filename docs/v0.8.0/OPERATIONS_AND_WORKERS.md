# v0.8.0 — Farm Operations and Workforce

## 1. Goal

v0.8.0 must turn worker hiring and worker status into a reliable, visible, persistent game system.

The current expanded-area automation is not sufficient because it combines:

- hard-coded hiring pads;
- purchase timers;
- resource production;
- worker status;
- no visible corn-worker or caretaker entity;
- no reliable in-world explanation.

The update must separate worker purchase transactions from worker runtime simulation.

## 2. Worker registry

Create one registry for every worker role.

```ts
type WorkerRoleId =
  | "wheat-harvester"
  | "wheat-transporter"
  | "corn-harvester"
  | "corn-transporter"
  | "poultry-caretaker";

interface WorkerRoleDefinition {
  id: WorkerRoleId;
  publicName: string;
  facilityId: FacilityId;
  hireInteractionId: InteractionId;
  hireCost: number;
  prerequisite: (state: GameState) => InteractionAvailability;
  trainingCosts: readonly number[];
  baseParameters: WorkerParameters;
  levelParameters: readonly WorkerLevelParameters[];
}
```

The worker registry is the single source for:

- hire cost;
- prerequisite;
- public Japanese name;
- capacity;
- movement speed;
- operation intervals;
- maximum level;
- management-panel ordering.

Do not duplicate those values in the hire system, runtime system, HUD, and save migration.

## 3. Hiring costs

Preserve existing hire costs:

```text
麦の収穫スタッフ      40コイン
麦の運搬スタッフ      75コイン
とうもろこし収穫      160コイン
とうもろこし運搬      240コイン
飼育スタッフ          300コイン
```

Prerequisites:

```text
wheat harvester:
none beyond the original farm

wheat transporter:
wheat harvester hired

corn harvester:
east corn field unlocked

corn transporter:
east corn field unlocked and corn harvester hired

poultry caretaker:
chicken coop unlocked
```

A prerequisite failure must show the exact Japanese reason.

## 4. Pure hiring transaction

All worker hires must use one pure transaction function.

Suggested API:

```ts
interface HireWorkerInput {
  role: WorkerRoleId;
  walletCoins: number;
  workerState: WorkerProgressState;
  prerequisites: WorkerPrerequisiteState;
}

interface HireWorkerResult {
  changed: boolean;
  reason?:
    | "already-hired"
    | "insufficient-coins"
    | "missing-prerequisite";
  walletCoins: number;
  workerState: WorkerProgressState;
}
```

Requirements:

- exact cost deducted once;
- no deduction on failure;
- no duplicate hiring;
- unrelated worker state unchanged;
- initial level set consistently;
- deterministic and Phaser-independent;
- covered by tests for all five roles.

## 5. Operations office

Add an in-world farm operations office or management board near the original farm hub.

It must not overlap:

- the carry upgrade;
- the harvest-speed upgrade;
- the contract board;
- the contract dock;
- the barn delivery zone;
- customer routes;
- the player spawn point.

The exact position must be resolved through the facility/sign layout rather than inserted as another uncoordinated fixed sign.

### Public sign

```text
農場運営所
スタッフ・施設
```

### Opening the panel

When the farmer is near the operations office:

```text
PC:
E or Space
click the action button

mobile:
tap the camera-fixed action button
```

The operation radius must be visually indicated with a floor icon and must match the logical radius.

The panel must not be openable from anywhere on the map.

## 6. Operations panel

The camera-fixed panel contains three main sections.

### 6.1 Overview

Show:

- wallet coins;
- reputation;
- active contract summary;
- wheat automation status;
- corn automation status;
- poultry status;
- critical problem count.

Problem examples:

```text
麦の集荷箱が満杯
とうもろこし運搬スタッフが未雇用
餌が不足しています
卵置き場が満杯
```

### 6.2 Worker roster

Each worker card shows:

- worker icon;
- Japanese role name;
- hired or not hired;
- current level;
- current activity;
- prerequisite status;
- hire cost or next training cost;
- locate button;
- hire or train button.

Do not display internal enum names.

### 6.3 Facility locator

List:

- farm management;
- wheat crate;
- east corn field;
- corn crate;
- chicken coop;
- feed trough;
- egg storage;
- market;
- contract board;
- contract dock.

Selecting a facility closes or minimizes the panel and creates a map marker and directional arrow.

No teleportation is added.

## 7. On-site and operations-panel consistency

The player may hire through either:

1. the on-site interaction pad;
2. the operations panel while physically near the operations office.

Both routes must call the same availability and transaction logic.

The following must be identical between routes:

- cost;
- prerequisite;
- insufficient-funds result;
- already-hired result;
- resulting worker level;
- autosave request;
- success notification;
- visible worker spawn.

## 8. Visible corn workers

The corn automation must no longer be represented only by timers that directly increment crate and barn values.

Create visible entities for:

```text
とうもろこし収穫スタッフ
とうもろこし運搬スタッフ
```

### 8.1 Corn harvester

Required phases:

```ts
type CornHarvesterPhase =
  | "not-hired"
  | "spawning"
  | "seeking-crop"
  | "moving-to-field"
  | "moving-to-crop"
  | "harvesting"
  | "returning-to-crate"
  | "depositing"
  | "waiting-for-crops"
  | "waiting-for-crate-space";
```

Behavior:

- spawn after hire or load;
- use actual ready corn nodes;
- release stale crop target if player harvests it first;
- carry visible corn;
- obey level-dependent capacity;
- deposit one unit at a time;
- wait visibly if the crate is full;
- resume automatically when space or crops become available;
- use authored waypoints;
- not walk through locked land, buildings, pond, coop, or crop rows except intended entry lanes.

### 8.2 Corn transporter

Required phases:

```ts
type CornTransporterPhase =
  | "not-hired"
  | "spawning"
  | "moving-to-crate"
  | "waiting-at-crate"
  | "loading"
  | "moving-to-barn"
  | "unloading"
  | "returning-to-crate";
```

Behavior:

- load one corn at a time;
- show visible cart cargo;
- travel through authored road waypoints;
- unload one unit at a time into barn corn;
- preserve corn total;
- resume after save/load;
- not use a direct timer that transfers corn without a worker trip.

## 9. Visible poultry caretaker

Create a visible poultry caretaker entity.

Required phases:

```ts
type PoultryCaretakerPhase =
  | "not-hired"
  | "spawning"
  | "evaluating"
  | "moving-to-barn-for-feed"
  | "loading-feed"
  | "moving-to-trough"
  | "depositing-feed"
  | "moving-to-eggs"
  | "collecting-eggs"
  | "moving-to-barn-with-eggs"
  | "unloading-eggs"
  | "waiting";
```

Task priority remains:

1. emergency feed shortage;
2. collect eggs;
3. top up feed;
4. wait.

Requirements:

- visibly carry corn or eggs, never both;
- use authored routes;
- one-unit transfers;
- level-dependent capacity and speed;
- preserve resource totals;
- no timer-only direct barn/feed mutation without a visible trip;
- safe recovery after load;
- resume when resource conditions change;
- display short state bubble only on state change or problem, not continuously.

## 10. Worker entity art

Each worker must be visually distinct by silhouette and equipment.

### Wheat harvester

- wheat-colored headwear;
- sickle or basket;
- warm work clothing.

### Wheat transporter

- wheat cart or carrying frame;
- sturdier silhouette.

### Corn harvester

- green field hat;
- corn knife or field basket;
- visible corn cargo.

### Corn transporter

- yellow-green cart;
- larger wheels;
- visible corn crates.

### Poultry caretaker

- blue or rust-colored apron;
- feed bucket or egg carrier;
- distinct posture for corn and egg trips.

Do not differentiate roles only by color.

## 11. Worker status state

Separate persistent state from runtime phase.

Suggested persistent state:

```ts
interface WorkerProgressState {
  hired: boolean;
  level: 0 | 1 | 2 | 3;
  carriedResource: ResourceId | null;
  carriedAmount: number;
}
```

Where:

```text
level 0 = not hired
level 1 = hired base level
level 2 = first training
level 3 = maximum training
```

Runtime-only state may include:

- current waypoint index;
- temporary target crop ID;
- animation phase;
- current tween;
- short status bubble timer.

Runtime-only state is reconstructed safely after load.

## 12. Worker training

Add two training levels after hiring.

Training is purchased through the operations panel while near the operations office.

No new world-space training pads are added. This avoids more sign and pad crowding.

### 12.1 Training costs

```text
麦の収穫スタッフ
Lv1 → Lv2: 80
Lv2 → Lv3: 180

麦の運搬スタッフ
Lv1 → Lv2: 110
Lv2 → Lv3: 240

とうもろこし収穫スタッフ
Lv1 → Lv2: 220
Lv2 → Lv3: 450

とうもろこし運搬スタッフ
Lv1 → Lv2: 280
Lv2 → Lv3: 560

飼育スタッフ
Lv1 → Lv2: 320
Lv2 → Lv3: 640
```

### 12.2 Training effects

Movement speed multiplier:

```ts
workerMoveSpeedMultiplierByLevel: [0, 1.0, 1.15, 1.30]
```

Operation interval multiplier:

```ts
workerOperationIntervalMultiplierByLevel: [0, 1.0, 0.85, 0.70]
```

Capacities:

```text
wheat harvester:  4 / 5 / 6
wheat transporter: 6 / 8 / 10
corn harvester:   5 / 6 / 8
corn transporter: 8 / 10 / 12
poultry caretaker: 6 / 8 / 10
```

Training must produce an observable improvement without making production instantaneous.

### 12.3 Training transaction

Create a pure transaction equivalent to:

```ts
trainWorker(...)
```

Requirements:

- worker must be hired;
- exact cost deducted;
- maximum level enforced;
- no charge on failure;
- unrelated worker state preserved;
- cargo clamped safely if a future balance change lowers capacity;
- autosave after success;
- deterministic tests for every role and level.

## 13. Worker problem states

The operations panel must show concise problem states.

Examples:

```text
未雇用
土地が未開放
前提スタッフが必要
集荷箱が満杯
作物の成長待ち
倉庫にとうもろこしがありません
餌箱が満杯
卵置き場が空です
```

Problem messages must be derived from logical state, not stale display strings stored as the authoritative state.

Public status may be a pure mapping from role + runtime phase + inventory conditions.

## 14. Expanded automation and contracts

The existing contract system delivers from barn inventory.

Worker automation must continue filling the barn so that contracts can be completed naturally.

The operations panel may show:

- active contract requested resources;
- current barn amounts;
- whether a worker chain is incomplete.

Do not automatically reroute market stock or reserve inventory for contracts in v0.8.0.

## 15. Save/load runtime recovery

After loading:

- hired workers spawn visibly;
- worker levels apply immediately;
- carried worker resources remain conserved;
- each worker resumes from a safe phase;
- no resource duplicates;
- no worker remains invisible while marked hired;
- no hire pad remains active for an already-hired worker;
- the operations panel shows the restored state.

Safe resume rules are defined in `PERSISTENCE_AND_MIGRATION.md`.

## 16. Required pure logic

Implement or extend pure functions equivalent to:

```ts
getWorkerRoleDefinition(...)
getWorkerAvailability(...)
hireWorkerByRole(...)
getWorkerTrainingCost(...)
getWorkerParametersForLevel(...)
trainWorker(...)
selectWorkerProblemState(...)
selectCaretakerTask(...)
selectSafeWorkerResumePhase(...)
```

Requirements:

- Phaser-independent;
- deterministic;
- explicit failure reason;
- exact currency changes;
- no duplicate hire or training;
- capacity bounds enforced;
- unrelated resources and workers preserved.

## 17. Required tests

At minimum:

- all five roles use registry-defined costs;
- all prerequisites are enforced;
- corn harvester becomes hireable after east unlock;
- corn transporter becomes hireable after corn harvester hire;
- caretaker becomes hireable after coop unlock;
- successful hire spawns a runtime worker through the integration layer;
- loading a hired worker spawns it visibly;
- on-site and operations-panel hiring produce identical state;
- training costs are exact;
- maximum training is enforced;
- training changes parameters correctly;
- worker capacities match level tables;
- worker movement and operation multipliers match level tables;
- corn workers preserve corn totals;
- caretaker feed and egg trips preserve resource invariants;
- worker cannot be charged twice;
- already-hired pad shows hired state;
- unavailable pad shows exact prerequisite;
- facility locator selects the correct registered facility;
- visible runtime worker exists whenever persistent hired state is true.
