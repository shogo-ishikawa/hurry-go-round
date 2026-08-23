# v0.9.7 Persistence & Migration

## 1. Schema policy

```text
Phase 1: schema 8
Phase 2: schema 8
Phase 3: schema 9
```

Only the wheat topology change requires a schema bump.

Inventory-panel state, processing-panel state, batch animations, and interaction-arm flags are temporary runtime state and must not be persisted.

## 2. Schema-9 purpose

Schema 9 replaces the split wheat-node namespace:

```text
wheat-west-*
wheat-central-*
```

with one unified namespace:

```text
wheat-main-*
```

The migration must preserve every saved crop's logical state.

## 3. Deterministic ID mapping

Use an explicit mapping function. Do not depend on object iteration order or current array position.

### Base nodes

```text
wheat-west-base-00 ... 14
→
wheat-main-base-00 ... 14

wheat-central-base-00 ... 14
→
wheat-main-base-15 ... 29
```

### Expansion 1

```text
wheat-west-exp1-00 ... 05
→
wheat-main-exp1-00 ... 05

wheat-central-exp1-00 ... 05
→
wheat-main-exp1-06 ... 11
```

### Expansion 2

```text
wheat-west-exp2-00 ... 05
→
wheat-main-exp2-00 ... 05

wheat-central-exp2-00 ... 05
→
wheat-main-exp2-06 ... 11
```

The mapping is one-to-one and covers all 54 possible schema-8 nodes.

## 4. Crop-state preservation

For every mapped node preserve:

```text
resource
state
remainingMs
```

Normalize only invalid duration values using the existing duration normalizer.

Do not reset growing crops to ready.

Do not regenerate crop state from the current field level when a valid saved crop exists.

## 5. Missing and duplicate crop records

### Missing expected node

If a schema-8 save omits an active node:

- create the new mapped node in the ready state;
- use `remainingMs = 0`;
- log one bounded migration warning in development;
- continue loading.

### Duplicate old ID

If the input contains duplicate records for the same old ID:

- keep the first valid record deterministically;
- ignore later duplicates;
- do not create duplicate new IDs.

### Unknown wheat ID

If an unknown `wheat-*` ID is encountered:

- do not map it into an arbitrary active node;
- omit it with one bounded migration warning;
- continue loading valid records.

## 6. Field level and node activation

Preserve:

```text
landExpansion.wheatFieldLevel
```

Rules:

```text
level 0 -> base 30 active
level 1 -> base 30 + exp1 12 active
level 2 -> all 54 active
```

Migrated records above the active level may remain in the snapshot only if the save format intentionally stores inactive node state. Prefer normalizing to the exact active node set used by current runtime.

Do not downgrade field level because a crop record is missing.

## 7. Crate and worker preservation

Preserve exactly:

- wheat production crate amount;
- derived crate capacity for field level;
- harvest-worker hired state;
- harvest-worker level;
- harvest-worker carried wheat;
- transport-worker hired state;
- transport-worker level;
- transport-worker carried wheat.

After load, restart runtime tasks using the existing restart policy.

Do not persist obsolete cluster selection or waypoint state.

## 8. Other v0.9.6 state

Preserve unchanged:

- player position, subject to safe relocation if it lies inside removed geometry;
- cargo and capacity;
- warehouse;
- market and capacities;
- wallet and till;
- corn land and corn nodes;
- chicken-coop level and egg timer;
- all workers;
- processing state and active cycles;
- collection network and courier;
- dairy state and active cycle;
- contracts, offer IDs, active progress, generator state, and statistics;
- settings;
- play time;
- save sequence.

## 9. Player-position normalization

The old west field is removed and the unified field changes terrain geometry.

If a restored player position lies:

- inside an active crop node;
- inside a new fence;
- inside a removed or moved obstacle;

move the player to the nearest registered safe waypoint.

Preferred safe waypoint:

```text
unified wheat-field entrance
```

This correction must not modify inventory or progression.

## 10. Version metadata

Schema-9 save envelopes must use:

```text
format: hurry-go-round-save
schemaVersion: 9
gameVersion: 0.9.7
```

The migration must accept supported older schemas through the existing migration chain.

## 11. Checksum and backup behavior

Do not change:

- SHA-256 checksum behavior;
- primary/backup rotation;
- IndexedDB repository;
- localStorage fallback;
- emergency save;
- JSON export/import.

Migration occurs after envelope integrity validation and before current-schema snapshot validation.

## 12. Migration tests

Add fixture tests for:

- all 54 old IDs mapping exactly once;
- base-only save;
- first-expansion save;
- maximum-expansion save;
- ready/growing/harvested preservation;
- fractional duration normalization;
- missing records;
- duplicate records;
- unknown ID handling;
- nonzero crate;
- worker carried wheat;
- player safe relocation;
- active processing cycle;
- active dairy cycle;
- active contract;
- collection courier mid-route.

## 13. Browser migration E2E

Import or inject a real schema-8 save envelope through the supported save-loading path.

Verify:

1. `つづきから` appears.
2. Load succeeds without fallback reset.
3. Field level is preserved.
4. Exactly 30 / 42 / 54 unified nodes exist.
5. Selected crop states and timers match fixtures.
6. Crate quantity is preserved.
7. Worker level and cargo are preserved.
8. Other major systems remain intact.
9. Saving again produces schema 9 and game version 0.9.7.
10. Reloading the schema-9 save is idempotent.

## 14. Rollback safety

Do not overwrite the last valid backup with an invalid migrated snapshot.

Required order:

```text
read old envelope
validate integrity
migrate in memory
validate schema-9 snapshot
write new primary
read back and validate
rotate backup according to existing policy
```

If migration fails, retain the old valid save and expose a recoverable error or JSON export path.
