# v0.9.0 Persistence, Migration, Validation, and Acceptance

## 1. Versioning

Update:

```text
package.json
package-lock.json
```

to:

```text
0.9.0
```

Update the public game version and persistence game version to `0.9.0`.

Use:

```text
SAVE_SCHEMA_VERSION = 3
```

Do not invalidate existing valid saves.

## 2. Migration chain

The migration system must support:

```text
schema 1
→ schema 2
→ schema 3
```

Do not remove the schema-1 migration when adding schema 3.

A schema-1 import should still migrate through every required stage.

A schema-2 save from v0.8.0 or from the merged PR #18 baseline must migrate directly to schema 3.

## 3. Seven-resource migration

Existing schema-2 resource amounts contain:

```text
wheat
corn
egg
```

Schema 3 adds:

```text
flour
cornmeal
bread
cornbread
```

Every migrated resource collection must add the new keys with value zero.

This applies to:

- player cargo
- barn storage
- market storage
- market capacities
- sold-by-resource statistics
- contract requirements
- contract delivered amounts
- machine buffers when absent

Do not delete existing raw resource values.

Do not regenerate existing contracts during migration.

## 4. Schema-3 snapshot

Recommended additions:

```ts
interface PersistedProcessingLand {
  yardUnlocked: boolean;
  millBuilt: boolean;
  bakeryBuilt: boolean;
}

interface PersistedMachineBuffer {
  amounts: ResourceAmounts;
  capacity: number;
}

interface PersistedProductionCycle {
  recipeId: RecipeId;
  remainingMs: number;
  durationMs: number;
  reservedInputs: ResourceAmounts;
}

interface PersistedMachineState {
  built: boolean;
  level: 0 | 1 | 2 | 3;
  enabled: boolean;
  selectedMode: "auto" | RecipeId;
  input: PersistedMachineBuffer;
  output: PersistedMachineBuffer;
  activeCycle: PersistedProductionCycle | null;
  completedCycles: number;
}

interface PersistedProcessingWorker {
  hired: boolean;
  level: 0 | 1 | 2 | 3;
  carriedResource: ResourceId | null;
  carriedAmount: number;
}

interface PersistedProcessingState {
  land: PersistedProcessingLand;
  mill: PersistedMachineState;
  bakery: PersistedMachineState;
  millOperator: PersistedProcessingWorker;
  baker: PersistedProcessingWorker;
  routingPolicy: RoutingPolicyId;
  rawReserves: {
    wheat: number;
    corn: number;
    egg: number;
  };
  autoSelectionRoundRobin: {
    mill: number;
    bakery: number;
  };
}
```

The exact nesting may differ, but all canonical values must be serializable and validated.

## 5. Migration defaults

Schema-2 to schema-3 defaults:

```text
processing yard unlocked: false
mill built: false
bakery built: false
mill level: 0
bakery level: 0
machines enabled: true
mill selected mode: auto
bakery selected mode: auto
all machine buffers: zero
active cycles: null
completed cycles: zero
mill operator hired: false
baker hired: false
worker levels: 0
worker cargo: zero
routing policy: balanced
raw wheat reserve: 8
raw corn reserve: 10
raw egg reserve: 4
round-robin indices: 0
```

If PR #18 has added `cornFieldLevel`, preserve it.

If the old save does not contain `cornFieldLevel`, use level 0.

## 6. Contract migration

Existing contracts must remain valid.

For every existing offer and active contract:

- preserve ID
- preserve type
- preserve requirements for wheat, corn, and eggs
- preserve delivered quantities
- preserve reward
- preserve early-completion target
- preserve elapsed active time
- add zero requirements and delivered amounts for new processed resources

Do not change the contract seed or sequence during migration.

New offers generated after migration may include processed goods only after the corresponding facility unlock.

## 7. Market-capacity migration

Recommended schema-3 capacities:

```text
wheat       8
corn        8
egg         8
flour       6
cornmeal    6
bread       6
cornbread   4
```

Existing raw-market quantities and capacities must be preserved when valid.

New processed capacities receive their defaults.

Validation must reject market stock above capacity.

## 8. Active production persistence

An active cycle must save:

- recipe ID
- remaining time
- original duration
- exact reserved inputs

At cycle start, inputs have already been removed from the machine input buffer.

Therefore, after load:

- do not remove inputs again
- do not return inputs automatically
- resume the cycle using remaining time
- complete output exactly once

The saved cycle must be self-contained enough to validate even if configuration values change in a future version.

Store the duration and reserved inputs explicitly.

## 9. Machine-state validation

Validation must enforce:

- not built implies level 0
- built implies level 1, 2, or 3
- input and output contain all seven resource keys
- amounts are non-negative integers
- buffer total does not exceed capacity
- selected recipe belongs to the machine or is `auto`
- active cycle recipe belongs to the machine
- remaining time is finite and non-negative
- duration is finite and positive
- remaining time does not exceed a documented tolerant bound
- reserved inputs exactly match a valid recipe input shape
- active-cycle output can eventually fit or the runtime safely waits
- completed cycle count is non-negative

Invalid imported state must not be silently accepted.

## 10. Worker-state validation

Mill operator allowed cargo:

```text
wheat
corn
flour
cornmeal
null
```

Baker allowed cargo:

```text
flour
cornmeal
egg
bread
cornbread
null
```

Validation rules:

- unhired worker has level 0
- hired worker has level 1–3
- carried amount is non-negative integer
- carried amount does not exceed level capacity
- zero carried amount requires null resource
- positive carried amount requires compatible non-null resource

## 11. Routing-state validation

Allowed routing policy IDs:

```text
balanced
market-first
contract-first
processing-first
```

Raw reserves must be non-negative integers.

Round-robin indices must be finite non-negative integers and normalized at runtime.

Unknown policy values must fail import validation or migrate to `balanced` with an explicit warning only when the source schema is known and migration logic owns the conversion.

## 12. Save creation

Update canonical snapshot creation to include:

- seven-resource cargo
- seven-resource barn and market
- seven-resource sales statistics
- processing land and buildings
- machine levels and buffers
- active cycles
- routing policy
- processing workers
- processed-goods contract values
- PR #18 corn-field level

Do not save:

- Phaser objects
- graphics
- tweens
- temporary transfer effects
- current pointer state
- modal open animations
- contextual hint objects
- runtime worker route arrays

## 13. Safe worker restoration

On load, processing workers do not need to resume from exact pixel coordinates.

Preserve their carried resource and amount.

Restart rule:

```text
Mill operator carrying raw grain:
resume toward mill input

Mill operator carrying flour or cornmeal:
resume toward barn

Baker carrying flour, cornmeal, or eggs:
resume toward bakery input

Baker carrying bread or cornbread:
resume toward barn

No cargo:
resume at safe worker home point and choose a new task
```

This mapping must be pure and tested.

Resource conservation must hold across restoration.

## 14. Autosave triggers

Priority save after:

- processing-yard purchase
- mill construction
- bakery construction
- machine upgrade
- machine mode change
- machine enable/disable
- routing-policy change
- reserve-setting change
- mill-operator hire
- baker hire
- worker training
- recipe-cycle cancellation
- import application

Normal dirty autosave after:

- buffer transfers
- cycle start
- cycle completion
- worker loading and unloading
- market sales
- contract delivery

Do not perform an IndexedDB transaction for every single frame.

Preserve existing debounce and backup rotation.

## 15. JSON export and import

Export preview must include:

- game version
- schema version
- saved time
- wallet coins
- land unlocks
- corn-field level
- mill and bakery construction state
- machine levels
- processing worker hires
- active production cycles
- active contract
- reputation
- routing policy

Import validation must:

- enforce existing maximum file size
- verify checksum before migration when required
- migrate schema 1 or 2 to 3
- show migration warnings
- preview processing state
- require explicit replacement confirmation
- preserve backup behavior

## 16. No offline production

v0.9.0 must not process machine cycles while the application is closed.

On load:

- use saved `remainingMs`
- do not subtract wall-clock elapsed time
- do not generate processed goods offline
- do not advance contracts offline

The title or continue screen may state:

```text
アプリを閉じている間、生産時間は進みません
```

## 17. Full resource invariants

### Wheat

Changes only through:

- wheat harvest: +1
- market sale: -1
- contract delivery: -1 from barn and +1 contract delivered accounting
- flour cycle start: wheat moves to reserved input
- flour cycle completion: reserved wheat is consumed and flour is created

### Corn

Changes only through:

- corn harvest: +1
- market sale: -1
- contract delivery
- chicken feed conversion
- cornmeal production

### Egg

Changes only through:

- egg production: +1
- market sale: -1
- contract delivery
- bakery production

### Flour

Changes only through:

- flour production: +1
- sale or contract delivery: -1
- bakery production reservation and consumption

### Cornmeal

Changes only through:

- cornmeal production: +1
- sale or contract delivery: -1
- cornbread production reservation and consumption

### Bread

Changes only through:

- bread production: +1
- sale or contract delivery: -1

### Cornbread

Changes only through:

- cornbread production: +1
- sale or contract delivery: -1

Pure tests must account for reserved active-cycle inputs.

## 18. Recipe conservation tests

For each recipe:

```text
start cycle
→ inputs leave machine input
→ same inputs appear in reserved state
→ no output yet
```

```text
complete cycle
→ reserved input clears
→ exact output appears once
```

```text
cancel cycle
→ reserved input clears
→ exact inputs return
→ no output appears
```

```text
save and load mid-cycle
→ input remains reserved
→ completion happens once
```

## 19. Migration tests

Add tests for:

- schema-1 save still migrates to latest schema
- schema-2 v0.8 save migrates to schema 3
- schema-2 PR #18 save preserves corn-field level
- schema-2 save without corn-field level defaults to zero
- raw resource amounts are preserved
- new resource keys are added as zero
- existing contract IDs and progress remain unchanged
- existing worker levels and cargo remain unchanged
- processing state defaults are valid
- checksum is recalculated after migration
- invalid schema-2 resource values are rejected
- unknown future schema is rejected

## 20. Runtime logic tests

Add tests for:

- machine cycle survives state serialization
- machine cycle resumes from remaining time
- worker cargo survives save and restore
- worker restart destination mapping
- routing policy survives save and restore
- auto-selection index survives save and restore
- machine output cannot duplicate after repeated load
- recipe cancellation before and after save
- priority save flags

## 21. End-to-end manual acceptance

### Prerequisite baseline

1. Confirm PR #18 behavior is present.
2. Expand the corn field.
3. Confirm corn and poultry workers use batches.
4. Save and reload.
5. Confirm expansion and batch automation remain valid.

### Processing-yard unlock

1. Unlock east field and chicken coop.
2. Accumulate 800 coins.
3. Purchase processing-yard land.
4. Confirm exact coin deduction.
5. Confirm open gate and visible construction sites.
6. Save and reload.
7. Confirm the yard remains unlocked.

### Mill manual flow

1. Build the mill for 350 coins.
2. Carry wheat and corn to mill input.
3. Confirm mixed cargo transfers only eligible grain.
4. Select flour mode.
5. Confirm 2 wheat are reserved.
6. Observe progress.
7. Confirm 1 flour appears.
8. Collect flour manually.
9. Deliver flour to barn.
10. Confirm market can sell flour.

### Bakery manual flow

1. Build bakery for 850 coins.
2. Produce flour.
3. Bring flour and eggs to bakery input.
4. Select bread mode.
5. Confirm exact ingredient reservation.
6. Confirm one bread is created.
7. Collect and deliver bread.
8. Confirm customers request and buy bread.
9. Produce cornmeal and then cornbread.

### Processing workers

1. Hire mill operator for 450 coins.
2. Confirm batch raw supply.
3. Confirm batch output collection.
4. Hire baker for 700 coins.
5. Confirm ingredient supply.
6. Confirm finished-goods collection.
7. Train both workers.
8. Confirm increased capacity and speed.

### Routing policies

1. Select Balanced.
2. Confirm emergency chicken feed remains protected.
3. Select Contract priority with an active contract.
4. Confirm required resources are not consumed below protected need.
5. Select Market priority.
6. Confirm market floors refill before aggressive processing.
7. Select Processing priority.
8. Confirm surplus is processed while minimum reserves remain.

### Active-cycle save

1. Start a cornbread cycle.
2. Save at approximately half progress.
3. Reload.
4. Confirm remaining progress resumes.
5. Confirm ingredients are not deducted again.
6. Confirm only one cornbread is produced.

### Contract integration

1. Build the mill.
2. Confirm flour and cornmeal offers may appear.
3. Build the bakery.
4. Confirm bread and cornbread offers may appear.
5. Accept a processed-goods contract.
6. Produce goods.
7. Deliver from barn through contract dock.
8. Confirm reward and reputation.

## 22. Responsive acceptance

Verify:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

Confirm:

- processing panel fits
- machine controls are reachable
- construction prompts are readable
- no sign overlap
- input/output bays are distinct
- processing HUD does not cover joystick
- resource icons are distinguishable
- contract cards fit processed resources
- text scale 130% remains usable
- reduced motion preserves feedback

## 23. Long-session acceptance

Run multiple automated systems simultaneously for an extended session:

- wheat automation
- expanded corn automation
- poultry automation
- mill operator
- baker
- customer sales
- active contract
- machine cycles

Confirm:

- no negative inventory
- no machine buffer overflow
- no worker cargo overflow
- no duplicated output
- no stuck worker with valid work available
- no runaway event listeners
- no unbounded particles
- no repeated console warnings
- customer patience continues working
- autosave continues working

## 24. Build and PR safety

Before finishing:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
```

Confirm:

- Vite base remains `/hurry-go-round/`
- no `/carry-and-thrive/` reference
- no absolute local paths
- no `dist/` committed
- no `node_modules/` committed
- CI and Pages workflows are not recreated
- AGENTS.md is not recreated
- previous specification files are not recreated
- implementation is an incremental diff

Suggested PR title:

```text
Add v0.9.0 processing yard, production planning, and value-added goods
```

## 25. Final Codex report

Report:

1. exact latest-main SHA used
2. confirmation that PR #18 baseline was present
3. changed files
4. seven-resource state migration
5. schema-3 migration behavior
6. processing-yard unlock costs
7. machine construction and upgrade costs
8. recipe definitions and final times
9. machine buffer capacities
10. mill-operator and baker parameters
11. routing-policy rules
12. market and contract integration
13. active-cycle save behavior
14. tests added
15. commands run
16. command results
17. desktop checks
18. mobile checks
19. intentional deferrals
20. post-deployment manual checks
