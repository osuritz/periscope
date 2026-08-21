# Periscope

A free, web-playable Battleship game for a five-year-old to play against the computer, with
pre-baked AI voice announcements. React 19 + Vite + Tailwind 4 + TypeScript, deployed as a
static site.

## Read before changing game behaviour

**`docs/BATTLESHIP-RULES.md` is the authority for how the game is played.** Read it before
touching turn order, shot resolution, ship placement, coordinate labels, or what gets announced.
Do not infer the rules from the code or from how you remember Battleship working — this project
has already shipped three rule errors that came from exactly that, and they are listed in that
file so they are not repeated.

`docs/superpowers/specs/2026-08-19-periscope-battleship-design.md` is the design authority:
palette, typography, layouts, screens, and audio architecture. The plans in
`docs/superpowers/plans/` argue from it.

## Architecture

Layering is strict and enforced by a test (`src/core/isolation.test.ts`):

```
src/core/   pure game engine — no React, no DOM, no window, no Date, no Math.random
src/ai/     three opponent strategies; depends on core
src/ui/     React; depends on both
```

- **`src/core/**` and `src/ai/**` must never import from `src/ui/**` or `src/audio/**`**, and
  `src/core/**` must never import from `src/ai/**`.
- **All randomness flows through an injected `Rng = () => number`.** Exactly one `Math.random`
  exists in the codebase — `systemRng` in `src/core/rng.ts`. Every game is reproducible from a
  seed.
- **`src/ui/store/gameStore.ts` is the only UI module permitted to call the engine.** The engine
  throws on illegal moves; the store guards every one of those sites so a stray tap from a child
  is quietly inert rather than a white screen.
- **A strategy may only ever see `OpponentView`**, which excludes ship placements. That type is
  the anti-cheating guarantee — the AI cannot see where your ships are, structurally.

## Two traps that have bitten before

- **Render cells from `cellState(board, coord, reveal)`, never from a shot's `result`.** `fire`
  marks only a destroyed ship's *final* cell `'sunk'`; earlier cells keep `'hit'` in the shot log
  forever. Reading the log draws a sunk ship as half-hit. This is documented on the `Shot` type.
- **Zustand selectors re-render only when the selected value changes.** Selecting
  `game.turn` as a primitive missed same-value transitions and froze the computer's turn
  mid-game. Depend on the `game` object, which is a fresh reference on every `set()`.

## Conventions

- **pnpm**, not npm or yarn.
- `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` are all on.
- Colours come from `src/ui/tokens.css` as `var(--token)`. Never hardcode a hex — a test enforces
  it.
- Cell states differ by **glyph and border-radius, not colour alone**, so the board is readable in
  grayscale and to a colourblind player.
- Interactive cells are never below 44px. The player's own deck is a readout and never
  interactive — that asymmetry is what stops a child firing at his own fleet.

## Commands

```bash
pnpm install
pnpm dev      # may need the Bash sandbox disabled for `listen EPERM`
pnpm test
pnpm build
```

## A note on tests

This project has repeatedly shipped tests that could not fail — an assertion comparing a value to
itself, a bound guaranteed by a loop condition, a presence check that passed against an empty
render. When you add a test, break the thing it covers and confirm it actually fails. A green
suite that cannot go red is worse than no suite, because it is trusted.
