# Piano Interval Trainer

A web-based ear training app for learning to recognize musical intervals. Listen to two notes played on a piano and identify the interval between them.

**Live app:** https://martinpersson.org/piano-interval-trainer/

## Features

- 13 intervals from Unison to Octave, each with a song mnemonic as a memory aid
- 12 progressive levels that gradually introduce new intervals as you improve
- Ascending, descending, or simultaneous playback modes
- Per-interval accuracy stats and streak tracking
- Settings and progress saved automatically in the browser

## Tech stack

- [Solid.js](https://www.solidjs.com/) — reactive UI
- [Vite](https://vitejs.dev/) — build tooling
- TypeScript
- Web Audio API

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is written to `dist/`. The app is deployed automatically to GitHub Pages on push to `master`.
