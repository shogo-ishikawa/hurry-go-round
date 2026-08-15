# v0.9.0 Processing and Recipes

## 1. Resource model extension

Extend the canonical resource list to:

```ts
export const RESOURCE_IDS = [
  "wheat",
  "corn",
  "egg",
  "flour",
  "cornmeal",
  "bread",
  "cornbread",
] as const;
```

All canonical resource collections must derive from this list.

Do not leave manually maintained three-resource object types in parallel with the seven-resource model.

Recommended type:

```ts
export type ResourceId = (typeof RESOURCE_IDS)[number];
export type ResourceAmounts = Record<ResourceId, number>;
```

`emptyResourceAmounts()` must return every canonical key with value zero.

Validation must reject:

- missing resource keys
- unknown resource keys
- negative values
- non-finite values
- fractional values where the game expects integer units

## 2. Resource names and icons

Japanese public names:

```text
wheat      麦
corn       とうもろこし
egg        たまご
flour      小麦粉
cornmeal   コーンミール
bread      パン
cornbread  コーンブレッド
```

Each resource needs a distinct locally generated icon.

Suggested visual language:

```text
麦               golden tied sheaf
とうもろこし     yellow cob with green husk
たまご           cream egg in straw tray
小麦粉           cream flour sack with wheat mark
コーンミール     yellow meal sack with corn mark
パン             warm brown loaf with scoring
コーンブレッド   square golden loaf with corn motif
```

Do not use emoji as game art.

## 3. Recipe definitions

Create a central recipe module.

Recommended structure:

```ts
export type MachineId = "grain-mill" | "bakery";

export type RecipeId =
  | "mill-flour"
  | "mill-cornmeal"
  | "bakery-bread"
  | "bakery-cornbread";

export interface RecipeDefinition {
  id: RecipeId;
  machine: MachineId;
  publicName: string;
  inputs: ResourceAmounts;
  outputs: ResourceAmounts;
  baseDurationMs: number;
}
```

Canonical recipes:

```text
mill-flour
Inputs:
  wheat 2
Output:
  flour 1
Base time:
  3500 ms

mill-cornmeal
Inputs:
  corn 2
Output:
  cornmeal 1
Base time:
  4200 ms

bakery-bread
Inputs:
  flour 1
  egg 1
Output:
  bread 1
Base time:
  5500 ms

bakery-cornbread
Inputs:
  flour 1
  cornmeal 1
  egg 1
Output:
  cornbread 1
Base time:
  7500 ms
```

Every recipe input and output must be represented through canonical resource amounts.

## 4. Resource values

Recommended market unit prices:

```ts
const RESOURCE_UNIT_PRICES: ResourceAmounts = {
  wheat: 2,
  corn: 3,
  egg: 5,
  flour: 6,
  cornmeal: 8,
  bread: 16,
  cornbread: 26,
};
```

The processed-goods prices must satisfy:

- flour is worth more than two raw wheat
- cornmeal is worth more than two raw corn
- bread is worth more than one flour plus one egg
- cornbread is worth more than one flour plus one cornmeal plus one egg
- raw selling remains useful before processing is built

If values are tuned, update all docs and tests that rely on them.

## 5. Machine state

Use explicit serializable machine state.

Recommended structure:

```ts
export type MachineLevel = 0 | 1 | 2 | 3;

export interface MachineBufferState {
  amounts: ResourceAmounts;
  capacity: number;
}

export interface ActiveProductionCycle {
  recipeId: RecipeId;
  remainingMs: number;
  durationMs: number;
  reservedInputs: ResourceAmounts;
}

export interface ProcessingMachineState {
  built: boolean;
  level: MachineLevel;
  enabled: boolean;
  selectedMode: "auto" | RecipeId;
  input: MachineBufferState;
  output: MachineBufferState;
  activeCycle: ActiveProductionCycle | null;
  completedCycles: number;
}
```

Level rules:

```text
Level 0:
not built

Level 1:
built, base performance

Level 2:
first upgrade

Level 3:
maximum upgrade
```

`built` and `level` must remain consistent:

```text
built false → level 0
built true  → level 1, 2, or 3
```

## 6. Machine capacities

Recommended base capacities:

```text
Grain mill input capacity:
24 total units

Grain mill output capacity:
16 total units

Bakery input capacity:
18 total units

Bakery output capacity:
12 total units
```

Capacity is shared across all resources in a buffer.

Use pure helpers:

```ts
getBufferTotal(...)
getBufferRemainingCapacity(...)
canAddToBuffer(...)
addBufferResourceOne(...)
removeBufferResourceOne(...)
```

## 7. Machine upgrade effects

Recommended speed multipliers:

```text
Level 1: 1.00
Level 2: 0.75
Level 3: 0.55
```

Recommended buffer-capacity multipliers:

```text
Level 1: 1.00
Level 2: 1.25
Level 3: 1.50
```

Recommended mill upgrade costs:

```text
Level 1 → 2: 300 coins
Level 2 → 3: 700 coins
```

Recommended bakery upgrade costs:

```text
Level 1 → 2: 500 coins
Level 2 → 3: 1000 coins
```

Machine upgrade transactions must be pure and deterministic.

They must:

- enforce construction prerequisite
- enforce exact costs
- prevent duplicate charging
- prevent levels above 3
- preserve active production
- preserve input and output inventory
- request a priority save after success

## 8. Production-cycle lifecycle

A machine cycle must follow this exact logical sequence:

```text
idle
→ choose recipe
→ verify enabled state
→ verify recipe belongs to machine
→ verify sufficient inputs
→ verify sufficient output capacity
→ reserve and remove exact inputs from input buffer
→ create active cycle
→ advance remaining time only during active gameplay
→ complete cycle
→ add exact outputs to output buffer
→ clear active cycle
→ increment completed-cycle count
→ choose the next recipe
```

The cycle must not remove ingredients gradually.

Inputs are reserved atomically at cycle start.

This prevents:

- player removing ingredients after processing starts
- worker removing reserved ingredients
- duplicate completion after save and load
- ingredient loss when a cycle is restored

## 9. Starting a cycle

Create a pure function equivalent to:

```ts
startProductionCycle(
  machine: ProcessingMachineState,
  recipes: RecipeCatalog,
  context: ProductionSelectionContext,
): ProductionStartResult;
```

Failure reasons should include:

```text
not-built
disabled
invalid-recipe
insufficient-input
output-full
no-auto-recipe
cycle-already-active
```

A failed start must not mutate buffers.

## 10. Advancing a cycle

Create a pure function equivalent to:

```ts
advanceProductionCycle(
  machine: ProcessingMachineState,
  deltaMs: number,
): ProductionAdvanceResult;
```

Requirements:

- ignore negative delta
- clamp invalid delta to zero
- do not advance when no cycle exists
- do not advance while gameplay is paused
- support large delta without completing the same cycle twice
- on completion, add exactly the recipe output
- never exceed output capacity
- return a completion event descriptor for rendering

Only one active cycle per machine is allowed.

Do not automatically begin the next cycle inside the same pure completion call unless the behavior is explicitly modeled and tested.

The runtime system may start another cycle on the next update.

## 11. Cancelling a cycle

Allow the player to disable a machine without losing its active cycle.

Recommended behavior:

```text
Disable machine during cycle:
- current cycle continues to completion
- no new cycle starts afterward
```

Optional cancel action from the management panel:

```text
Cancel active cycle:
- return every reserved input to the machine input buffer
- clear active cycle
- no output produced
```

Cancellation must be explicit and confirmed.

Never silently destroy reserved inputs.

## 12. Automatic recipe selection

Mill automatic mode:

Priority should consider:

1. active bakery shortages
2. active contract requirements
3. market stock below target
4. current mill output imbalance
5. deterministic round-robin tie-breaker

Bakery automatic mode:

Priority should consider:

1. active contract requirements
2. market stock below target
3. available ingredients
4. output-buffer space
5. deterministic round-robin tie-breaker

Create pure selectors:

```ts
selectAutomaticMillRecipe(...)
selectAutomaticBakeryRecipe(...)
```

Do not use `Math.random()`.

The same state must select the same recipe.

## 13. Manual machine interaction

Before workers are hired, the player can operate machines manually.

### Grain mill input

When the player enters the mill-input interaction zone:

- transfer wheat and corn from player cargo to mill input
- transfer one unit at a time
- use round-robin order between wheat and corn
- preserve flour, cornmeal, bread, cornbread, and eggs in player cargo
- stop when player has no eligible grain
- stop when mill input is full
- stop when player leaves

### Grain mill output

When the player enters the mill-output zone:

- transfer flour and cornmeal to player cargo
- use remaining shared cargo capacity
- use round-robin order
- stop when output is empty
- stop when cargo is full
- stop when player leaves

### Bakery input

When the player enters the bakery-input zone:

- transfer flour, cornmeal, and eggs from cargo
- use deterministic round-robin transfer
- preserve raw wheat, raw corn, bread, and cornbread
- respect input capacity

### Bakery output

When the player enters the bakery-output zone:

- transfer bread and cornbread into player cargo
- preserve all other cargo
- respect shared cargo capacity

All interaction zones must have distinct icons and colors.

Do not place naked text on the ground.

## 14. Processing warehouse

The processing yard includes a small local warehouse for visual organization, but it must not create another independent canonical inventory unless required.

Preferred model:

- machine input and output buffers are canonical machine inventory
- main barn remains the canonical farm storage
- workers transfer between barn and machine buffers
- no hidden unlimited processing inventory

If a local warehouse is used visually, it must map exactly to a canonical buffer or be purely decorative.

## 15. Machine runtime system

Add a dedicated system such as:

```text
ProcessingSystem
```

It should coordinate:

- manual buffer transfer timers
- machine-cycle start and advance
- recipe selection
- machine status visuals
- completion effects
- operations-panel events
- worker integration
- save dirty-state events

Do not put all processing logic directly in `GameScene.ts`.

## 16. Machine visual states

Each machine needs visible states:

```text
not built
idle
waiting for ingredients
waiting for output space
processing
paused after current cycle
complete output available
```

Grain mill visual feedback:

- turning wheel or rotating mill component while processing
- grain sack movement at cycle start
- flour or cornmeal sack appearance at output
- dust puff with bounded lifetime
- no continuous unbounded particles

Bakery visual feedback:

- oven glow while processing
- small chimney smoke with bounded reuse
- loaf appearance at output
- warm completion pulse
- no external image assets

## 17. Processing invariants

For every machine cycle:

```text
resource total before cycle start
=
resource total after input reservation
+
reserved inputs
```

At completion:

```text
reserved recipe inputs are consumed exactly once
recipe outputs are created exactly once
```

At cancellation:

```text
all reserved inputs return exactly once
no output is created
```

At save and load:

```text
active cycle + reserved inputs remain equivalent
```

## 18. Required tests

Add deterministic tests for:

- all resource definitions contain seven keys
- empty amounts include every key
- recipe inputs and outputs are valid
- recipe machine association
- sufficient and insufficient input checks
- output-capacity checks
- atomic input reservation
- cycle time advancement
- exact cycle completion
- no duplicate completion
- cycle cancellation and exact input return
- disabling a machine during an active cycle
- level speed multipliers
- buffer-capacity multipliers
- maximum machine level
- exact machine upgrade costs
- automatic mill recipe selection
- automatic bakery recipe selection
- deterministic tie-breaking
- manual mill input transfer
- manual mill output collection
- manual bakery input transfer
- manual bakery output collection
- mixed player cargo remains valid
- no negative buffer amounts
- no output above capacity
- save/load of active cycle
- resource invariants across completion and cancellation
