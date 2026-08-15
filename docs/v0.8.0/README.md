# Hurry-Go-Round v0.8.0 — Operations Center & Reliable Workforce

## Purpose

v0.8.0 is an incremental update to the current v0.7.0 game. It must first fix two confirmed regressions:

1. The carry-capacity upgrade sign overlaps nearby signs and facilities.
2. Corn-field workers and the poultry caretaker cannot be hired reliably from the expanded areas.

After those regressions are fixed, v0.8.0 adds a coherent farm-operations layer:

- one authoritative facility and interaction registry;
- collision-free sign placement used by the actual runtime;
- reliable on-site hiring with visible progress and failure reasons;
- a central Japanese farm-operations board;
- visible expanded-area workers rather than timer-only automation;
- worker training levels and meaningful late-game coin sinks;
- schema-2 persistence with migration from every valid v0.7.0 schema-1 save;
- deterministic tests proving that every required interaction is reachable and usable.

This document set is intended to be read from the repository by Codex. Do not paste the full specification into the Codex task box.

## Required document set

Codex must read all files under:

```text
docs/v0.8.0/
```

The files are:

```text
docs/v0.8.0/README.md
docs/v0.8.0/INTERACTIONS_AND_SIGNS.md
docs/v0.8.0/OPERATIONS_AND_WORKERS.md
docs/v0.8.0/PERSISTENCE_AND_MIGRATION.md
docs/v0.8.0/VALIDATION.md
```

Codex must also read:

```text
AGENTS.md
README.md
docs/V0.7.0_SPEC.md
docs/ART_DIRECTION.md
docs/v0.7.0/
src/game/systems/ExpansionSystem.ts
src/game/systems/ExpandedAutomationSystem.ts
src/game/systems/HiringSystem.ts
src/game/entities/WorldSign.ts
src/game/logic/signLayout.ts
src/game/persistence/
all current tests
```

## Base-commit requirement

At the time this specification was prepared, the latest `main` commit was:

```text
622168caaa06bb4f91473de23edf1432d6aadf02
```

Before editing, Codex must run:

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

If `HEAD` does not exactly match the true latest `main`, Codex must stop without modifying files.

If `main` has advanced after this specification was written, the actual current `main` SHA becomes the required base. An old Codex task or old worktree must not be reused.

## Incremental-update constraints

Do not initialize or recreate the project.

Do not recreate:

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
tsconfig.json
existing v0.1.0–v0.7.0 specifications
existing Phaser/Vite bootstrap
existing persistence and contract systems
```

If those files appear as newly added rather than incrementally modified, stop without opening a pull request.

## Version

Update:

```text
package.json
package-lock.json
```

to:

```text
0.8.0
```

Update the game-version constant used by persistence.

Create:

```text
docs/V0.8.0_SPEC.md
```

Update:

```text
README.md
docs/ART_DIRECTION.md
```

Do not create a Git tag or GitHub Release in this task.

## Milestone

Implement:

```text
Hurry-Go-Round v0.8.0
Operations Center & Reliable Workforce
```

Preserve all working v0.7.0 behavior:

- mixed wheat, corn, and egg cargo;
- capacity upgrades;
- wheat, corn, and egg production;
- market customers and customer patience;
- wheat automation;
- corn automation;
- poultry automation;
- delivery contracts and reputation;
- IndexedDB autosave and recovery;
- JSON export/import;
- title, pause, settings, and management flows;
- desktop, mobile landscape, and mobile portrait controls;
- GitHub Pages deployment at `/hurry-go-round/`.

## Mandatory v0.8.0 outcomes

The following are non-negotiable acceptance outcomes.

### Carry-capacity upgrade

- The carry-capacity sign must not overlap another sign, building, interaction area, contract board, shipping dock, worker route, or road center.
- The carry-capacity interaction itself must remain reachable.
- The carry-capacity upgrade must still work at 12 → 18 → 24.
- Its cost, next capacity, maximum state, progress, and insufficient-funds reason must be clear in Japanese.
- The regression must be covered by a test using the actual production facility definitions.

### Corn workers

- After the east field is unlocked, the corn-harvest-worker hire action must be visible, reachable, and usable.
- After the corn harvest worker is hired, the corn transport worker action must unlock and become usable.
- A successful hire must deduct exactly 160 or 240 coins, persist immediately, and spawn a visible worker.
- A failed hire must deduct nothing and show the exact reason.

### Poultry caretaker

- After the chicken coop is unlocked, the caretaker hire action must be visible, reachable, and usable.
- A successful hire must deduct exactly 300 coins, persist immediately, and spawn a visible caretaker.
- The caretaker must continue feed and egg work after save/load.

### Unified behavior

- On-site pads and the central operations board must call the same pure transaction functions.
- No worker can be charged twice.
- No hidden hard-coded interaction may exist without a registered visible representation.
- Every interactive facility must have an ID, logical bounds, visual bounds, prerequisites, status, and Japanese label.

## New progression layer

v0.8.0 adds a farm-operations office or operations board near the original farm hub.

The board provides:

- a worker roster;
- hiring status;
- exact prerequisites;
- costs;
- current worker activity;
- worker training levels;
- a facility locator;
- problem-state summaries;
- contract and automation context without replacing the existing contract interface.

The player may still use on-site hiring pads. The board is an additional reliable route, not a replacement for the physical farm.

The board may only be opened when the farmer is near the operations facility. It is not a remote menu available from anywhere.

## Required scope

Implement:

1. runtime integration of collision-free sign placement;
2. actual use of the existing sign-layout logic or a corrected successor;
3. facility and interaction registries;
4. sign grouping and LOD;
5. carry-upgrade sign regression fix;
6. reliable corn-worker hiring;
7. reliable caretaker hiring;
8. visible progress rings and action feedback;
9. central farm-operations board;
10. a roster and facility-locator panel;
11. visible corn workers and caretaker entities;
12. fixed authored worker routes;
13. worker training levels;
14. worker-level effects on speed, capacity, and operation intervals;
15. schema-2 persistence;
16. v1 → v2 save migration;
17. autosave on hire and training;
18. deterministic tests;
19. manual viewport and interaction validation.

## Explicitly deferred

Do not implement:

- new crops;
- new animals;
- worker salaries;
- fatigue;
- happiness;
- worker dismissal;
- generic pathfinding;
- navigation meshes;
- remote/cloud saves;
- online accounts;
- multiplayer;
- audio;
- advertisements;
- payments;
- new contract resource types;
- off-line production;
- unrestricted remote hiring from the pause menu.

## Architectural direction

Create or consolidate around concepts equivalent to:

```text
FacilityRegistry
InteractionRegistry
SignLayoutSystem
InteractionPromptSystem
FarmOperationsSystem
WorkerRegistry
WorkerTrainingSystem
```

The exact filenames may differ.

Required principles:

- coordinates and radii are defined once;
- visual and logical bounds come from the same definitions;
- runtime systems consume registry definitions;
- sign layout is not merely unit-tested and then bypassed;
- hiring is not embedded in a timer-only automation class;
- worker simulation and worker purchase transactions are separate;
- Japanese public strings remain centralized;
- pure transactions remain Phaser-independent;
- no `any`;
- no global mutable singleton;
- no unnecessary dependencies;
- no React or ECS framework.

## Recommended pull-request title

```text
Add v0.8.0 operations center, reliable hiring, and collision-free facility UI
```

## Short Codex launch prompt

After this documentation PR is merged, start a new Codex task on the latest `main` and use only the following task prompt:

```text
Implement Hurry-Go-Round v0.8.0 as an incremental update to the latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read all files under docs/v0.8.0/.
3. Read README.md, docs/V0.7.0_SPEC.md, docs/ART_DIRECTION.md, docs/v0.7.0/, and the current implementation/tests.
4. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
5. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement every required item in docs/v0.8.0/, prioritizing the carry-upgrade sign overlap regression and the unusable corn/poultry hiring interactions. Preserve all working v0.7.0 persistence, contracts, gameplay, controls, and the GitHub Pages base path /hurry-go-round/.

Do not recreate the project, CI, Pages workflows, AGENTS.md, Vite configuration, persistence subsystem, contract subsystem, or previous specifications.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build

Review the complete diff and create a focused pull request. If existing project files appear as newly added instead of incrementally modified, stop without creating the pull request.
```
