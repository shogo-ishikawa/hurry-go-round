# Hurry-Go-Round

A bright browser farm game about keeping a satisfying field-to-barn circuit moving. **v0.2.0 — Visual Harvest Prototype** delivers the first complete loop: automatically harvest wheat, visibly carry it, unload it at the barn, and return while the field regrows.

## Current gameplay

Explore a 2000 × 1400 original farm as a female farmer. Approach mature wheat to harvest one bundle every 280 ms, up to a 12-bundle carrying limit. Follow the looping path to the red barn and enter its teal delivery zone to unload automatically. Harvested wheat shows stubble, passes through a growing stage, and returns in roughly eight seconds.

The farm includes two wheat plots, layered grass and soil, a curved route, barn and loading platform, pond, fences, trees, flowers, crates, a barrel, and in-world guidance. A responsive HUD tracks carried and stored wheat while a short tutorial introduces the loop.

## Setup and commands

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm ci --no-audit --no-fund
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the responsive Vite development server. |
| `npm run build` | Type-check and create the production `dist/` bundle. |
| `npm run typecheck` | Run strict TypeScript checking. |
| `npm test` | Run deterministic Vitest tests once. |
| `npm run check` | Run type checking and all tests. |

## Controls and responsive behavior

- **Desktop:** move with WASD or arrow keys. The initial hint fades after movement begins.
- **Mobile/tablet:** use the large dedicated joystick in the lower-left corner. There is no action button; harvesting and unloading are automatic.
- **Portrait:** remains fully playable and shows a one-time, non-modal landscape suggestion.

The camera follows smoothly and recalculates zoom on resize or orientation change. The HUD and joystick remain screen-sized rather than scaling with the world.

## Project structure

```text
src/game/
├── art/          shared palette, static farm drawing, bounded effects
├── config/       centralized world and gameplay parameters
├── entities/     farmer and crop visual entities
├── input/        lifecycle-safe dedicated virtual joystick
├── logic/        pure camera, crop, inventory, and movement rules plus tests
├── scenes/       separated world gameplay and camera-independent UI
└── state/        single gameplay-state model and event contract
docs/
├── ART_DIRECTION.md
├── V0.1.0_SPEC.md
└── V0.2.0_SPEC.md
```

Phaser provides rendering, scenes, input, cameras, and tweens. Deterministic rules remain framework-independent and unit tested. All art is original and drawn locally with Phaser vector primitives; no runtime media, remote services, external fonts, or asset CDNs are used.

## Build and GitHub Pages

```bash
npm run check
npm run build
```

Vite’s base path remains `/hurry-go-round/`, matching `https://<github-owner>.github.io/hurry-go-round/`. Pull requests run CI; pushes to `main` build and deploy `dist/` through GitHub Actions. Configure **Pages → Source** to **GitHub Actions**. Never commit `dist/` or `node_modules/`.

## Intentionally deferred

Customers, sales, coins, workers, automation, upgrades, land purchases, save data, IndexedDB, PWA installation, service workers, offline mode, audio, accounts, analytics, advertising, external APIs, multiple scenarios, animals, multiplayer, and unlimited scenario content are outside v0.2.0.
