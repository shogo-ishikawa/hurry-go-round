# v0.9.5 Final Acceptance and Release Gates

This document is the authoritative release gate for v0.9.5.

A phase is not complete because TypeScript compiles, unit tests pass, or a pure function exists. The corresponding player flow must be usable in Chromium and on GitHub Pages.

## 1. Required command gate

Every phase must run:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
npm run e2e
```

All commands must succeed.

The E2E workflow must run on:

```text
pull_request
push to main
workflow_dispatch
```

Do not merge a phase with a failing, skipped, or missing required E2E check.

A local inability to download Chromium is not evidence that E2E passes. In that case, the pull request must remain unmerged until GitHub Actions completes successfully.

## 2. Phase isolation

Implement and merge in this order:

```text
Phase 1 — Wheat Workforce & Farm Layout
Phase 2 — Processing Construction & Material Flow
Phase 3 — Collection Discoverability & Management UI
```

Each phase must:

1. start from the latest main after the prior phase;
2. use a new Codex task and new branch;
3. produce a focused PR;
4. pass required checks;
5. be manually verified on Pages;
6. be merged before the next phase starts.

Do not implement all three phases in one PR.

## 3. Phase 1 acceptance — wheat worker

### Required runtime behavior

With sufficient ready wheat:

```text
Lv1 harvest worker:
harvests up to 4 before returning

Lv2 harvest worker:
harvests up to 7 before returning

Lv3 harvest worker:
harvests up to 10 before returning
```

A trained worker must also show the configured movement and operation-speed improvements.

### Required trip behavior

For every return-to-crate trip:

- worker cargo is greater than zero before the trip starts;
- the worker reaches the registered crate waypoint;
- at least one wheat is deposited, or the crate is visibly full;
- the logical batch transfer occurs once;
- the worker does not make empty trips;
- the worker does not repeatedly enter and leave the crate without state change.

### Required deposit behavior

A crate visit with cargo must produce one batch result:

```text
full batch deposited
partial batch deposited because space is limited
crate full; cargo retained
```

The visible message must report the transferred amount.

### Training comparison

The browser test or deterministic instrumentation must show that Lv2 and Lv3 are materially faster than Lv1 in a controlled ready-field scenario.

At minimum, compare:

- harvested count over a fixed simulated interval;
- average wheat per crate trip;
- number of empty trips, which must be zero;
- number of logical batch deposits.

## 4. Phase 1 acceptance — layout

The new layout must satisfy all of the following:

- training lodge occupies the former upper-left wheat area;
- the lodge does not overlap wheat, pond, paths, or other facilities;
- west wheat field occupies the former lodge/open western area;
- central wheat field remains accessible;
- both fields are connected by a readable farm route;
- wheat worker can reach every active node at every expansion level;
- player can reach the lodge entrance using keyboard, joystick, click, tap, and drag;
- no field or facility is outside camera/world bounds;
- no sign blocks a route or interaction pad.

### Wheat expansion

Verify:

```text
Level 0: 30 active nodes, crate capacity 16
Level 1: 42 active nodes, crate capacity 24
Level 2: 54 active nodes, crate capacity 32
```

Purchases must deduct exactly:

```text
220 coins
520 coins
```

Maximum level must not charge coins.

### Phase 1 save test

Save and reload with:

- wheat field at level 1 and level 2;
- a mix of ready/growing/harvested nodes;
- trained wheat worker;
- partial worker cargo;
- non-empty wheat crate;
- player near the relocated lodge or field.

All state must restore without duplicating or losing wheat.

## 5. Phase 2 acceptance — processing construction

A new player with required unlocks and coins must be able to understand the full construction chain from the world presentation alone.

### Processing yard

Before purchase, verify:

- planned yard is visible;
- purchase pad is visible;
- cost is visible;
- east-field requirement is visible;
- chicken-coop requirement is visible;
- missing coin amount is visible;
- the displayed pad matches the logical radius.

After purchase:

- yard gate opens or construction presentation changes;
- mill foundation becomes active;
- bakery foundation remains visible;
- state is priority-saved.

### Grain mill

Before construction:

- foundation and exact cost are visible;
- input and output sides are distinguishable;
- build pad matches logical radius.

After construction:

- mill machine is visible;
- input storage remains visible when empty;
- output storage remains visible when empty;
- management status is readable.

### Bakery

Before mill construction:

- bakery foundation is visible but locked;
- reason is shown.

After mill construction:

- exact 850-coin cost is shown;
- build pad is active;
- construction succeeds once;
- no double charge is possible.

## 6. Phase 2 acceptance — material flow

### Mill input

Start with player cargo containing wheat and corn.

Verify:

- input station highlights;
- item transfer animation is visible;
- cargo decreases one at a time;
- mill input increases one at a time;
- both resources transfer fairly;
- station stops with an explicit reason when full or no allowed input remains.

### Mill output

Produce flour and cornmeal.

Verify:

- finished goods appear physically at output storage;
- output quantities match machine state;
- output station remains discoverable when empty;
- player can collect both resources;
- cargo-full condition is shown explicitly.

### Bakery input/output

Repeat the same checks for:

```text
flour
cornmeal
egg
bread
cornbread
```

### Processing panel

Using mouse, touch, and keyboard:

- open the panel;
- change mill mode;
- change bakery mode;
- see the changed mode without panel closure;
- see construction and prerequisite states;
- use every guide button;
- return to the correct world station.

### Phase 2 save test

Save and reload with:

- yard, mill, and bakery built;
- non-empty mill input;
- active mill cycle;
- non-empty mill output;
- non-empty bakery input;
- active bakery cycle;
- non-empty bakery output;
- selected machine modes.

No input, reserved material, or output may be duplicated or lost.

## 7. Phase 3 acceptance — collection discovery

### Unbuilt state

Verify planned objects exist for:

- collection hub;
- wheat collection box;
- corn collection box when east field is unlocked;
- egg collection box when chicken coop is unlocked.

Each planned object must show:

- resource/facility identity;
- cost;
- prerequisite state;
- build pad;
- guide target.

No construction interaction may be invisible.

### Built state

After construction:

- each box has distinct resource art;
- live quantity is visible;
- deposit and withdraw sides are understandable;
- courier pickup remains distinct;
- wheat worker crate and wheat collection box cannot be confused.

## 8. Phase 3 acceptance — collection panel

### Mouse

All enabled controls must respond to one click.

### Touch

All enabled controls must respond to one tap at 390×844 and 320×568.

### Keyboard

Controls must be focusable and activatable with Enter or Space.

### Required actions

Verify:

- hub construction, where available;
- local box construction, where available;
- courier hire;
- courier training;
- explicit routing-mode selection;
- emergency transfer for wheat;
- emergency transfer for corn;
- emergency transfer for eggs;
- facility guide actions;
- close and reopen panel.

After every action:

- panel stays open unless navigation was intentionally selected;
- state refreshes;
- wallet changes are visible;
- success/failure message is visible;
- one action causes one state transition;
- no duplicate listeners or double charge occurs.

## 9. Cross-system resource invariants

Run deterministic and browser checks for the following.

### Wheat

```text
player cargo
+ wheat worker cargo
+ wheat worker crate
+ wheat transport cargo
+ wheat collection box
+ collection courier cargo attributable to wheat
+ processing intake wheat
+ mill input wheat
+ active-cycle reserved wheat
+ barn wheat
+ market wheat
+ contract-delivered wheat
```

Changes only through:

- harvest +1;
- sale/contract consumption according to defined transaction;
- processing conversion according to recipe.

Transfers conserve total wheat.

### Other resources

Existing corn, egg, flour, cornmeal, bread, cornbread, hay, milk, butter, and cheese invariants must continue to pass.

## 10. Responsive acceptance

Required viewports:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

Verify:

- processing panel fits or scrolls;
- collection panel fits or scrolls;
- buttons remain at least 44 CSS pixels high;
- no button is behind the backdrop;
- no important world prompt is under the joystick;
- construction labels do not clip;
- guide buttons work;
- no HUD region triggers world movement.

## 11. Long-run acceptance

Run at least a 30-minute-equivalent deterministic simulation or accelerated browser scenario with:

- Lv3 wheat workers;
- maximum wheat field;
- mill and bakery active;
- all three collection boxes built;
- courier active;
- customers active;
- contracts active where practical;
- dairy runtime active.

Verify:

- no negative inventory;
- no duplicated inventory;
- no permanently stuck worker caused by the new layout;
- no runaway event listeners;
- no unbounded temporary objects;
- no repeated console errors;
- no silent machine/collection deadlock;
- save and reload remains valid afterward.

## 12. GitHub Pages manual release gate

After every phase merge, wait for:

```text
CI success
E2E Chromium success
Deploy GitHub Pages success
```

Then perform the phase-specific scenario on the deployed Pages URL.

Do not begin the next phase until the prior phase works on Pages.

## 13. Final release checklist

Before declaring v0.9.5 complete:

- package version is 0.9.5;
- save schema is 7;
- title and HUD show v0.9.5;
- README matches implemented behavior;
- all three phase PRs are merged;
- all required checks are green;
- Pages manual acceptance is complete on desktop and smartphone;
- no known release-blocking issue remains;
- v0.9.4 saves migrate successfully;
- JSON export/import remains functional;
- GitHub Pages base remains `/hurry-go-round/`;
- no `carry-and-thrive` path is present.
