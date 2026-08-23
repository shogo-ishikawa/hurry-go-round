# v0.9.6 Persistence and Migration

## 1. Schema

```text
schema 7 -> schema 8
```

The schema bump is required for chicken-coop progression and authoritative egg-production timing.

## 2. New persisted livestock fields

Persist:

```ts
interface PersistedLivestockV8 {
  coopLevel: 0 | 1 | 2 | 3;
  feed: number;
  feedCapacity: number;
  eggs: number;
  eggCapacity: number;
  eggRemainingMs: number;
}
```

Derive and validate capacities from the level:

| Level | Feed capacity | Egg capacity |
|---|---:|---:|
| 0 | existing locked/default-safe value | existing locked/default-safe value |
| 1 | 12 | 12 |
| 2 | 18 | 18 |
| 3 | 24 | 24 |

Do not trust an imported capacity that contradicts the normalized level. Clamp stored quantities to valid nonnegative integers and preserve as much state as possible.

## 3. Schema-7 migration

For a schema-7 save:

```text
southChickenCoopUnlocked = false -> coopLevel 0
southChickenCoopUnlocked = true  -> coopLevel 1
```

Preserve:

- feed;
- eggs;
- all worker levels;
- worker cargo;
- wheat and corn expansion;
- corn field crate;
- contracts;
- processing;
- collection network;
- dairy;
- economy;
- player position;
- crop states.

Normalize:

```text
eggRemainingMs
```

Use the saved value if valid. If missing or invalid, use the level's full production interval.

## 4. Worker-level preservation

Migration and load adapters must never call a helper that resets a hired worker to level 1.

For every farm worker:

```text
hired
level
carried resource
carried amount
```

must round-trip unchanged, except for safe capacity clamping.

## 5. Contract compatibility

Preserve:

- offer IDs and sequences;
- offer requirements;
- active contract;
- delivered progress;
- generator seed;
- next sequence;
- reputation;
- statistics;
- delivery cursor.

Normalize an obsolete positive decline cooldown to zero during migration/load so old saves cannot remain permanently unable to decline offers.

Do not regenerate offers during migration.

## 6. Runtime-only state

Do not persist:

- purchase hold progress;
- input armed flags;
- temporary notification cooldowns;
- open panels;
- selected UI tab;
- focused buttons;
- hover state;
- destination guide markers;
- transfer animation;
- temporary command-result banners.

## 7. Snapshot source of truth

`GameScene.getPersistedSnapshot(...)` must pass the actual remaining egg-production time from `ExpansionSystem` or a state-owned timer.

Do not use a fixed fallback for every normal save.

Preferred architecture:

- move egg cycle progress into authoritative `GameState.livestock`, or
- expose a runtime snapshot method from `ExpansionSystem` and restore it explicitly.

The timer must not restart at a full interval on every save/load.

## 8. Validation

Schema-8 validation must distinguish:

```text
counts and levels: finite nonnegative integers
timers: finite nonnegative numbers normalized to integer milliseconds
```

Validate:

- coop level range;
- capacities consistent with level;
- feed and egg quantities within capacity;
- worker level range;
- cargo and warehouse resource shapes;
- contract resource shapes;
- all existing processing, collection, and dairy invariants.

## 9. Save/reload acceptance

Save and reload with:

- every farm worker at Lv3;
- wheat field level 2;
- corn field level 2;
- non-empty wheat and corn crates;
- coop level 3;
- partial feed and egg storage;
- egg cycle halfway complete;
- mixed processed and dairy cargo;
- declined/replaced contract offers;
- active mixed contract with partial delivery.

All values must restore exactly once.

## 10. JSON import/export

JSON export/import must:

- identify game version `0.9.6`;
- identify schema `8`;
- migrate schema 7 during import;
- preview coop level/chicken count where practical;
- reject malformed level/timer values with a clear reason;
- keep primary and backup recovery behavior.

## 11. Migration tests

Required tests:

- locked schema-7 coop -> level 0;
- unlocked schema-7 coop -> level 1;
- worker Lv3 remains Lv3;
- feed/eggs preserved within normalized capacities;
- missing egg timer gets safe default;
- valid egg timer is preserved;
- positive legacy decline cooldown becomes zero;
- contract IDs and progress remain unchanged;
- schema-8 round trip;
- JSON import/export round trip.