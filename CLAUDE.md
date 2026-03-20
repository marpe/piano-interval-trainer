# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Type-check (tsc) + production build to /dist
npm run preview   # Preview production build locally
```

For type-checking without a full build, use the local binary — `tsc` is not on the bash PATH (it's a `.ps1` script only available in PowerShell):

```bash
./node_modules/.bin/tsc --noEmit
```

No test framework is configured — there are no automated tests.

## Deployment

Pushes to `master` automatically deploy to GitHub Pages via `.github/workflows/pages.yml`. The app is served under the `/piano-interval-trainer/` base path (configured in `vite.config.ts`).

## Code style

- `if` statements always use braces, even for single-line bodies
- Opening `{` stays on the same line; closing `}` is on its own line

## Architecture

Piano interval ear-training app built with Solid.js + TypeScript + Vite.

**State management** — Three `createStore` objects in `App.tsx` (`GameSettings`, `ScoreState`, `LevelState`) are the single source of truth. `createEffect` watchers in `App.tsx` sync them to `localStorage` automatically (via `storage.ts`).

**Core data flow:**
1. `intervals.ts` — Defines all 13 intervals and which intervals unlock at each of the 12 difficulty levels.
2. `audio.ts` — Loads piano MP3 samples from `/sound/88-virtual/` at startup and exposes play functions. Also synthesizes correct/wrong feedback via the Web Audio API.
3. `Game.tsx` — Picks a random interval from the active set, plays it via `audio.ts`, then waits for the user to click a key on the piano or a button. Emits score events upward via callbacks.
4. `Piano.tsx` — Visual keyboard; highlights the root and answer keys during feedback.
5. `Settings.tsx` — Edits `GameSettings` in place; unlocked intervals per level are enforced here.

**Key types** are in `types.ts`: `Interval`, `GameSettings`, `ScoreState`, `LevelState`, `PlaybackMode`, `GameMode`.
