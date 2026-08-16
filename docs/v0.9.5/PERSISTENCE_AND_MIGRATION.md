# v0.9.5 Persistence and Migration

v0.9.5 changes the wheat-field layout and adds wheat-field expansion state. Save compatibility is mandatory.

## 1. Schema version

Bump save schema:

```text
schema 6 → schema 7
```

Final public game version:

```text
0.9.5
```

Keep all migrations from schema 1 through schema 6.

Do not replace migration history with one current-version conversion.

## 2. New persisted state

Add wheat expansion state under land expansion or a dedicated farm-layout state.

Recommended:

```ts
interface PersistedGameSnapshot {
  landExpansion: {
    wheatFieldLevel: 0 | 1 | 2;
    eastCornFieldUnlocked: boolean;
    southChickenCoopUnlocked: boolean;
    cornFieldLevel?: 0 | 1 | 2;
  };
}
```

If a dedicated structure is preferred, use one authoritative owner only.

## 3. Stable wheat crop IDs

v0.9.4 persists wheat crop state using array-derived IDs such as:

```text
wheat-000
wheat-001
...
```

v0.9.5 must use stable layout IDs independent of current array order.

Recommended ID groups:

```text
wheat-west-base-00 ...
wheat-west-exp1-00 ...
wheat-west-exp2-00 ...
wheat-central-base-00 ...
wheat-central-exp1-00 ...
wheat-central-exp2-00 ...
```

The runtime must restore crop state by ID, not by current array index.

## 4. Schema-6 to schema-7 migration

For schema-6 saves:

```text
wheatFieldLevel = 0
```

Map the 30 existing `wheat-000`-style entries to the 30 base nodes in deterministic order.

Recommended mapping:

```text
old 0–14  → west base 0–14
old 15–29 → central base 0–14
```

Preserve for each mapped crop:

```text
state
remainingMs
```

If an old crop entry is missing or invalid, use a safe ready/growing default and emit a migration warning.

New expansion nodes do not exist at level 0 and must not be inserted as active crop snapshots.

## 5. Relocated player and worker positions

The training lodge and upper-left wheat plot change positions.

A schema-6 player may be saved inside a region that becomes a building or obstacle.

Add a pure safe-position normalization:

```ts
normalizePlayerPositionForV095(...)
```

If the stored player position overlaps:

- new training lodge;
- wheat soil boundary that is non-walkable;
- purchase pad geometry;
- other registered obstacle;

move the player to the nearest safe path point.

Do not reset the player to the initial spawn unless no safe nearby point exists.

Worker runtime positions are not authoritative persistent positions. Restore workers at safe role-specific restart points while preserving their carried inventory.

## 6. Wheat worker cargo and training

Preserve:

```text
hired state
level
carried wheat
```

After migration, validate carried amount against the new level capacity.

If a corrupted older save contains more than the new capacity:

- do not delete the excess;
- move the overflow to the wheat worker crate if space exists;
- otherwise move overflow to barn wheat;
- record a migration warning.

Normal valid v0.9.4 saves should require no repair.

## 7. Wheat crate capacity migration

Wheat worker crate capacity becomes derived from wheat-field level:

```text
level 0 → 16
level 1 → 24
level 2 → 32
```

Do not persist an independently mutable wheat crate capacity if it can be derived.

If existing crate content exceeds the derived capacity due to invalid data:

- keep up to capacity in crate;
- move excess to barn wheat;
- preserve total wheat;
- report a warning.

## 8. Processing and collection state

The processing and collection interaction redesign should not require resetting existing construction or inventory state.

Preserve exactly:

```text
processing yard built
mill built and level
bakery built and level
machine input/output
active cycles
reserved inputs
processing workers
collection hub built
local boxes built
local box contents
processing intake
courier state
routing mode
```

World pad positions, guide markers, open modal state, and temporary result messages are presentation/runtime state and must not be saved.

## 9. Panel state

Do not persist whether a modal panel is open.

Optional settings that may be persisted:

```text
last selected processing tab
last selected collection tab
compact management layout preference
```

These are not required for v0.9.5.

## 10. Save normalization

Continue using the v0.9.4 save normalization and validation pipeline.

All runtime time values must be finite, non-negative, and normalized according to their field contract.

Do not regress:

- primary/backup rotation;
- localStorage fallback;
- save coordinator;
- emergency save;
- checksum verification;
- post-write validation;
- save E2E.

## 11. Snapshot creation

`GameScene.getPersistedSnapshot()` must use stable wheat IDs from the centralized layout.

Do not generate crop IDs with:

```ts
`wheat-${index}`
```

The snapshot must include only active nodes for the purchased wheat-field level or include an explicit inactive flag. Prefer active nodes only.

## 12. Validation

Validate:

- wheatFieldLevel is 0, 1, or 2;
- active wheat crop IDs match the allowed node set for the level;
- no duplicate crop IDs;
- every crop time is finite and non-negative;
- crate content is non-negative and within derived capacity;
- worker cargo is within level capacity after normalization;
- resource totals are preserved through migration;
- processing/collection state remains valid.

## 13. Migration tests

Add fixtures and tests for:

### Schema 6 basic migration

- level defaults to 0;
- all 30 crop states map correctly;
- player safe position preserved or minimally adjusted;
- wheat totals preserved;
- save checksum regenerated.

### Schema 6 active processing

- active mill cycle preserved;
- active bakery cycle preserved;
- output buffers preserved;
- no duplicate products.

### Schema 6 collection network

- built box states preserved;
- box contents preserved;
- courier load/stage preserved safely;
- routing mode preserved.

### Schema 7 expanded wheat

- level 1 save/reload restores 42 nodes;
- level 2 save/reload restores 54 nodes;
- crate capacities derive correctly;
- expansion nodes retain growth state.

## 14. Browser save acceptance

For each phase, run a save/reload E2E.

### Phase 1

Save after:

- moving the player near the relocated field;
- buying wheat expansion level 1;
- training wheat worker to Lv2;
- worker carrying a partial batch;
- crate containing wheat.

Reload and verify all state.

### Phase 2

Save after:

- yard built;
- mill built;
- bakery built;
- non-empty input/output;
- active production cycle.

Reload and verify all state.

### Phase 3

Save after:

- hub built;
- all three local boxes built;
- changed routing mode;
- courier hired/trained;
- non-empty box and courier cargo.

Reload and verify all state.
