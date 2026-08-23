# Phase 3 — Unified Wheat Field & Final Release

Phase 3 removes the remote wheat plot and turns wheat production into one contiguous field that expands outward in place.

This phase changes persisted crop topology and therefore performs the final version and schema update.

## 1. Phase scope

Implement:

- one authoritative wheat-field rectangle;
- one field entrance;
- 30 / 42 / 54 nodes in one contiguous grid;
- two adjacent visual expansion strips;
- one worker search domain;
- deterministic schema-8 to schema-9 crop-ID migration;
- terrain, fence, sign, route, collection, and E2E updates;
- final public version 0.9.7.

Do not add:

- new wheat products;
- irrigation;
- weather;
- seasons;
- field-quality statistics;
- additional workers;
- another currency.

## 2. Design objective

The wheat production line must read as one place:

```text
one field
one entrance
one expansion pad
one production crate
one collection box
one worker route
```

The player must not need to cross the farm to inspect a second wheat plot.

## 3. Authoritative layout

Replace:

```ts
FARM_LAYOUT.wheatFields.west
FARM_LAYOUT.wheatFields.central
```

with one definition equivalent to:

```ts
FARM_LAYOUT.wheatField = {
  bounds: { x, y, width, height },
  baseBounds: { ... },
  expansion1Bounds: { ... },
  expansion2Bounds: { ... },
  entry: { x, y },
  crate: { ... },
  collectionBox: { ... },
  expansionPad: { ... },
  sign: { ... },
};
```

Use one source for:

- soil geometry;
- active fence geometry;
- crop-node positions;
- worker field entry;
- crate and collection interactions;
- expansion presentation;
- guide destinations;
- overlap tests;
- E2E diagnostics.

Do not duplicate the coordinates in terrain, worker routes, GameScene, or tests.

## 4. Recommended placement

Use the existing central wheat-production area and the contiguous free space around it. Remove the remote west plot.

Recommended unified bounds:

```text
x = 650

y = 890
width = 760
height = 390
```

Recommended node grid:

```text
9 columns x 6 rows = 54 possible nodes
horizontal spacing: approximately 72
vertical spacing: approximately 50
```

Recommended expansion structure:

```text
base:
5 columns x 6 rows = 30 nodes

expansion 1:
next 2 columns x 6 rows = 12 nodes

expansion 2:
final 2 columns x 6 rows = 12 nodes
```

The exact coordinates may be adjusted after overlap validation, but the final result must remain one contiguous rectangle near the existing crate and processing route.

The final field must not overlap:

- training lodge;
- pond;
- barn platform;
- contract board or contract dock;
- market queue;
- chicken coop;
- processing yard;
- collection hub;
- required roads;
- player spawn;
- worker home.

## 5. Visual expansion

At level 0:

```text
30 active nodes
base soil visible
expansion strips shown as muted adjacent planned land
crate capacity 16
```

At level 1:

```text
42 active nodes
first adjacent strip becomes active soil
fence extends around the larger field
crate capacity 24
```

At level 2:

```text
54 active nodes
second adjacent strip becomes active soil
final fence encloses the entire field
crate capacity 32
```

The expansion must look like the same field growing, not a new disconnected plot appearing elsewhere.

## 6. Removed west plot

Remove from the old west location:

- soil plot;
- furrows;
- wheat nodes;
- wheat fence;
- field-entry waypoint;
- wheat-specific sign or markers.

Restore the area as ordinary farm grass and paths.

Do not add a new gameplay system in the vacated area during v0.9.7.

It may remain visually clean and available for a future garden, trader, orchard, or decoration expansion.

## 7. Unified wheat-node IDs

Introduce stable IDs:

```text
wheat-main-base-00 ... wheat-main-base-29
wheat-main-exp1-00 ... wheat-main-exp1-11
wheat-main-exp2-00 ... wheat-main-exp2-11
```

Every active node must have:

- unique stable ID;
- expansion level;
- grid row;
- grid column;
- position;
- one field identifier.

Conceptual definition:

```ts
interface WheatNodeDefinition {
  id: string;
  field: "main";
  expansionLevel: 0 | 1 | 2;
  row: number;
  column: number;
  x: number;
  y: number;
}
```

Remove `west | central` from new domain logic after migration.

## 8. Worker routing simplification

Replace cluster routing:

```text
select west/central cluster
move to cluster entry
search within cluster
switch cluster
```

with:

```text
move to one field entry
select nearest ready node in unified field
harvest nearest ready nodes until trained capacity
return once to crate
batch deposit
repeat
```

The harvester must not re-enter the field between adjacent crops.

Remove or replace:

```text
activeCluster
clusterEmptyElapsed
fieldEntries[2]
west/central cluster diagnostics
```

A short no-ready-crop grace period may remain before returning with a partial load.

## 9. Worker behavior by level

Preserve current trained capacities and timing:

```text
Lv1: 4 wheat
Lv2: 7 wheat
Lv3: 10 wheat
```

The unified field must not regress:

- batch sizes;
- movement-speed bonuses;
- harvest-time bonuses;
- crate-full waiting;
- partial deposit behavior;
- empty-trip prevention;
- save restoration.

The expected result is more efficient than the two-field layout because no cluster switch is needed.

## 10. Player and transport routes

Keep the production crate, logistics collection box, and expansion pad along the field's northern or western edge so they are accessible from the main farm loop.

Required separation:

```text
wheat production crate
!=
wheat logistics collection box
```

Their art, names, and interaction zones must remain distinct.

The transport-worker route from crate to barn must not cross active crop nodes.

The player must be able to reach:

- every crop;
- production crate;
- collection box;
- expansion pad;
- field sign;

with keyboard, joystick, drag, click, and tap movement.

## 11. Expansion transaction

Preserve current values:

```text
Level 0 -> 1
220 coins
30 -> 42 nodes
crate 16 -> 24

Level 1 -> 2
520 coins
42 -> 54 nodes
crate 24 -> 32
```

Preserve interaction support:

- standing hold;
- `E`;
- `Space`;
- click;
- tap.

One action must charge once.

Remaining on the pad must not trigger the next expansion without rearming.

## 12. Terrain and decoration cleanup

Update `createFarmWorld(...)` to consume the unified layout.

Required:

- one soil rectangle or staged adjacent rectangles;
- one coherent furrow grid;
- one coherent fence;
- no old west soil remnants;
- no tree, flower, path marker, or pond overlapping active field space;
- no invisible collision from removed geometry.

Move nonessential decoration if required.

Do not hard-code old fence endpoints.

## 13. Save schema 9

Set:

```text
SAVE_SCHEMA_VERSION = 9
GAME_VERSION = 0.9.7
package version = 0.9.7
```

Migration details are defined in `PERSISTENCE_AND_MIGRATION.md`.

## 14. Unit tests

Add tests for:

- one field only;
- 30 / 42 / 54 node counts;
- one contiguous active rectangle;
- base and expansion strips are adjacent;
- every active node lies inside current field bounds;
- no duplicate node IDs;
- no old west/central IDs after migration;
- no facility overlap;
- one worker entry;
- nearest-ready-node deterministic selection;
- trained batch behavior;
- expansion cost and crate capacity preservation;
- old-to-new crop mapping completeness.

## 15. Browser E2E

### A. Visual field topology

1. Start a new game.
2. Confirm only one wheat field is visible.
3. Confirm no wheat soil or wheat nodes exist at the old west location.
4. Confirm the base field has 30 nodes.
5. Confirm the crate, collection box, expansion pad, and sign are reachable.

### B. Actual expansion flow

1. Provide exact coins.
2. Use the actual expansion pad.
3. Purchase 30 -> 42.
4. Confirm 220 coins deducted once.
5. Confirm the same field expands into the first adjacent strip.
6. Leave and re-enter or explicitly rearm.
7. Purchase 42 -> 54.
8. Confirm 520 coins deducted once.
9. Confirm the same field expands into the second adjacent strip.
10. Confirm no third charge at maximum.

### C. Worker flow

At Lv1, Lv2, and Lv3:

- worker enters one field;
- harvests 4 / 7 / 10;
- does not visit an obsolete west waypoint;
- returns once to crate;
- deposits exact batch;
- produces no empty crate trip.

### D. Migration

Load schema-8 fixtures containing:

- base west growing node;
- base central ready node;
- exp1 west harvested node;
- exp1 central growing node;
- exp2 west ready node;
- exp2 central growing node;
- nonzero crate;
- hired worker with carried wheat.

Confirm exact mapped new IDs, states, timers, crate, and worker state.

### E. Responsive map interaction

Verify the unified field at:

```text
1920 x 1080
844 x 390
390 x 844
320 x 568
```

No required field interaction may be hidden behind a fixed HUD region.

## 16. Final version updates

Update:

- `package.json`;
- `package-lock.json`;
- `GAME_VERSION`;
- title screen;
- HUD version;
- README current-version text;
- release notes section.

Do not create the Git tag or GitHub Release in the Codex task.

Create the tag only after merged Pages acceptance.

## 17. Phase 3 acceptance

Phase 3 is complete when:

```text
All wheat grows in one contiguous field.
Expansion visibly enlarges that same field.
Workers use one efficient route.
Schema-8 saves preserve every crop state after migration.
The public game reports v0.9.7 and schema 9.
```
