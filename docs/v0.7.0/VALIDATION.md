# v0.7.0 Validation and Acceptance Specification

## 1. Required commands

Before finishing, run:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
```

All commands must complete successfully.

Inspect `dist/index.html` and confirm:

- JavaScript URLs begin with `/hurry-go-round/`
- CSS URLs begin with `/hurry-go-round/`
- no `/carry-and-thrive/` path exists
- no absolute local filesystem path exists

Do not modify CI or Pages workflows unless there is a demonstrated defect.

---

## 2. Pull-request safety

Before creating the PR, confirm the branch started from the true latest `main`.

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
```

Suggested PR title:

```text
Add v0.7.0 persistent saves and delivery contracts
```

Do not include unrelated refactors.

---

## 3. Persistence unit tests

Add deterministic tests for at least:

### Snapshot creation

- canonical snapshot contains cargo, barn, market, livestock, workers, automation, crops, contracts, settings/progression references, and statistics as specified
- Phaser objects are not included
- event listeners are not included
- customer entities are not included
- duplicate legacy inventory fields are not persisted
- same canonical runtime state produces the same payload structure

### Validation

- valid schema passes
- missing format fails
- unsupported future schema fails
- negative coins fail
- non-finite numbers fail
- invalid resource keys fail
- cargo above capacity fails
- market above capacity fails
- worker cargo above capacity fails
- duplicate crop IDs fail
- invalid contract resource fails
- contract progress above requirement fails
- invalid player coordinates produce failure or documented safe fallback
- unknown optional fields do not execute or alter code

### Checksum

- canonical payload produces deterministic SHA-256 checksum
- unchanged payload verifies
- changed payload fails verification
- checksum does not include itself recursively

### Migration

- current schema validates without migration
- future schema is rejected
- known older fixture migrates deterministically when a fixture exists
- migration preserves save ID and creation time
- migration does not mutate the input object unexpectedly

### Repository

Using an in-memory repository:

- primary save writes and loads
- valid old primary becomes backup before replacement
- failed primary write does not erase old valid data
- primary corruption falls back to backup
- absent primary and backup returns no save
- settings write/load independently
- simultaneous save requests serialize or deduplicate safely

### Dirty/autosave

- no save occurs when state is clean
- dirty state autosaves after interval
- multiple changes within debounce produce one save request
- major event triggers priority save
- a save in progress prevents duplicate concurrent write
- successful save clears dirty state only for the saved sequence
- a newer change during save remains dirty afterward

---

## 4. Restore tests

### Player

- valid position restores
- out-of-bounds position clamps or uses safe spawn
- locked-land position uses safe accessible position
- non-finite position is rejected
- facing restores
- movement input starts neutral

### Crops

- ready wheat restores ready
- growing wheat restores remaining time
- corn lifecycle restores
- no closed-time growth occurs
- unknown crop ID is ignored safely
- missing known crop receives documented default
- remaining time is clamped

### Workers

- hired workers are instantiated
- un-hired workers are absent
- wheat harvester cargo is preserved
- wheat transporter cargo is preserved
- corn harvester cargo is preserved
- corn transporter cargo is preserved
- caretaker corn cargo resumes toward feed
- caretaker egg cargo resumes toward barn
- no worker cargo is duplicated or lost
- runtime route indices are safely rebuilt

### Market/customers

- market stock restores
- till coins restore
- customer queue restarts empty
- customer statistics restore
- spawning resumes normally

### Livestock

- feed and eggs restore
- egg remaining timer follows documented behavior
- no offline egg production occurs

### Contracts

- offer IDs remain the same
- active contract requirements/progress restore
- elapsed active time restores
- bonus eligibility restores
- reputation and statistics restore
- no offer regeneration occurs merely because of load

---

## 5. Export/import tests

- exported file contains valid envelope
- exported checksum verifies
- filename follows documented pattern
- import rejects malformed JSON
- import rejects files larger than 2 MiB
- import rejects wrong format
- import rejects invalid checksum
- import rejects unsupported future schema
- import preview is generated only from validated data
- import confirmation replaces the full runtime snapshot atomically
- current valid primary becomes backup before import activation
- failed import leaves current farm unchanged
- imported state does not partially merge with current state

---

## 6. Contract-generation tests

- same seed and inputs produce same offers
- generator does not call uncontrolled randomness
- three offers are generated
- IDs are unique and stable
- wheat-only farm generates wheat-only requirements
- corn unlock allows corn requirements
- coop unlock allows egg requirements
- locked resources are never requested
- no requirement is zero
- requirements stay within configured ranges
- contract type distribution follows deterministic rules
- reputation tier changes generation only as documented
- title key is valid
- reward is an integer

---

## 7. Contract transition tests

### Acceptance

- offered contract may be accepted when no active contract exists
- acceptance fails if an active contract exists
- accepted contract resets delivered amounts
- accepted contract starts elapsed time at zero
- accepted offer is replaced so three offers remain
- no inventory changes on acceptance

### Decline

- decline removes only selected offer
- replacement is generated
- no coins/reputation/inventory change
- decline statistic increments once
- cooldown prevents uncontrolled repeated decline

### Cancellation

- active contract may be cancelled after confirmation logic
- delivered wheat returns to barn
- delivered corn returns to barn
- delivered eggs return to barn
- no resource duplication
- no coin reward
- no reputation reward
- cancellation statistic increments once
- contract cannot later complete

### Delivery

- delivery consumes barn only
- cargo is not consumed
- market is not consumed
- field crates are not consumed
- feed and egg storage are not consumed
- one unit transfers per operation
- round-robin skips completed resources
- round-robin skips unavailable resources
- delivered progress never exceeds requirement
- barn never becomes negative
- no transfer occurs when player is outside dock
- no transfer occurs with no active contract

### Completion

- all requirements must be satisfied
- base reward calculated once
- speed bonus calculated once
- wallet increases by exact reward
- till coins do not change
- reputation increases exactly
- completed statistic increments once
- contract coin statistic increments correctly
- completion cannot be processed twice

### Timer

- active timer advances during unpaused gameplay
- does not advance while paused
- does not advance while contract panel open
- does not advance while app closed
- never becomes negative
- speed bonus is available before/equal target
- no speed bonus after target
- base reward remains available after target

---

## 8. Resource invariants

Contract shipping and cancellation must preserve resource accounting.

### Wheat

Before sale or contract completion accounting:

```text
player cargo wheat
+ wheat field crate
+ wheat harvest-worker cargo
+ wheat transport-worker cargo
+ barn wheat
+ market wheat
+ active-contract delivered wheat
```

Changes:

- harvest: +1
- customer sale: -1
- completed contract consumes already delivered units without further subtraction
- cancellation moves delivered units back to barn
- all transfers conserve total

### Corn

```text
player cargo corn
+ corn field crate
+ corn harvest-worker cargo
+ corn transport-worker cargo
+ caretaker corn cargo
+ barn corn
+ market corn
+ feed corn
+ active-contract delivered corn
```

Changes:

- harvest: +1
- customer sale: -1
- egg production consumes feed corn -1
- contract completion consumes already delivered corn
- cancellation returns delivered corn

### Egg

```text
player cargo egg
+ egg storage
+ caretaker egg cargo
+ barn egg
+ market egg
+ active-contract delivered egg
```

Changes:

- egg production: +1
- customer sale: -1
- contract completion consumes delivered eggs
- cancellation returns delivered eggs

Add invariant tests across accept, delivery, save/load, cancellation, and completion.

---

## 9. UI tests

Test pure responsive layout helpers at:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

Confirm:

- title panel remains on screen
- contract cards have non-negative dimensions
- pause menu remains on screen
- settings controls remain reachable
- mobile buttons meet practical touch size
- save indicator does not overlap pause button
- context action does not overlap joystick
- contract panel input blocks world movement
- import preview does not overflow
- Japanese text has sufficient allocated width
- no negative width or height

---

## 10. Manual acceptance: first launch

1. Open the game with no IndexedDB data.
2. Confirm loading screen appears briefly.
3. Confirm title shows `はじめる` rather than `つづきから`.
4. Start a farm.
5. Confirm normal v0.6.0 gameplay works.
6. Confirm save indicator changes from dirty to saved.
7. Reload the page.
8. Confirm title shows `つづきから` and a valid summary.
9. Continue.
10. Confirm player position, coins, land, workers, cargo, barn, market, crops, feed, eggs, and statistics restore.

---

## 11. Manual acceptance: autosave

1. Collect resources.
2. Confirm dirty/save indicator appears without a large modal.
3. Wait for autosave.
4. Confirm saved state appears.
5. Make another change while a save is in progress.
6. Confirm the newer change remains dirty and is saved later.
7. Purchase land or hire a worker.
8. Confirm a priority save occurs.
9. Hide the tab and return.
10. Confirm no duplicated save operations or runtime errors.

---

## 12. Manual acceptance: backup recovery

1. Create a valid primary and backup through two saves.
2. Corrupt the primary in a development fixture/test environment.
3. Reload.
4. Confirm backup is selected.
5. Confirm Japanese recovery notice appears.
6. Confirm restored farm is internally valid.
7. Confirm a later save creates a new valid primary.

Do not require end users to manually edit IndexedDB for ordinary recovery.

---

## 13. Manual acceptance: export/import

1. Make visible progress.
2. Export JSON.
3. Confirm file downloads with expected name.
4. Start or modify another farm state.
5. Select the exported file.
6. Confirm preview shows date, version, coins, unlocks, staff, reputation, and contract status.
7. Cancel import and confirm current farm remains unchanged.
8. Import again and confirm.
9. Confirm the imported farm restores fully.
10. Confirm current pre-import save is available as backup.
11. Test malformed JSON and confirm safe failure.

---

## 14. Manual acceptance: contracts

1. Approach the contract board.
2. Confirm `契約を見る` appears.
3. Open the board using keyboard and touch/click.
4. Confirm world simulation pauses.
5. Confirm three offers appear.
6. Confirm locked resources are absent.
7. Accept one contract.
8. Confirm one active contract and three replacement offers.
9. Produce required goods and store them in the barn.
10. Stand in the contract dock.
11. Confirm one-unit round-robin shipment.
12. Leave midway and confirm progress remains.
13. Save and reload.
14. Confirm contract progress and timer restore.
15. Complete before target and confirm speed bonus.
16. Complete another after target and confirm base reward remains.
17. Confirm reward goes to wallet, not till.
18. Confirm reputation and statistics update.

---

## 15. Manual acceptance: cancellation

1. Accept a mixed contract.
2. Deliver some wheat, corn, and eggs.
3. Open contract panel and choose cancellation.
4. Cancel the first confirmation and confirm nothing changes.
5. Confirm cancellation on the next attempt.
6. Confirm every delivered item returns to barn.
7. Confirm no coins or reputation are awarded.
8. Confirm cancellation statistic increments once.
9. Confirm another contract can be accepted.

---

## 16. Manual acceptance: pause/settings

1. Open pause with `Escape`, `P`, and mobile button.
2. Confirm workers, customers, crops, eggs, patience, and contract timer stop.
3. Change text size.
4. Change joystick size and opacity.
5. Enable reduced motion.
6. Disable ordinary hints.
7. Resume and confirm settings apply.
8. Reload and confirm settings persist.
9. Confirm critical errors still appear when ordinary hints are disabled.

---

## 17. No offline progression

1. Save with known crop, egg, and contract timers.
2. Close the game for several minutes.
3. Reload.
4. Confirm no extra crops, eggs, sales, coins, worker deliveries, or contract time were generated during closure.
5. Confirm timers resume from documented saved remaining values.

---

## 18. Performance and lifecycle

Requirements:

- do not write IndexedDB every frame
- do not save every harvested unit immediately
- serialize save writes
- do not create multiple databases
- do not leave duplicate page lifecycle listeners
- do not keep duplicate game scenes after returning to title
- do not create unbounded contract offers
- do not generate offers every frame
- do not recreate contract board entities every update
- do not create unbounded completion effects
- revoke export object URLs
- clear temporary import references
- no external network requests
- no console errors
- no repeated save warnings

---

## 19. Final Codex report

Report:

1. base `main` SHA
2. confirmation of incremental update
3. changed-file summary
4. IndexedDB database/store design
5. save envelope and schema version
6. canonical persisted snapshot
7. duplicate-state cleanup
8. autosave and priority-save behavior
9. backup/recovery behavior
10. export/import behavior
11. worker/crop restore decisions
12. contract generation seed model
13. contract types and ranges
14. reward and reputation formulas
15. contract timer behavior
16. tests added
17. total test results
18. build result
19. desktop checks
20. mobile checks
21. intentionally deferred features
22. Pages-deployment manual checks still required
