# Repository Development Guide

## Scope

These rules apply to the entire repository.

## Development

- Keep the game framework-free outside Phaser; use TypeScript and browser APIs.
- Keep deterministic, pure gameplay calculations in `src/game/logic` and cover them with tests.
- Do not add external runtime assets, services, trackers, authentication, or backend dependencies without an explicit product requirement.
- Keep the game usable with keyboard and touch input and test responsive behavior when changing presentation code.
- Use relative repository paths and never commit secrets, personal information, `node_modules`, `dist`, or local editor state.

## Quality gates

- Run `npm run check` and `npm run build` before committing.
- Keep TypeScript strict and avoid `any`.
- Update the README and version specification when behavior or developer workflows change.
