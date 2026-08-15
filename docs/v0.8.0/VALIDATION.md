# v0.8.0 — Validation and Acceptance

## 1. Required commands

Before finishing implementation, run:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
```

The final Codex report must include the exact result of each command.

Do not claim browser or mobile validation that was not actually performed.

## 2. Pull-request safety

Before creating the implementation PR, inspect the complete diff.

The following must not appear as newly added files:

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
tsconfig.json
docs/V0.1.0_SPEC.md
docs/V0.2.0_SPEC.md
docs/V0.3.0_SPEC.md
docs/V0.4.0_SPEC.md
docs/V0.5.0_SPEC.md
docs/V0.6.0_SPEC.md
docs/V0.7.0_SPEC.md
```

If they appear as newly added, the task started from an outdated worktree. Stop without creating a PR.

Do not commit:

```text
dist/
node_modules/
temporary screenshots/
browser profiles/
local logs/
absolute local filesystem paths/
secrets/
```

Preserve:

```text
Vite base: /hurry-go-round/
GitHub Pages workflow
CI workflow
IndexedDB database compatibility
v0.7.0 contract behavior
```

## 3. Mandatory bug-regression tests

These tests are required even if broader systems are refactored.

### 3.1 Carry-capacity sign overlap

Using the actual production facility definitions:

- resolve all signs;
- find the farm-management/carry-upgrade representation;
- assert it does not overlap another sign;
- assert it does not overlap the barn;
- assert it does not overlap the delivery zone;
- assert it does not overlap the contract board;
- assert it does not overlap the contract dock;
- assert it does not overlap the harvest-speed interaction;
- assert the configured minimum gap is maintained;
- assert the carry interaction is reachable.

Test world-space and projected screen-space rectangles.

### 3.2 Corn harvest hire

Starting state:

```text
east field unlocked
corn harvest worker not hired
wallet = 160
```

Assert:

- interaction is visible;
- interaction is reachable;
- availability is true;
- 899 ms hold does not hire;
- 900 ms completion hires exactly once;
- wallet becomes zero;
- worker becomes level 1;
- runtime spawn request is emitted once;
- priority save is requested once.

### 3.3 Corn transport hire

Before corn harvester hire:

- availability false;
- reason is prerequisite-worker-missing;
- no coin deduction.

After corn harvester hire with 240 coins:

- availability true;
- exact 240 deduction;
- worker level 1;
- visible worker spawn;
- priority save.

### 3.4 Poultry caretaker hire

Before coop unlock:

- unavailable with land-locked reason;
- no coin deduction.

After coop unlock with 300 coins:

- visible and reachable;
- exact 300 deduction;
- worker level 1;
- visible caretaker spawn;
- priority save.

### 3.5 Duplicate completion

For every hire action:

- one hold completion may produce at most one purchase;
- repeated update on the same completion frame must not charge again;
- an already-hired worker cannot be hired again;
- on-site and management-panel calls cannot race into two charges.

## 4. Facility-registry tests

Validate every required facility and interaction ID.

Assertions:

- IDs are unique;
- every interaction references an existing facility;
- every public interaction has Japanese title and short label;
- every interaction has positive radius;
- visible and logical bounds are consistent;
- every hire action references a worker role;
- every worker role references one hire interaction;
- every sign group references existing facilities;
- no hard-coded expanded-worker pad exists outside the registry;
- no fixed carry sign is instantiated outside the sign manager.

## 5. Sign-layout tests

Use the actual production sign definitions, not only synthetic rectangles.

Test:

- deterministic output;
- priority ordering;
- minimum 40-unit gap;
- facility avoidance;
- interaction avoidance;
- road-center avoidance;
- route avoidance;
- contract-board avoidance;
- contract-dock avoidance;
- chicken-area avoidance;
- customer-queue avoidance;
- fallback to icon mode;
- no required sign silently missing;
- one full-detail sign per close facility group;
- LOD behavior by distance;
- operation-range detail suppression.

Representative zooms:

```text
1.0
1.25
1.5
1.8
```

Representative viewports:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

## 6. Reachability tests

Each required interaction must be reachable in its valid state.

Test map constraints for:

- original farm management;
- carry upgrade;
- wheat worker hires;
- east land gate purchase;
- corn worker hires;
- corn crate;
- south coop purchase;
- caretaker hire;
- feed trough;
- egg storage;
- operations office;
- contract board;
- contract dock.

For locked states:

- interaction may be hidden or disabled;
- player must not enter locked parcel;
- management panel must show prerequisite.

For unlocked states:

- a walkable point exists inside the interaction radius;
- the point is not inside a building, fence, pond, or mutually exclusive pad;
- click/tap destination may reach it;
- direct movement may reach it.

General pathfinding is not required, but authored gates and rectangles must be sufficient.

## 7. Operations-panel tests

Test pure view-model generation where possible.

Required assertions:

- all five worker cards appear;
- locked cards show prerequisite;
- affordable hire shows exact cost;
- unaffordable hire shows exact missing coins;
- hired card shows level;
- maximum-level card shows maximum state;
- current activity is mapped to Japanese text;
- internal enum values are not exposed;
- facility locator returns a registered target;
- unavailable target does not create an invalid marker;
- panel action and on-site action call the same transaction function;
- panel cannot open when farmer is outside the operations-office radius;
- panel input is reserved from world movement.

## 8. Worker-training tests

For every role:

- level 0 cannot train;
- level 1 → 2 uses exact first cost;
- level 2 → 3 uses exact second cost;
- level 3 cannot train;
- insufficient coins do not change level or wallet;
- successful training changes level once;
- movement multiplier is correct;
- operation interval multiplier is correct;
- capacity is correct;
- unrelated workers and resources remain unchanged;
- priority save requested once.

Capacity tables:

```text
wheat harvester:   4 / 5 / 6
wheat transporter: 6 / 8 / 10
corn harvester:    5 / 6 / 8
corn transporter:  8 / 10 / 12
poultry caretaker: 6 / 8 / 10
```

## 9. Visible-worker integration tests

Test integration boundaries without relying on long real-time waits.

### Corn harvester

- hired persistent state creates one runtime entity;
- not hired creates none;
- ready crop selected;
- player harvesting target first does not duplicate corn;
- worker cargo visible count matches canonical cargo;
- crate full causes waiting state;
- space becoming available resumes deposit;
- crop regrowth resumes work;
- level changes affect parameters.

### Corn transporter

- hired persistent state creates one runtime entity;
- corn crate loads one unit at a time;
- cart cargo matches canonical cargo;
- barn receives one unit per unload;
- route uses authored waypoints;
- corn total conserved;
- return loop continues.

### Poultry caretaker

- emergency feed has priority;
- corn trip carries only corn;
- egg trip carries only eggs;
- barn corn and feed transfer conserve corn;
- egg storage and barn transfer conserve eggs;
- caretaker does not mix resources;
- no task results in waiting state;
- inventory changes resume work;
- level changes affect parameters.

## 10. Resource-invariant tests

### Wheat

Transfers among:

```text
player cargo
wheat crate
wheat harvester
wheat transporter
barn
market
contract delivery
```

must conserve total wheat except harvesting and sale.

### Corn

Transfers among:

```text
player cargo
corn crate
corn harvester
corn transporter
caretaker
barn
market
feed trough
contract delivery
```

must conserve total corn except harvesting, sale, and feed-to-egg conversion.

### Eggs

Transfers among:

```text
player cargo
egg storage
caretaker
barn
market
contract delivery
```

must conserve total eggs except production and sale.

Hire and training transactions must not change resources.

## 11. Persistence and migration tests

Use a realistic committed schema-1 v0.7.0 fixture.

Assert:

- migration produces schema 2;
- checksum validates;
- cargo preserved;
- storage preserved;
- livestock preserved;
- contracts preserved;
- reputation preserved;
- land unlocks preserved;
- hired workers become level 1;
- non-hired workers become level 0;
- carried worker resources preserved;
- operations defaults inserted;
- sign positions not read from save;
- runtime workers spawn after hydration;
- primary/backup behavior remains valid;
- migrated export may be re-imported.

Repair tests:

- not-hired worker with cargo;
- cargo above level capacity;
- invalid caretaker resource;
- negative worker cargo;
- unknown locator target;
- missing operations state;
- level outside 0–3;
- newer unsupported schema.

No repair may duplicate or silently delete resources.

## 12. Autosave tests

Priority save requested after:

- worker hire;
- worker training;
- land purchase;
- upgrade purchase;
- contract acceptance;
- contract completion;
- contract cancellation.

For worker hire/training:

- request occurs after state update;
- one successful action creates one priority request;
- failure creates no purchase save request;
- dirty state remains if persistence fails;
- retry remains possible.

## 13. Manual desktop acceptance

Test at 1440 × 900 and 1920 × 1080.

### Carry sign

1. Load an existing v0.7.0 save.
2. Walk to original farm management.
3. Confirm the carry upgrade is discoverable.
4. Confirm its sign does not overlap another sign.
5. Confirm it does not obscure the contract board or dock.
6. Confirm the pad can be entered.
7. Confirm 12 → 18 or 18 → 24 purchase works.
8. Confirm maximum state is clear.

### Corn hires

1. Unlock or load the east field.
2. Confirm the corn management board is visible.
3. Confirm the corn harvester pad is identifiable.
4. Enter and leave before 900 ms; progress resets.
5. Complete hire; exact 160 coins deducted.
6. Confirm a visible harvester appears.
7. Confirm the transport pad unlocks.
8. Complete hire; exact 240 coins deducted.
9. Confirm a visible transporter appears.
10. Confirm both workers move and carry visible corn.

### Poultry hire

1. Unlock or load the coop.
2. Confirm the poultry management board is visible.
3. Confirm the caretaker pad is identifiable.
4. Complete hire; exact 300 coins deducted.
5. Confirm visible caretaker appears.
6. Confirm corn-to-feed and egg-to-barn trips occur.

### Operations office

1. Approach the operations office.
2. Open with `E`, `Space`, and click.
3. Confirm roster and costs.
4. Select facility locator.
5. Follow directional marker.
6. Return and train a worker.
7. Confirm exact cost and immediate parameter change.
8. Close panel and confirm normal input resumes.

## 14. Manual mobile acceptance

Test at:

```text
844 × 390
390 × 844
320 × 568
```

Confirm:

- operations action button is tappable;
- panel does not overlap joystick;
- panel scroll or paging works at 320 × 568;
- worker cards are readable;
- Japanese text is not clipped;
- hire and training buttons have adequate touch targets;
- map locator arrow remains visible;
- on-site pads remain distinguishable;
- carry sign does not overlap another sign;
- HUD and panel touches do not move the farmer;
- closing panel restores joystick and drag input;
- sign LOD prevents excessive text.

## 15. Save/load manual acceptance

1. Use an existing v0.7.0 save.
2. Load into v0.8.0.
3. Confirm migration notice only when appropriate.
4. Confirm all resources, land, contracts, and workers remain.
5. Confirm hired workers appear visibly.
6. Hire a corn worker and close the page immediately after save confirmation.
7. Reload and confirm hire persists.
8. Train the worker.
9. Export JSON.
10. Re-import it.
11. Confirm level and resources remain.
12. Corrupt primary in a controlled test and confirm backup recovery still works.

## 16. Long-session acceptance

Run long enough to observe:

- multiple worker loops;
- market sales;
- customer abandonment;
- contract delivery;
- autosaves;
- sign LOD changes;
- panel open/close cycles.

Confirm:

- no duplicate workers;
- no invisible hired worker;
- no repeated hire charge;
- no stuck hold progress;
- no sign accumulation;
- no notification flood;
- no unbounded tweens;
- no event-listener duplication;
- no negative inventory;
- no console errors;
- no repeated console warnings.

## 17. Final Codex report

Report:

1. base `main` SHA;
2. confirmation of incremental implementation;
3. root cause of carry-sign overlap;
4. root cause of corn/poultry hiring failure;
5. facility and interaction registry design;
6. sign-layout runtime integration;
7. exact fixed facility coordinates or generated placements;
8. operations-office design;
9. worker hire and training costs;
10. worker level parameter tables;
11. visible worker entities and routes;
12. schema-2 migration details;
13. v1 fixture migration results;
14. tests added;
15. command results;
16. desktop checks performed;
17. mobile checks performed;
18. known limitations;
19. Pages checks still required after deployment.
