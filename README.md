# Hurry-Go-Round

A browser-based gathering, carrying, selling, upgrading, and expansion game. The current v0.1.0 prototype establishes only the responsive game platform and movement controls; the broader gameplay described here is planned.

## Status

Early development. The first prototype contains an original placeholder map and character, keyboard controls, touch/pointer controls, camera tracking, and bounded movement. See [`docs/V0.1.0_SPEC.md`](docs/V0.1.0_SPEC.md) for the exact scope and exclusions.

## Requirements and setup

- Node.js 20.19+ or 22.12+
- npm

```bash
git clone <repository-url>
cd hurry-go-round
npm install --no-audit --no-fund
npm run dev
```

Open the local URL printed by Vite. No backend, accounts, or external services are required.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and produce a production bundle in `dist/`. |
| `npm run typecheck` | Run strict TypeScript checking without emitting files. |
| `npm test` | Run the Vitest unit tests once. |
| `npm run check` | Run type checking and all tests. |

## Controls

- **Desktop:** WASD or arrow keys.
- **Touch/pointer:** Press anywhere on the game and drag in the desired direction. Release to stop. A temporary joystick shows the drag direction.

The player remains inside the map. Diagonal movement is normalized to the same maximum speed as horizontal or vertical movement.

## Architecture

```text
src/
├── main.ts                       Phaser and responsive canvas bootstrap
├── style.css                     Full-viewport presentation
└── game/
    ├── logic/
    │   ├── movement.ts           Framework-independent movement rules
    │   └── movement.test.ts      Pure logic unit tests
    └── scenes/
        └── PrototypeScene.ts     Map drawing, player, camera, and input
docs/V0.1.0_SPEC.md               Version scope and acceptance criteria
```

Phaser owns rendering and input. Pure calculations are kept outside Phaser so they can be tested quickly in Node. All prototype art is drawn at runtime from basic shapes; the project downloads no game assets, fonts, sound, or media.

## Production build and deployment

```bash
npm run check
npm run build
```

Vite writes the deployable static site to `dist/`. The configured base path is `/hurry-go-round/`, matching the repository and its GitHub Pages project URL, `https://<github-owner>.github.io/hurry-go-round/`. Pushes to `main` run the Pages workflow, while pull requests run CI checks and a production build. In repository settings, configure **Pages → Source** to **GitHub Actions**.

Do not commit `dist/` or `node_modules/`; deployments publish the generated artifact directly from CI.

## Planned platform

- Desktop web browsers
- Mobile web browsers
- GitHub Pages

## Technology

TypeScript, Phaser, Vite, and Vitest. There is no UI framework.
