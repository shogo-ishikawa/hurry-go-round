# v0.6.0 — Validation, Acceptance, and Build Safety

## 1. Preserve existing behavior

All v0.5.0 features must continue to work:

- wheat, corn, and egg production
- east-field and coop purchases
- carry-capacity upgrades
- multi-resource barn and market
- customer requests and sales
- till collection
- wheat workers
- keyboard, arrow, joystick, click/tap, and continuous drag movement
- Japanese UI and contextual hints
- responsive layouts
- GitHub Pages deployment

## 2. Required automated tests

Preserve all existing tests and add deterministic tests for the following.

### Base and deployment

- task starts from latest `main`
- project is not reinitialized
- CI and Pages are not recreated
- Vite base remains `/hurry-go-round/`
- no `/carry-and-thrive/` references

### Mixed cargo

- wheat and corn coexist
- all three resources coexist
- shared capacity limits the total
- resource counts remain independent
- removing corn preserves wheat/eggs
- feeding consumes corn only
- eggs can be collected while carrying wheat/corn
- barn unloading handles all resources
- round-robin unloading does not starve a resource
- capacities 12, 18, and 24 work
- no negative quantities

### Sign layout

- deterministic placements for identical inputs
- no sign overlap
- minimum 24-unit gap
- signs avoid buildings and interaction zones
- low-priority sign collapses if required
- related facility signs can be grouped
- far LOD hides detail
- medium LOD shows compact title
- near LOD shows detail
- long guidance is hidden inside operation range

### Feed and egg facilities

- visual/logical interaction bounds match
- feed and egg zones do not substantially overlap
- feed accepts corn only
- egg storage returns eggs only
- empty/full states work
- duplicate guidance is suppressed

### Corn automation

- no operation before hiring
- exact hire costs
- prerequisite enforcement
- one harvest per corn node
- harvester cargo maximum five
- corn crate maximum twenty
- transporter cargo maximum eight
- transfers conserve corn
- player and worker crate access never makes stock negative
- corn workers never handle wheat or eggs

### Poultry caretaker

- no operation before hiring
- insufficient funds reject hiring
- emergency feed has highest priority
- no feed task without barn corn
- corn cargo maximum six
- feed capacity respected
- egg cargo maximum six
- egg storage never negative
- eggs arrive at barn correctly
- caretaker never mixes corn and eggs
- caretaker returns to waiting and resumes later

### Customer patience

- only front stock-out customer loses patience
- customers behind do not lose patience
- patience does not advance while stock exists
- patience begins only at the purchase position
- stock refill resets patience
- refill resumes purchase
- timeout occurs once
- timeout removes front customer once
- queue remains FIFO
- next customer advances
- abandonment removes no stock
- abandonment adds no till coins
- abandonment changes no sold/served count
- abandonment count increments once
- customer cannot both buy and abandon
- abandoned customer cannot buy later
- repeated updates cannot remove twice
- normal sales continue afterward
- active-customer count is cleaned up after exit

### Resource invariants

- non-harvest wheat transfers conserve wheat
- non-harvest corn transfers conserve corn
- feed transfer conserves corn before conversion
- egg production converts one corn feed to one egg
- egg transfers conserve eggs
- sale reduces only requested resource by one
- abandonment changes no resource or currency
- mixed cargo preserves each resource independently

### Responsive layout

Test at least:

```text
1920 × 1080
1440 × 900
844 × 390
390 × 844
320 × 568
```

Confirm:

- HUD on-screen
- no sign clipping or overlap
- no joystick/HUD overlap
- automation panels on-screen
- feed and egg facilities distinguishable
- customer patience display readable
- patience display does not cover requested-resource icon
- no negative dimensions
- HUD regions reserve pointer input

## 3. Manual acceptance

### Mixed cargo

1. Harvest wheat 5.
2. Harvest corn 4.
3. Collect eggs 3.
4. Confirm cargo 12/12.
5. Confirm all three resources appear on farmer and HUD.
6. Enter feed area; corn only decreases.
7. Enter barn; remaining resources unload correctly.

### Signs and guidance

1. Walk through original and expanded areas.
2. Confirm signs do not overlap or obscure facilities.
3. Confirm distant signs are compact or hidden.
4. Confirm near guidance explains interaction.
5. Confirm long guidance fades inside operation range.
6. Confirm management interactions share boards as specified.
7. Confirm ordinary scenery does not look interactive.

### Feed and egg facilities

1. Distinguish both facilities from a distance.
2. Confirm visible corn and eggs reflect state.
3. Confirm interaction areas are understandable and separate.
4. Confirm signs do not overlap chickens or each other.
5. Confirm transfer guidance fades during operation.

### Corn automation

1. Hire corn harvester for 160 coins.
2. Confirm harvesting and five-unit capacity.
3. Confirm deposit into corn crate.
4. Hire corn transporter for 240 coins.
5. Confirm eight-unit capacity and safe route to barn.
6. Confirm barn/market/customer corn loop.

### Poultry automation

1. Hire caretaker for 300 coins.
2. Lower feed below emergency threshold.
3. Confirm caretaker loads barn corn and fills trough.
4. Confirm egg production resumes.
5. Confirm caretaker collects up to six eggs and delivers to barn.
6. Confirm market/customer egg loop.

### Customer patience

1. Let front customer request an unavailable resource.
2. Confirm patience UI appears.
3. Refill before timeout; confirm purchase resumes.
4. Create another stock-out and allow full timeout.
5. Confirm customer leaves without product.
6. Confirm no stock or coin changes.
7. Confirm served count unchanged and abandonment count +1.
8. Confirm next customer advances and sales continue.
9. Confirm departed customer is cleaned up and cannot abandon twice.

### Concurrent operation

1. Run wheat automation.
2. Run corn automation.
3. Run poultry automation.
4. Carry all three resources manually.
5. Let customers request all three products.
6. Force one abandonment.
7. Confirm no negative inventory, permanent worker stall, or notification pileup.

## 4. Performance and lifecycle

- at most one new worker per new role
- no sign creation every frame
- sign placement recomputed only on structural change
- update existing sign LOD rather than recreate signs
- no guidance creation every frame
- no route-array recreation every frame
- no patience-graphic recreation every frame
- update/reuse one patience display per customer
- destroy temporary transfer effects
- destroy departing customers after exit
- remove event listeners on shutdown
- no browser `setInterval`
- no external network requests
- no console errors or repeated warnings
- no unbounded tweens, particles, customers, or queues
- no invisible abandoned customers remaining active

## 5. Build and Pages safety

Do not change:

```ts
base: "/hurry-go-round/"
```

Do not modify CI or Pages workflows without a demonstrated defect.

Do not commit:

```text
dist/
node_modules/
temporary screenshots/
browser profiles/
local logs/
absolute filesystem paths/
secrets/
```

After building, inspect `dist/index.html`:

- JS URLs start with `/hurry-go-round/`
- CSS URLs start with `/hurry-go-round/`
- no `/carry-and-thrive/`
- no absolute local paths

## 6. Required commands

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
```

If browser rendering is available without a large new dependency, inspect the five target viewport sizes. Do not add Playwright solely for screenshots.

## 7. Pull-request check

Suggested title:

```text
Add v0.6.0 mixed cargo, visual polish, customer patience, and expanded automation
```

Before creating the PR, confirm these are not newly added:

```text
.github/workflows/ci.yml
.github/workflows/pages.yml
AGENTS.md
vite.config.ts
docs/V0.1.0_SPEC.md
docs/V0.2.0_SPEC.md
docs/V0.3.0_SPEC.md
docs/V0.4.0_SPEC.md
docs/V0.5.0_SPEC.md
```

If they are newly added, stop; the task started from an outdated worktree.

## 8. Final Codex report

Report:

1. main SHA used
2. confirmation of incremental update
3. changed-file summary
4. new mixed-cargo state
5. duplicated-state migration
6. mixed-cargo transfers and unloading
7. farmer mixed-cargo art
8. sign placement and LOD
9. feed/egg improvements
10. customer patience duration and thresholds
11. abandonment transition and statistic
12. corn-worker costs/capabilities
13. poultry-caretaker cost/capabilities
14. pure functions added
15. tests added
16. commands and results
17. desktop/mobile checks
18. deferred functionality
19. remaining Pages manual checks
