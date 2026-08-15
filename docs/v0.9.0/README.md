# Hurry-Go-Round v0.9.0
## Processing Yard & Production Planning

This directory is the implementation brief for the next major update after the corn-field scaling and batched poultry-automation work.

The implementation must be an incremental update to the true latest `main` branch.

## Mandatory prerequisite

Do not begin implementation until PR #18, `Improve corn-field scaling and batch poultry automation`, or an equivalent implementation, has been merged into `main`.

The latest `main` used by the implementation task must therefore contain all of the following:

- corn-field expansion levels
- 24 / 36 / 48 visible corn plants
- corn-crate capacity scaling
- batched corn harvesting
- batched corn transport
- batched poultry feed delivery
- batched egg collection
- persistence of the corn-field expansion level
- all tests introduced by that update

Before changing files, Codex must run:

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

If `HEAD` is not the true latest `main`, stop without modifying files.

Do not continue an old Codex task or stale worktree.

## Milestone

Implement:

```text
Hurry-Go-Round v0.9.0
Processing Yard & Production Planning
```

The current game already supports:

- wheat, corn, and egg production
- mixed player cargo
- raw-resource market sales
- deterministic delivery contracts
- wheat automation
- scaled and batched corn automation
- batched poultry automation
- worker hiring and training
- farm operations UI
- IndexedDB persistence
- JSON export and import

v0.9.0 introduces the first value-added production chain.

```text
wheat and corn are produced
→ raw resources are routed to processing
→ the grain mill creates flour and cornmeal
→ the bakery creates bread and cornbread
→ processed goods are sold at the market or delivered through contracts
→ processing workers and machine upgrades reduce manual handling
→ routing policies determine whether stock is reserved for the market,
  contracts, animal feed, or processing
```

## Main gameplay goals

The update must add meaningful choices rather than only more timers.

The player should decide:

- whether to sell raw produce immediately
- whether to reserve resources for active contracts
- whether to preserve corn for chicken feed
- whether to process surplus grain into higher-value goods
- which mill recipe receives priority
- which bakery recipe receives priority
- whether to invest in machines, workers, or field expansion

The result should make the existing wheat, corn, egg, worker, contract, and persistence systems more valuable.

## New resource chain

Add these resource IDs:

```ts
type ResourceId =
  | "wheat"
  | "corn"
  | "egg"
  | "flour"
  | "cornmeal"
  | "bread"
  | "cornbread";
```

Recipes:

```text
Grain mill
2 wheat        → 1 flour
2 corn         → 1 cornmeal

Bakery
1 flour + 1 egg                    → 1 bread
1 flour + 1 cornmeal + 1 egg       → 1 cornbread
```

Recommended sale prices:

```text
wheat       2
corn        3
egg         5
flour       6
cornmeal    8
bread       16
cornbread   26
```

These prices may be tuned after manual playtesting, but processed goods must provide a clear value increase without making raw sales irrelevant.

## New world area

Add a purchasable processing yard on the western or south-western edge of the current farm.

The processing yard must contain:

- a grain mill
- a bakery
- a small processing warehouse
- ingredient input areas
- finished-goods output areas
- a processing management board
- hiring areas for the mill operator and baker
- clear road access to the main barn
- enough free space that signs, workers, machines, and interaction zones do not overlap

The processing yard must not block existing routes, contract facilities, farm operations, or customer flow.

## Unlock progression

Recommended progression:

```text
Processing yard land
Cost: 800 coins
Prerequisites:
- east corn field unlocked
- chicken coop unlocked

Grain mill construction
Cost: 350 coins
Prerequisite:
- processing yard unlocked

Bakery construction
Cost: 850 coins
Prerequisites:
- processing yard unlocked
- grain mill built
```

The exact costs may be adjusted slightly after balance testing, but the bakery must be a later investment than the mill.

## New workers

Add:

```text
Mill operator
Hire cost: 450 coins

Baker
Hire cost: 700 coins
```

Both workers must physically move resources in batches.

They must not directly increment or decrement distant inventories from a fixed position.

The mill operator:

```text
barn raw grain
→ mill input
→ mill processing
→ mill output
→ barn processed ingredient storage
```

The baker:

```text
barn flour / cornmeal / egg
→ bakery ingredient storage
→ bakery processing
→ bakery output
→ barn finished-goods storage
```

Worker training from v0.8.0 must extend to these new roles.

## Production planning

Add a production-management panel accessible from:

- the processing-yard management board
- the farm operations center

The panel must allow the player to:

- enable or disable the mill
- select flour, cornmeal, or automatic mill mode
- enable or disable the bakery
- select bread, cornbread, or automatic bakery mode
- inspect input and output storage
- inspect the active production cycle
- inspect remaining production time
- inspect machine level
- upgrade machines
- hire or train processing workers
- select a farm-wide routing policy

## Routing policies

Add these presets:

```text
Balanced
Market priority
Contract priority
Processing priority
```

Routing must be deterministic and based on resource availability after protected reserves.

Minimum protected reserves must prevent processing from consuming:

- corn required for emergency chicken feed
- resources already needed by an active contract
- all stock required for normal market operation

Details are in `LOGISTICS_AND_POLICIES.md`.

## Persistence

Update the save format through a real migration.

The current v0.8.0 schema-2 save must remain loadable.

v0.9.0 should use schema version 3 and preserve:

- all existing resources
- land and corn-field expansion
- livestock
- workers and levels
- worker cargo
- contracts and reputation
- machine construction states
- machine levels
- machine buffers
- active production cycles
- reserved recipe inputs
- routing policy
- processing worker states

A save made during an active production cycle must resume safely without duplicating or losing ingredients.

## Public interface

All public gameplay text remains Japanese except:

- the game title
- the version number
- internal development documentation

Do not display internal enum values.

Do not place naked text directly on the ground.

Use:

- physical facility signs
- icons
- camera-fixed contextual prompts
- machine status lamps
- compact progress indicators

## Explicitly deferred

Do not implement in v0.9.0:

- cows, pigs, or sheep
- milk, meat, or wool
- additional raw crops
- cooking beyond bread and cornbread
- multiple bakeries or mills
- worker salaries
- worker fatigue
- machine breakdowns
- seasonal recipes
- online accounts
- cloud saves
- server APIs
- advertisements
- payments
- multiplayer
- offline production while the application is closed

Production time advances only while gameplay is actively running.

## Specification files

Read every file in this directory:

```text
docs/v0.9.0/
├── README.md
├── PROCESSING_AND_RECIPES.md
├── LOGISTICS_AND_POLICIES.md
├── UI_ART_AND_MARKET.md
└── PERSISTENCE_AND_VALIDATION.md
```

## Required implementation order

1. Confirm latest `main` and PR #18 prerequisite.
2. Generalize resource definitions and amounts to seven resource IDs.
3. Add schema-3 save types and migration tests before runtime integration.
4. Add pure recipe, machine-cycle, and routing logic.
5. Add processing-yard land and construction state.
6. Add machine entities and physical input/output buffers.
7. Add manual machine interactions.
8. Add market and contract support for processed goods.
9. Add mill operator and baker.
10. Add operations-center processing UI.
11. Add machine upgrades and routing presets.
12. Add visual polish and responsive layouts.
13. Run the full test suite and production build.
14. Review the diff for accidental reinitialization or unrelated rewrites.

## Required validation commands

Before finishing:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
```

Inspect `dist/index.html` and confirm all generated asset paths remain under:

```text
/hurry-go-round/
```

## Codex launch prompt

After these specifications are merged into `main`, start a new Codex task and paste only:

```text
Implement Hurry-Go-Round v0.9.0 as an incremental update to the latest main branch.

Before editing:
1. Read AGENTS.md.
2. Read all files under docs/v0.9.0/.
3. Read README.md, docs/V0.8.0_SPEC.md, docs/ART_DIRECTION.md, and the current implementation and tests.
4. Confirm that main contains the merged corn-field scaling and batched poultry automation from PR #18 or an equivalent implementation.
5. Run git rev-parse HEAD, git log -1 --oneline, git branch --show-current, and git status --short.
6. If HEAD is not the true latest main, stop without modifying files.

Implement every required item in docs/v0.9.0/, including the processing-yard land, grain mill, bakery, flour, cornmeal, bread, cornbread, deterministic production cycles, machine buffers, manual processing interactions, mill operator, baker, routing policies, market and contract integration, schema-3 persistence migration, responsive Japanese UI, visual polish, and all required tests.

Preserve all working v0.8.0 behavior, all merged PR #18 behavior, IndexedDB saves, contracts, controls, and the GitHub Pages base path /hurry-go-round/.

Do not recreate the project, CI, Pages workflows, AGENTS.md, Vite configuration, persistence subsystem, contract subsystem, or previous specifications.

Before finishing, run:
npm ci --no-audit --no-fund
npm run check
npm run build

Review the complete diff and create a focused pull request. If existing project files appear as newly added instead of incrementally modified, stop without creating the pull request.
```
