# Hurry-Go-Round

A bright browser farm game about keeping a satisfying farm-to-market circuit moving. **v0.3.0 — Market & First Upgrade Loop** adds customers, sales, collectible earnings, and the first progression purchase to the visual harvest prototype.

## Current gameplay loop

1. Approach mature wheat to harvest automatically and fill the farmer’s visible 12-slot pack.
2. Enter the barn delivery platform to unload one bundle at a time.
3. The barn restocks the eight-slot market shelf one unit at a time.
4. Customers arrive, form a FIFO queue, wait for stock, and buy one wheat for two coins.
5. Sales accumulate as a physical coin pile at the market till rather than entering the wallet directly.
6. Enter the marked cash zone to collect coins one at a time.
7. Hold position on the Harvest Speed pad to purchase faster harvesting for 20, then 55 coins.

The 2000 × 1400 farm retains its looping path, two wheat plots, crop depletion and staged regrowth, barn, pond, fences, trees, flowers, and original vector-like farmer. Market stock, till earnings, wallet coins, and upgrade state share one authoritative game state.

The public game interface is presented in Japanese. Delivery, cash collection, and upgrade purchase areas use filled ground zones, heavy outlines, and Japanese labels that match their actual interaction radii.

## Controls and responsive behavior

- **WASD / arrow keys:** direct movement; this cancels a point destination.
- **Virtual joystick:** available on desktop, mobile, and tablet; dragging it cancels point movement.
- **Click or tap:** move toward a marked destination and stop on arrival.
- **Drag outside the joystick:** use the pointer-down position as a temporary control origin and keep moving in the dragged direction while held. Releasing stops the farmer rather than leaving a point destination.
- Harvesting, barn unloading, market restocking, sales, cash collection, and upgrade purchasing are automatic.

The Phaser canvas uses `RESIZE`; responsive camera zoom updates on rotation or resize. HUD regions are excluded from both point and drag navigation. Desktop places inventory and economy panels on opposite sides; narrow portrait stacks them above the lower-left joystick and displays a one-time landscape suggestion.

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

## Project structure

```text
src/game/
├── art/          palette, terrain, farm and bounded effects
├── config/       centralized gameplay and economy parameters
├── entities/     farmer, crops, market, customers, and upgrade pad
├── input/        joystick and tested responsive reserved-region layout
├── logic/        pure movement, pointer control, crops, inventory, market, queue, economy, upgrades
├── scenes/       world owner and camera-independent responsive UI
├── state/        authoritative game state and event contract
└── systems/      market/customer/cash and upgrade runtime orchestration
docs/
├── ART_DIRECTION.md
├── V0.1.0_SPEC.md
├── V0.2.0_SPEC.md
└── V0.3.0_SPEC.md
```

Phaser supplies rendering, input, cameras, timing, and bounded tweens. Transaction, pointer-direction, and layout rules are deterministic TypeScript functions tested without Phaser. All visuals are original local vector primitives; there are no remote assets, services, fonts, APIs, or tracking.

## GitHub Pages

```bash
npm run check
npm run build
```

Vite’s base remains `/hurry-go-round/`, matching `https://<github-owner>.github.io/hurry-go-round/`. Pull requests run CI, and pushes to `main` deploy the generated `dist/` artifact through GitHub Actions. Do not commit `dist/` or `node_modules/`.

## Intentionally deferred

Workers, automatic transport or harvesting, cashiers, obstacle pathfinding, navigation meshes, land expansion, more crops, animals, processing, recipes, multiple stores, customization, saves, IndexedDB, PWA installation, service workers, offline progression, audio, accounts, cloud synchronization, rankings, achievements, advertising, payments, external APIs, and multiplayer are outside v0.3.0.
