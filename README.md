# Periscope

A free, web-playable Battleship game for a five-year-old, playing solo against the computer.

> Primary player: 5 years old. No reading required. Every event is announced aloud; visuals carry the same information independently.

## What it is

Periscope is a single-player Battleship game built with React + TypeScript + Vite. The design concept is “you are inside the sub”: the enemy sea is a large lit scope panel; the player's fleet is a small passive readout underneath. This asymmetry prevents the classic kid-error of firing at their own fleet.

**Board modes**
- **Little Captain** — 6×6 grid, 3 ships (3, 2, 2). 3–5 minute games. Default.
- **Admiral** — 10×10 grid, 5 ships (5, 4, 3, 3, 2). 15–20 minute games.

**Opponent tiers** selected by picture, not word:
- Rookie — uniform random untried cells. No adjacency memory.
- Sailor — hunt/target with orthogonal neighbour queue.
- Admiral — parity-restricted hunt + probability-density search over legal placements.

**Turn rule:** exactly one shot per turn, always — a hit does not earn another shot. Firing an
already-fired cell is a no-op that does not consume a turn. See `docs/BATTLESHIP-RULES.md` for
the authority on this and other game mechanics.

Stack: React 19, Vite, TypeScript, Tailwind CSS 4, Zustand for UI-only state, Vitest + Testing Library.

## Architecture

```
src/
  core/          # Pure game logic, no UI imports
    coords.ts      Coord type, index↔coord, labels
    fleet.ts       Fleet definitions per BoardMode
    placement.ts   canPlace, place, randomFleet, shuffle, rotate
    board.ts       Board type, fire(), cellState, sunk detection
    game.ts        State machine: setup → playing → over
    rng.ts         Injectable RNG for determinism
  ai/
    rookie.ts, sailor.ts, admiral.ts   # (view) => Coord
    view.ts      OpponentView helpers, untriedCells, unresolvedHits
    simulate.ts  Deterministic game simulation
  ui/
    screens/     GameScreen
    components/  Grid, Cell, Bezel, TurnBar, FleetPips, LastShotChip, AnnouncementBar, Takeover
    store/       Zustand store for UI state only
    tokens.css   Design palette as CSS custom properties
    fonts.css
  test/          Vitest setup
```

Core is framework-free and pure. React never owns game state; UI derives from core state.

State flow:
- `src/core/game.ts` defines `GameState` with phase, turn, player/computer boards, lastShot, winner.
- `newGame`, `shufflePlayerFleet`, `movePlayerShip`, `startPlaying`, `applyShot` are pure transitions.
- AI strategies live in `src/ai/` and operate on `OpponentView`, never on mutable state.
- UI store (`src/ui/store/gameStore.ts`) holds UI concerns only; turns delegate to core.

## Getting started

### Prerequisites

Node 18+ and pnpm (repo uses pnpm-lock.yaml). `pnpm` is used for install.

### Install

```bash
pnpm install
```

### Run dev server

```bash
pnpm dev
```

Vite dev server starts at http://localhost:5173

### Build

```bash
pnpm build
```

Runs `tsc --noEmit && vite build` → `dist/`

### Preview production build

```bash
pnpm preview
```

### Tests

```bash
pnpm test          # vitest run
pnpm test:watch    # vitest watch
```

Tests cover core logic exhaustively, AI invariants, and UI flows with Testing Library.

## Project structure

```
.
├─ src/
│  ├─ core/          # Game engine, pure TS
│  ├─ ai/            # Strategies and simulation
│  ├─ ui/
│  │  ├─ components/
│  │  ├─ screens/
│  │  ├─ store/
│  ├─ main.tsx
│  ├─ App.tsx
│  └─ index.css
├─ docs/
│  ├─ design/        # Design brief and extracts
│  └─ superpowers/   # Specs and plans
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ index.html
```

### Key files

- `package.json` — scripts: dev, build, preview, test
- `vite.config.ts` — React plugin + Tailwind Vite plugin, Vitest config with jsdom
- `tsconfig.json` — ES2022, strict, bundler module resolution, noEmit
- `src/ui/tokens.css` — palette from spec: `--hull`, `--panel`, `--scope`, `--amber`, `--sunk`, etc.
- `src/core/fleet.ts` — BoardMode definitions
- `src/ui/screens/GameScreen.tsx` — Main game screen, layout switching

## Design notes

- Turn state is the bezel: whole viewport `box-shadow` changes to amber when it is player's turn.
- Cell states distinguished by glyph and border-radius, not colour alone.
- Minimum tap target 64×64 CSS px, grid cells ≥44px.
- Audio architecture: no runtime AI inference. Lines are baked at build time; see `docs/superpowers/specs/2026-08-19-periscope-battleship-design.md` §8.

## License

Private project. See repo owner for details.
