# Hurry-Go-Round v0.6.0 Codex Task

## Purpose

Implement **v0.6.0 — Mixed Cargo, Visual Polish & Expanded Automation** as an incremental update to the existing v0.5.0 codebase.

This directory is the authoritative implementation brief for the Codex task:

- `CARGO_UI_ART.md`: mixed cargo, HUD, sign layout, contextual guidance, feed/egg facilities, and visual polish.
- `AUTOMATION_CUSTOMERS.md`: corn automation, poultry automation, hiring, customer patience, and queue abandonment.
- `VALIDATION.md`: invariants, automated tests, manual acceptance, performance, build safety, and final report.

Read these files together with:

- `AGENTS.md`
- `README.md`
- `docs/V0.5.0_SPEC.md`
- `docs/ART_DIRECTION.md`
- the current implementation and tests

## Mandatory base-commit check

At the time this brief was prepared, `main` was:

```text
fc648a6c7daa5ae7b3e1a29b248ad1de2ccdd3e9
```

Before editing, run:

```bash
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git status --short
```

The task must start from the true latest `main`. If `HEAD` does not match the latest `main`, do not edit files; report the mismatch and stop.

Do not continue an old Codex task or stale worktree.

## Incremental-update rules

Do not initialize or recreate the project. Do not recreate Vite, Phaser, CI, GitHub Pages, `AGENTS.md`, or previous specifications.

The following existing files must not appear as newly added:

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
```

If they appear as newly added, stop without creating a pull request.

## Versioning and documentation

Update `package.json` and `package-lock.json` from `0.5.0` to `0.6.0`.

Create:

```text
docs/V0.6.0_SPEC.md
```

Update:

```text
README.md
docs/ART_DIRECTION.md
```

Do not create a Git tag or GitHub Release.

## Product-level requirements

Preserve all v0.5.0 features. Add:

1. Mixed wheat, corn, and egg cargo in one player basket.
2. One shared capacity across resources.
3. Mixed-cargo player art and HUD.
4. Round-robin mixed-resource barn unloading.
5. Removal of duplicated mutable inventory state.
6. Central sign placement with overlap avoidance and LOD.
7. Central contextual guidance and notification cooldowns.
8. Better graphics for the farm, signs, characters, crops, chickens, feed trough, and egg storage.
9. Corn harvest and transport workers.
10. A poultry caretaker who supplies feed and carries eggs to the barn.
11. Customer stock-out patience and abandonment after prolonged inability to buy.
12. Expanded deterministic tests and responsive checks.

## Public language

All public in-game labels, tutorials, status messages, facility labels, purchase messages, worker labels, and customer messages must be Japanese. The title `Hurry-Go-Round` and version number may remain in English.

## Explicit non-goals

Do not add new crop species, cows, pigs, sheep, processed products, cooking, seasons, weather, generic pathfinding, persistence, PWA support, audio, accounts, online services, advertising, payments, or multiplayer.

Do not add React, an ECS library, a pathfinding library, or another UI framework.

## Required validation

Before finishing:

```bash
npm ci --no-audit --no-fund
npm run check
npm run build
```

Preserve:

```ts
base: "/hurry-go-round/"
```

Suggested pull-request title:

```text
Add v0.6.0 mixed cargo, visual polish, customer patience, and expanded automation
```
