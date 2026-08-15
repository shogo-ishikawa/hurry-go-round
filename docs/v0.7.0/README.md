# Hurry-Go-Round v0.7.0 Implementation Brief
## Persistent Farm & Contract Board

Repository:

```text
shogo-ishikawa/hurry-go-round
```

This milestone is an **incremental update** to the existing v0.6.0 game. It must not recreate the project, build tooling, CI, Pages workflow, or previous specifications.

At the time this brief was prepared, the latest `main` commit was:

```text
f6ed031258fb864a0052446621c13073d254e8bb
```

If `main` has advanced, use the true latest `main` commit instead.

---

## 0. Required start check

Start this work in a **new Codex task** from the latest `main` branch. Do not continue an older task or worktree.

Before editing, run:

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

Confirm that `HEAD` exactly matches the latest GitHub `main` commit. If it does not, do not modify files; report the mismatch and stop.

The following existing files must not appear as newly added in the final pull request:

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

If the project scaffold, previous specifications, CI, or Pages configuration appear as new files, stop without creating a pull request.

---

## 1. Milestone

Implement:

```text
Hurry-Go-Round v0.7.0
Persistent Farm & Contract Board
```

v0.6.0 already provides:

- mixed wheat, corn, and egg cargo
- barn and market inventory
- wheat, corn, and poultry automation
- land expansion
- carry and harvest upgrades
- customers with stock-out patience and abandonment
- Japanese public UI
- desktop and mobile input

v0.7.0 must add two coherent layers:

1. **Persistent farm progress**
   - IndexedDB save data
   - autosave and manual save
   - schema validation and migration infrastructure
   - primary and backup save recovery
   - JSON export and import
   - title/continue/new-game flow
   - pause and management menu

2. **Contract-board progression**
   - three generated delivery offers
   - one accepted contract at a time
   - resource-aware requirements
   - physical contract shipping dock
   - base rewards, optional speed bonus, and reputation
   - completed/cancelled contract statistics
   - contract state saved and restored

The core loop becomes:

```text
produce resources
→ automate production
→ accept a delivery contract
→ accumulate goods in the barn
→ ship required goods at the contract dock
→ earn coins and reputation
→ save and continue later
```

---

## 2. Required documents

Read every file in this directory before implementation:

```text
docs/v0.7.0/
```

Also read:

```text
AGENTS.md
README.md
docs/V0.6.0_SPEC.md
docs/ART_DIRECTION.md
package.json
src/main.ts
src/game/state/GameState.ts
src/game/scenes/GameScene.ts
src/game/scenes/UIScene.ts
src/game/systems/MarketSystem.ts
src/game/systems/WorkerSystem.ts
src/game/systems/ExpandedAutomationSystem.ts
src/game/systems/ExpansionSystem.ts
all existing logic and tests
```

Documents in this directory:

```text
README.md             milestone, scope, and architecture
PERSISTENCE.md        save schema, IndexedDB, migration, recovery, export/import
CONTRACTS.md          contract generation, delivery, rewards, reputation, statistics
UI_AND_SETTINGS.md    title, pause, action input, responsive panels, accessibility
VALIDATION.md         invariants, automated tests, manual scenarios, PR safety
```

---

## 3. Required scope

Implement all of the following:

### Persistence

1. Native IndexedDB save repository
2. Versioned save envelope
3. Canonical persisted snapshot separate from Phaser runtime objects
4. Save-data validation
5. Future migration framework
6. Primary and backup save slots
7. Autosave when dirty
8. Event-triggered save after major progression changes
9. Save on `visibilitychange` and `pagehide` where possible
10. Manual save
11. JSON export
12. JSON import with preview and confirmation
13. Corruption fallback to backup
14. New-game reset with confirmation
15. Save status indicator
16. Continue/new-game title flow

### Contracts

17. Physical contract board near the barn/market management area
18. Context action input to open the contract panel
19. Three deterministic contract offers
20. Offers limited to unlocked resources
21. One active contract at a time
22. Single-resource and mixed-resource contracts
23. Physical contract shipping dock
24. One-unit round-robin delivery from barn inventory
25. Contract progress display
26. Base coin reward
27. Optional active-play-time completion bonus
28. Farm reputation points
29. Contract completion statistics
30. Contract cancellation with delivered resources returned
31. Persisted offer, active-contract, timer, progress, and RNG state

### UI and lifecycle

32. `BootScene` or equivalent load coordinator
33. Title screen with continue/new game
34. Pause/management overlay
35. Settings persisted separately or within the save envelope
36. Japanese public labels
37. Responsive desktop/mobile layouts
38. Reduced-motion option
39. Text-size option
40. Joystick-size/opacity option
41. Clean shutdown and event-listener removal

---

## 4. Explicitly deferred

Do not implement:

- cloud save
- accounts
- server synchronization
- multiple human users
- multiple manual save slots
- real-money purchases
- advertisements
- online leaderboards
- multiplayer
- offline production gains
- background simulation while the app is closed
- hard contract failure that removes already earned farm progress
- new crop or animal types
- new land regions
- processing or recipes
- achievements beyond contract/reputation statistics
- audio or music
- service worker or PWA installation
- remote APIs
- external databases

No offline progression is part of v0.7.0. Elapsed real-world time while the app is closed must not create goods, sales, coins, eggs, or worker progress.

---

## 5. Versioning and documentation

Update:

```text
package.json
package-lock.json
```

from `0.6.0` to `0.7.0`.

Create:

```text
docs/V0.7.0_SPEC.md
```

Update:

```text
README.md
docs/ART_DIRECTION.md
```

Document:

- save behavior
- recovery behavior
- export/import
- contract board and shipping dock
- contract rewards and reputation
- settings
- intentionally deferred features
- build and test commands

Do not create a Git tag or GitHub Release in this task.

---

## 6. Architecture principles

Use a structure equivalent to:

```text
src/game/
├── contracts/
│   ├── contractDefinitions.ts
│   ├── contractGenerator.ts
│   └── contractTypes.ts
├── persistence/
│   ├── IndexedDbSaveRepository.ts
│   ├── SaveService.ts
│   ├── saveSchema.ts
│   ├── saveValidation.ts
│   ├── migrations.ts
│   └── exportImport.ts
├── logic/
│   ├── contracts.ts
│   ├── contractDelivery.ts
│   ├── saveSnapshot.ts
│   └── corresponding tests
├── entities/
│   ├── ContractBoard.ts
│   └── ContractDock.ts
├── systems/
│   ├── ContractSystem.ts
│   ├── ContractDeliverySystem.ts
│   └── PersistenceSystem.ts
├── scenes/
│   ├── BootScene.ts
│   ├── TitleScene.ts
│   ├── GameScene.ts
│   └── UIScene.ts
└── state/
    └── GameState.ts
```

The exact tree may differ, but preserve these rules:

- persistence does not serialize Phaser objects
- contract calculations are pure and deterministic
- IndexedDB access is behind an interface
- game runtime receives a validated canonical snapshot
- UI does not write directly to IndexedDB
- `GameScene` does not own all persistence and contract logic
- no duplicated mutable inventory is added
- no `any`
- no new runtime dependency unless strictly necessary
- no React
- no backend
- no network access

---

## 7. Short Codex launch prompt

After these specification files are merged into `main`, start a new Codex task with this short prompt:

```text
Implement Hurry-Go-Round v0.7.0 as an incremental update to the latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read all files under docs/v0.7.0/.
3. Read README.md, docs/V0.6.0_SPEC.md, docs/ART_DIRECTION.md, and the current implementation/tests.
4. Run git rev-parse HEAD, git log -1 --oneline, and git status --short.
5. Confirm HEAD is the true latest main commit. If not, stop without modifying files.

Implement every required item in docs/v0.7.0/, including native IndexedDB persistence, autosave and recovery, JSON export/import, title/pause/settings flows, deterministic delivery contracts, a physical contract dock, rewards, reputation, and all required tests.

Preserve all working v0.6.0 behavior and the GitHub Pages base path /hurry-go-round/. Do not recreate the project, CI, Pages workflows, AGENTS.md, Vite configuration, or previous specifications.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build

Review the complete diff and create a focused pull request. If existing project files appear as newly added instead of incrementally modified, stop without creating the pull request.
```
