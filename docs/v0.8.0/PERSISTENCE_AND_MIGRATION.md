# v0.8.0 — Persistence and Save Migration

## 1. Goal

v0.8.0 must remain fully compatible with valid v0.7.0 local saves and exported JSON files.

The current v0.7.0 persistence schema is schema version 1 and game version 0.7.0.

v0.8.0 adds:

- worker training levels;
- authoritative worker role definitions;
- operations UI preferences;
- safe recovery rules for visible expanded-area workers;
- new progression and diagnostics state.

This requires a real schema migration.

## 2. Save version

Update:

```ts
SAVE_SCHEMA_VERSION = 2
GAME_VERSION = "0.8.0"
```

Do not invalidate schema-1 saves.

`migrateSaveEnvelope` must no longer merely validate a cloned schema-1 envelope against the newest schema.

It must:

1. identify schema version 1;
2. validate enough of the v1 structure to migrate safely;
3. produce a valid v2 payload;
4. preserve all existing v1 game progress;
5. create a v2 envelope with a new checksum;
6. return structured migration warnings when defaults were inserted.

## 3. Schema-2 additions

Recommended persistent additions:

```ts
interface PersistedWorkerProgressV2 {
  hired: boolean;
  level: 0 | 1 | 2 | 3;
  carriedResource: "wheat" | "corn" | "egg" | null;
  carriedAmount: number;
}

interface PersistedOperationsStateV2 {
  lastSelectedFacilityId: string | null;
  compactAutomationHud: boolean;
  completedInteractionTutorials: string[];
}

interface PersistedGameSnapshotV2 {
  // all canonical v1 data
  workers: {
    wheatHarvester: PersistedWorkerProgressV2;
    wheatTransporter: PersistedWorkerProgressV2;
    cornHarvester: PersistedWorkerProgressV2;
    cornTransporter: PersistedWorkerProgressV2;
    poultryCaretaker: PersistedWorkerProgressV2;
  };
  operations: PersistedOperationsStateV2;
}
```

The exact structure may differ, but all worker roles must have explicit levels.

## 4. v1 → v2 worker migration

For every v1 worker:

```text
hired = false
→ level = 0

hired = true
→ level = 1
```

Preserve existing carried amounts.

Resource mapping:

```text
wheat harvest worker:
carriedResource = wheat when carried > 0

wheat transport worker:
carriedResource = wheat when carried > 0

corn harvest worker:
carriedResource = corn when carried > 0

corn transport worker:
carriedResource = corn when carried > 0

poultry caretaker:
preserve existing corn / egg / null value
```

If an invalid v1 combination exists, migration must repair conservatively and report a warning.

Examples:

```text
not hired but carrying 4 corn
→ preserve resource by returning it to the appropriate safe storage during hydration
→ worker remains not hired

caretaker resource null but carried > 0
→ migration warning
→ restore to a safe resource based on validated context, or return to barn without duplication
```

No resource may be silently deleted or duplicated.

## 5. Canonical state and runtime state

Persist only canonical data.

Do not save:

- current sign placement;
- sign LOD state;
- current hire progress;
- current training progress;
- focused interaction;
- facility locator marker position;
- current worker target crop;
- current waypoint index;
- tweens;
- runtime event listeners;
- open notification animation;
- current operations-panel scroll position.

Those values are reconstructed after load.

May be persisted:

- last selected facility ID as a UI preference;
- completed first-use tutorials;
- compact HUD preference.

## 6. Worker safe-resume rules

After loading, workers resume from safe authored points rather than arbitrary serialized runtime positions.

### 6.1 Wheat harvester

```text
carried wheat > 0
→ spawn at wheat crate approach
→ resume returning/depositing

carried wheat = 0
→ spawn at wheat worker home
→ resume seeking crop
```

### 6.2 Wheat transporter

```text
carried wheat > 0
→ spawn at barn-route safe point
→ resume moving to barn

carried wheat = 0
→ spawn at wheat crate wait point
→ resume waiting/loading
```

### 6.3 Corn harvester

```text
carried corn > 0
→ spawn at corn crate approach
→ resume returning/depositing

carried corn = 0
→ spawn at corn worker home
→ resume seeking crop
```

### 6.4 Corn transporter

```text
carried corn > 0
→ spawn at safe corn-to-barn route point
→ resume moving to barn

carried corn = 0
→ spawn at corn crate wait point
→ resume waiting/loading
```

### 6.5 Poultry caretaker

```text
carried corn > 0
→ spawn at coop approach
→ resume moving to trough

carried eggs > 0
→ spawn at barn approach
→ resume moving to barn

carried amount = 0
→ spawn at caretaker wait point
→ resume evaluating
```

The exact safe coordinates must come from centralized route definitions.

## 7. Resource invariants during load

Before and after hydration, verify resource totals.

### Wheat

```text
player cargo wheat
+ wheat field crate
+ wheat harvester cargo
+ wheat transporter cargo
+ barn wheat
+ market wheat
+ active contract delivered wheat
```

### Corn

```text
player cargo corn
+ corn field crate
+ corn harvester cargo
+ corn transporter cargo
+ caretaker corn cargo
+ barn corn
+ market corn
+ feed trough corn
+ active contract delivered corn
```

### Eggs

```text
player cargo eggs
+ egg storage
+ caretaker egg cargo
+ barn eggs
+ market eggs
+ active contract delivered eggs
```

Migration and hydration must not change totals except for an explicitly documented repair that moves an invalid carried resource into safe storage.

A repair changes location, not total amount.

## 8. Interaction and sign persistence

Do not persist computed sign positions.

On load:

1. restore canonical game state;
2. build the facility registry;
3. build interaction availability;
4. compute sign layout from the current unlocked facilities;
5. create signs and pads;
6. spawn hired workers;
7. restore operations UI state;
8. begin simulation.

This guarantees that future layout fixes apply to old saves.

## 9. Priority-save triggers

Request a priority autosave after:

- worker hire;
- worker training;
- land purchase;
- upgrade purchase;
- contract acceptance;
- contract completion;
- contract cancellation;
- imported save application;
- operations-setting change.

A successful worker hire must not be lost if the page closes immediately afterward.

## 10. Save status and transaction ordering

For hire and training:

1. validate availability;
2. produce new game state through pure logic;
3. apply new state;
4. spawn or update worker runtime entity;
5. request priority save;
6. show success feedback.

If persistence fails:

- do not roll back the in-memory hire automatically;
- show a clear save-error message;
- keep the dirty state;
- allow manual retry;
- preserve backup behavior.

## 11. JSON export/import

v0.8.0 export creates schema-2 data.

Import must accept:

- valid schema-2 data;
- valid schema-1 v0.7.0 data through migration.

Import preview must show:

- save date;
- game version;
- wallet coins;
- reputation;
- land unlocks;
- active contract;
- hired worker count;
- trained worker count;
- maximum worker level.

After import and migration:

- write a new v2 primary save;
- preserve the previous valid primary as backup;
- rebuild signs and interactions;
- spawn workers safely;
- do not retain the import file’s transient runtime state.

## 12. Backward compatibility tests

Maintain a committed schema-1 fixture representing a realistic v0.7.0 farm.

The fixture should include:

- mixed cargo;
- east field unlocked;
- coop unlocked;
- hired wheat workers;
- hired corn harvester;
- hired caretaker carrying eggs;
- active contract;
- reputation;
- crops in mixed growth states.

Test migration to v2.

Required assertions:

- all resources preserved;
- contracts preserved;
- reputation preserved;
- land preserved;
- hired workers become level 1;
- non-hired workers become level 0;
- caretaker resource preserved;
- sign placement is not read from the save;
- save validates after migration;
- new checksum validates;
- migrated save may be exported and re-imported.

## 13. Invalid-state repair tests

Test at least:

- not-hired worker with cargo;
- worker amount above new level capacity;
- invalid caretaker resource;
- missing operations state;
- unknown facility locator ID;
- worker level outside 0–3;
- negative worker carried amount;
- schema version newer than supported.

Repairs must be conservative and deterministic.

Unsupported newer schema must remain rejected with Japanese user-facing guidance.

## 14. Persistence implementation constraints

- continue using native IndexedDB;
- no external persistence library;
- do not rename the existing database unnecessarily;
- do not discard the v0.7.0 primary/backup rotation;
- preserve SHA-256 integrity checking;
- preserve the 2 MiB import limit unless a demonstrated need requires change;
- keep migrations pure where possible;
- do not access Phaser from migration code;
- update persistence documentation and tests.
