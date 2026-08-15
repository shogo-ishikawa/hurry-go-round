# Hurry-Go-Round

A bright browser farm game about keeping a satisfying farm-to-market circuit moving. **v0.4.0 — Workers & Automation Loop** adds two staged labor hires while preserving the complete manual harvest, market, coin, and harvest-speed-upgrade loop.

## Current gameplay

The player may continue to harvest wheat manually, carry 12 visible bundles, unload at the barn, stock the market, serve queued customers, collect till coins, and purchase harvest-speed levels.

Automation is optional and visible:

1. Earn coins through the manual market loop.
2. Hire the harvest worker for **40 coins** by remaining on the hiring station for 900 ms.
3. The harvest worker follows fixed safe farm waypoints, harvests ready wheat, carries up to four bundles, and deposits them one at a time into the **16-unit field collection crate**.
4. Enter the crate’s 95-unit pickup area to transfer its wheat into the player’s pack every 160 ms, then deliver it manually if desired.
5. Earn another **75 coins** and hire the unlocked transport worker.
6. The transport worker loads up to six crate bundles, follows the fixed farm route to the barn, unloads one at a time, and returns to repeat the cycle.

The market continues restocking from the barn regardless of wheat carried by the player or either worker. Customer sales and cash collection continue during automation.

## Japanese public interface

All public gameplay labels, tutorial messages, worker statuses, interaction zones, affordability feedback, and purchase messages are Japanese. The game title **Hurry-Go-Round** and version number remain in English.

## Controls and responsive behavior

- **WASD / arrow keys:** direct movement and cancellation of a point destination.
- **Virtual joystick:** always available on desktop, mobile, and tablet.
- **Click or tap:** set a visible movement destination.
- **Drag:** continuously retarget the active destination.
- Harvesting, unloading, restocking, customer purchases, cash pickup, hiring, crate pickup, and worker transfers are automatic proximity interactions.

The Phaser canvas keeps `RESIZE` scaling and responsive camera zoom. Inventory, economy, automation, tutorial, and joystick regions are excluded from point navigation. Narrow portrait layouts use compact Japanese automation labels without blocking the joystick.

## Setup and commands

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm ci --no-audit --no-fund
npm run dev
```

| Command             | Purpose                                |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Start the Vite development server.     |
| `npm run build`     | Strictly type-check and build `dist/`. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm test`          | Run deterministic Vitest tests once.   |
| `npm run check`     | Run type checking and all tests.       |

## Architecture

```text
src/game/
├── art/          shared palette, terrain, and bounded effects
├── config/       centralized game, economy, crate, and worker balance
├── entities/     farmer, crops, market, crate, hiring pads, and workers
├── input/        joystick and tested responsive reserved layout
├── logic/        deterministic inventory, market, hiring, and worker transfers
├── routes/       immutable static worker waypoints
├── scenes/       game-state owner and camera-independent Japanese UI
├── state/        authoritative economy, inventory, and worker state
└── systems/      market, upgrade, hiring, and worker finite-state orchestration
docs/
├── ART_DIRECTION.md
├── V0.1.0_SPEC.md
├── V0.2.0_SPEC.md
├── V0.3.0_SPEC.md
└── V0.4.0_SPEC.md
```

Worker entities render position, animation, cargo, and status, while all persistent inventory, hiring, and currency values remain in `GameState`. Pure functions complete logical transfers before bounded visual tweens represent them.

## GitHub Pages

```bash
npm run check
npm run build
```

Vite’s base remains `/hurry-go-round/`, matching `https://<github-owner>.github.io/hurry-go-round/`. Pull requests run CI and pushes to `main` deploy `dist/` through GitHub Actions. Do not commit `dist/` or `node_modules/`.

## Intentionally deferred

More workers, worker upgrades or skins, salaries, fatigue, happiness, cashiers, automated cash pickup, pathfinding, navigation meshes, land expansion, other crops, animals, processing, crafting, recipes, multiple markets, saves, IndexedDB, localStorage, PWA installation, service workers, offline progression, audio, accounts, cloud synchronization, rankings, advertisements, payments, external APIs, and multiplayer are outside v0.4.0.
