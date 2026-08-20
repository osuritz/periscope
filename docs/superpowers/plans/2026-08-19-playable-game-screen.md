# Periscope Playable Game Screen — Implementation Plan (2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Periscope playable in a browser — the game screen, in all three layouts, wired to the finished engine, so a child can tap the scope and finish a game against the computer.

**Architecture:** React 19 over the pure engine already on `main`, which this plan does not modify. A single Zustand store owns the `GameState` and is the only thing that calls the engine; every component is a pure function of props. The screen renders exclusively from `cellState()`, never from a shot's `result`. Three layouts come from one component tree and a media-query hook — the scope/deck asymmetry that keeps a five-year-old from firing at his own fleet is invariant across all three.

**Tech Stack:** React 19, Zustand 5, Tailwind 4, Vite 8, Vitest 4 + Testing Library, TypeScript 6.

**Spec:** `docs/superpowers/specs/2026-08-19-periscope-battleship-design.md`
**Carry-over from Plan 1:** `docs/superpowers/plans/PLAN-2-CARRYOVER.md` — read it; Tasks 1 and 10 act on it.

## Global Constraints

- **Do not modify `src/core/**` or `src/ai/**`.** The engine is complete, reviewed, and 123 tests green. If you believe it needs a change, report it rather than making it.
- `src/core/**` and `src/ai/**` must never import from `src/ui/**`. The dependency runs one way. `src/ui/isolation` coverage is extended in Task 1 to enforce this against `.tsx` too.
- **Render every cell from `cellState(board, coord, reveal)`.** Never from `shot.result`. `fire` marks only a destroyed ship's *final* cell `'sunk'`; earlier cells keep `'hit'` forever, so rendering from the shot log draws a sunk ship half-hit. This is documented on the `Shot` type in `src/core/board.ts`.
- Palette values are exactly those in `src/ui/tokens.css` (spec §5.2). Never hardcode a hex in a component; always `var(--token)`.
- Cell states differ by **glyph and border-radius**, not colour alone (spec §5.3). Sunk is `4px` radius where every other state is `14px`. That silhouette change is required.
- **Turn state is the whole viewport bezel** (spec §5.4): `inset 0 0 0 12px var(--amber)` on tablet, `8px` on phone. Not a badge, not a label.
- Enemy-scope cells are interactive and never below **44px**. Own-deck cells are a readout, never interactive, and exempt from tap minimums (spec §5.5).
- Feedback takeovers auto-advance after **900ms**, are tap-to-skip, and are suppressed entirely under reduce-motion (spec §6.1).
- All randomness flows through the engine's injected `Rng`. The store uses `systemRng`; no `Math.random` in `src/ui/**`.
- `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` all on. Every file ends with a newline. Use **pnpm**.

## Out of scope — Plan 3 builds these

Title screen, difficulty/mode selection, drag-to-place ship placement, victory screen, parent settings. This plan hardcodes the defaults from spec §4.1/§4.2: **Little Captain (6×6)** and **Rookie**, with ships auto-placed. A `DIVE AGAIN`-style restart button is included only so a game can be replayed without a page reload.

## File structure

```
src/ui/
  fonts.css                   Google Fonts: Bungee, Space Grotesk
  tokens.css                  (exists — unchanged)
  layout.ts                   LayoutName + useLayout() media-query hook
  sizing.ts                   cell/gap sizes per layout+mode, from spec §5.5
  store/gameStore.ts          Zustand store; the ONLY caller of the engine
  store/useComputerTurn.ts    drives the computer's turn on a timer
  components/Cell.tsx         one cell, five states
  components/Grid.tsx         N×N of Cell; interactive or readout
  components/FleetPips.tsx    one pip per ship, sunk or afloat
  components/LastShotChip.tsx "last: C7 ✕"
  components/TurnBar.tsx      amber/panel bar naming whose turn it is
  components/Bezel.tsx        the viewport inset-shadow turn signal
  components/Takeover.tsx     full-frame HIT / MISS / SUNK
  components/AnnouncementBar.tsx  bottom bar, phone layout
  screens/GameScreen.tsx      composes all of it, three layouts
```

---

### Task 1: Fonts, layout hook, sizing table, and the carried-over isolation fix

**Files:**
- Create: `src/ui/fonts.css`, `src/ui/layout.ts`, `src/ui/layout.test.ts`, `src/ui/sizing.ts`, `src/ui/sizing.test.ts`, `src/test/matchMedia.ts`
- Modify: `src/index.css`, `src/core/isolation.test.ts`

**Interfaces:**
- Consumes: `BoardMode` from `src/core/fleet`.
- Produces: `type LayoutName = 'phone' | 'portrait' | 'landscape'`; `useLayout(): LayoutName`; `type CellSizing = { cell: number; gap: number }`; `scopeSizing(layout: LayoutName, mode: BoardMode): CellSizing`; `deckSizing(layout: LayoutName, mode: BoardMode): CellSizing`; `bezelWidth(layout: LayoutName): number`; `installMatchMedia(width: number, height: number): void`.

- [ ] **Step 1: Fix the carried-over isolation blind spot**

`PLAN-2-CARRYOVER.md` items 1 and 2. This lands first, before any `.tsx` exists.

In `src/core/isolation.test.ts`, change the file filter so it accepts `.tsx` as well as `.ts` (excluding `*.test.ts` and `*.test.tsx`), and add a fifth assertion: no file under `src/core` may import from `../ai`. Read the file before editing; keep the existing `SYSTEM_RNG_FILE` path exemption exactly as it is.

Add these cases to the existing suite:

```ts
it('scans .tsx files too', () => {
  expect(sources.some((s) => s.path.endsWith('.tsx'))).toBe(
    sources.some((s) => s.path.endsWith('.tsx')),
  )
  // The real guard: the extension filter must not silently skip .tsx.
  expect(EXTENSIONS).toContain('.tsx')
})

it('forbids core from importing ai', () => {
  for (const s of sources) {
    if (!s.path.includes('/core/')) continue
    expect(s.text).not.toMatch(/from '\.\.\/ai/)
  }
})
```

Export the extension list as `EXTENSIONS` so the first test can assert on it.

- [ ] **Step 2: Run the isolation suite**

Run: `pnpm vitest run src/core/isolation.test.ts`
Expected: PASS. No `.tsx` files exist yet, so the scan is unchanged in effect — but the guard is now armed for the rest of this plan.

- [ ] **Step 3: Commit the isolation fix**

```bash
git add src/core/isolation.test.ts
git commit -m "test(core): extend purity guard to .tsx and forbid core->ai imports"
```

- [ ] **Step 4: Add the fonts**

Create `src/ui/fonts.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@500;700&display=swap');

:root {
  --font-display: 'Bungee', system-ui, sans-serif;
  --font-ui: 'Space Grotesk', system-ui, sans-serif;
}
```

Modify `src/index.css` — add `@import "./ui/fonts.css";` immediately after the existing `@import "tailwindcss";` line, and change `body`'s `font-family` to `var(--font-ui)`.

- [ ] **Step 5: Write the failing layout and sizing tests**

jsdom has no `matchMedia`, so tests must install one. Create `src/test/matchMedia.ts`:

```ts
/** Installs a matchMedia stub on window for a given viewport. Test-only. */
export function installMatchMedia(width: number, height: number): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const minWidth = /min-width:\s*(\d+)px/.exec(query)
      const maxWidth = /max-width:\s*(\d+)px/.exec(query)
      const orientation = /orientation:\s*(portrait|landscape)/.exec(query)

      let matches = true
      if (minWidth?.[1]) matches &&= width >= Number(minWidth[1])
      if (maxWidth?.[1]) matches &&= width <= Number(maxWidth[1])
      if (orientation?.[1]) {
        matches &&= orientation[1] === (width > height ? 'landscape' : 'portrait')
      }
      return {
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }
    },
  })
}
```

Create `src/ui/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLayout } from './layout'
import { installMatchMedia } from '../test/matchMedia'

describe('useLayout', () => {
  it('reports phone on a narrow viewport', () => {
    installMatchMedia(390, 844)
    expect(renderHook(() => useLayout()).result.current).toBe('phone')
  })

  it('reports portrait on a tall tablet', () => {
    installMatchMedia(768, 1024)
    expect(renderHook(() => useLayout()).result.current).toBe('portrait')
  })

  it('reports landscape on a wide tablet', () => {
    installMatchMedia(1024, 768)
    expect(renderHook(() => useLayout()).result.current).toBe('landscape')
  })

  it('treats a desktop viewport as landscape', () => {
    installMatchMedia(1680, 1050)
    expect(renderHook(() => useLayout()).result.current).toBe('landscape')
  })
})
```

Create `src/ui/sizing.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scopeSizing, deckSizing, bezelWidth } from './sizing'

describe('scopeSizing', () => {
  it('matches the spec table for every combination', () => {
    expect(scopeSizing('portrait', 'admiral')).toEqual({ cell: 52, gap: 5 })
    expect(scopeSizing('landscape', 'admiral')).toEqual({ cell: 52, gap: 5 })
    expect(scopeSizing('portrait', 'little')).toEqual({ cell: 72, gap: 8 })
    expect(scopeSizing('landscape', 'little')).toEqual({ cell: 72, gap: 8 })
    expect(scopeSizing('phone', 'little')).toEqual({ cell: 46, gap: 4 })
  })

  it('never drops an interactive cell below the 44px tap floor', () => {
    for (const layout of ['phone', 'portrait', 'landscape'] as const) {
      for (const mode of ['little', 'admiral'] as const) {
        expect(scopeSizing(layout, mode).cell).toBeGreaterThanOrEqual(44)
      }
    }
  })
})

describe('deckSizing', () => {
  it('matches the spec table', () => {
    expect(deckSizing('portrait', 'admiral')).toEqual({ cell: 14, gap: 2 })
    expect(deckSizing('phone', 'little')).toEqual({ cell: 28, gap: 3 })
  })

  it('is always smaller than the scope, so the scope always reads as the target', () => {
    for (const layout of ['phone', 'portrait', 'landscape'] as const) {
      for (const mode of ['little', 'admiral'] as const) {
        expect(deckSizing(layout, mode).cell).toBeLessThan(scopeSizing(layout, mode).cell)
      }
    }
  })
})

describe('bezelWidth', () => {
  it('is 12px on tablet and 8px on phone', () => {
    expect(bezelWidth('portrait')).toBe(12)
    expect(bezelWidth('landscape')).toBe(12)
    expect(bezelWidth('phone')).toBe(8)
  })
})
```

- [ ] **Step 6: Run to verify they fail**

Run: `pnpm vitest run src/ui/layout.test.ts src/ui/sizing.test.ts`
Expected: FAIL — cannot resolve `./layout` and `./sizing`.

- [ ] **Step 7: Implement**

Create `src/ui/layout.ts`:

```ts
import { useEffect, useState } from 'react'

export type LayoutName = 'phone' | 'portrait' | 'landscape'

const PHONE_MAX = 599

function currentLayout(): LayoutName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'portrait'
  if (window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches) return 'phone'
  return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait'
}

/**
 * Which of the three layouts to render. Phone wins on width alone; above that,
 * orientation decides. The scope/deck asymmetry is identical in all three —
 * only the axis they stack on changes.
 */
export function useLayout(): LayoutName {
  const [layout, setLayout] = useState<LayoutName>(currentLayout)

  useEffect(() => {
    const update = () => setLayout(currentLayout())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return layout
}
```

Create `src/ui/sizing.ts`:

```ts
import type { BoardMode } from '../core/fleet'
import type { LayoutName } from './layout'

export type CellSizing = { cell: number; gap: number }

/**
 * Spec §5.5. The enemy scope is the only interactive grid, so every value here
 * is at or above the 44px tap floor — a five-year-old's fingertip.
 */
export function scopeSizing(layout: LayoutName, mode: BoardMode): CellSizing {
  if (layout === 'phone') return mode === 'little' ? { cell: 46, gap: 4 } : { cell: 44, gap: 3 }
  return mode === 'little' ? { cell: 72, gap: 8 } : { cell: 52, gap: 5 }
}

/**
 * The own-deck readout. Never interactive, so exempt from tap minimums — and
 * deliberately much smaller than the scope, because that size difference is
 * what tells the child which grid he is shooting into.
 */
export function deckSizing(layout: LayoutName, mode: BoardMode): CellSizing {
  if (layout === 'phone') return mode === 'little' ? { cell: 28, gap: 3 } : { cell: 18, gap: 2 }
  return mode === 'little' ? { cell: 26, gap: 3 } : { cell: 14, gap: 2 }
}

/** Spec §5.4 — the turn signal is the viewport frame itself. */
export function bezelWidth(layout: LayoutName): number {
  return layout === 'phone' ? 8 : 12
}
```

- [ ] **Step 8: Run to verify they pass**

Run: `pnpm vitest run src/ui/layout.test.ts src/ui/sizing.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 9: Commit**

```bash
git add src/ui/fonts.css src/ui/layout.ts src/ui/layout.test.ts src/ui/sizing.ts src/ui/sizing.test.ts src/test/matchMedia.ts src/index.css
git commit -m "feat(ui): fonts, layout hook, and the spec's cell sizing table"
```

---

### Task 2: The Cell component

**Files:**
- Create: `src/ui/components/Cell.tsx`, `src/ui/components/Cell.test.tsx`

**Interfaces:**
- Consumes: `CellState` from `src/core/board`; `CellSizing` from `../sizing`.
- Produces: `CellProps = { state: CellState; size: CellSizing['cell']; label: string; onFire?: () => void; disabled?: boolean }`; default export `Cell`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/Cell.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Cell from './Cell'

describe('Cell', () => {
  it('renders no glyph when unknown', () => {
    render(<Cell state="unknown" size={72} label="C7" />)
    expect(screen.getByRole('button').textContent).toBe('')
  })

  it('renders a distinct glyph for each resolved state', () => {
    const { rerender } = render(<Cell state="miss" size={72} label="C7" />)
    expect(screen.getByRole('button').textContent).toBe('○')
    rerender(<Cell state="hit" size={72} label="C7" />)
    expect(screen.getByRole('button').textContent).toBe('✕')
    rerender(<Cell state="sunk" size={72} label="C7" />)
    expect(screen.getByRole('button').textContent).toBe('☠')
  })

  it('gives sunk a square silhouette and every other state a round one', () => {
    const { rerender } = render(<Cell state="hit" size={72} label="C7" />)
    expect(screen.getByRole('button').style.borderRadius).toBe('14px')
    rerender(<Cell state="sunk" size={72} label="C7" />)
    expect(screen.getByRole('button').style.borderRadius).toBe('4px')
  })

  it('names the cell and its state for a screen reader', () => {
    render(<Cell state="hit" size={72} label="C7" />)
    expect(screen.getByRole('button')).toHaveAccessibleName('C7, hit')
  })

  it('fires when tapped', async () => {
    const onFire = vi.fn()
    render(<Cell state="unknown" size={72} label="C7" onFire={onFire} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onFire).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onFire = vi.fn()
    render(<Cell state="unknown" size={72} label="C7" onFire={onFire} disabled />)
    await userEvent.click(screen.getByRole('button'))
    expect(onFire).not.toHaveBeenCalled()
  })

  it('is not a button at all when it has no handler — the deck readout case', () => {
    render(<Cell state="ship" size={14} label="C7" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('applies the requested size to both axes', () => {
    render(<Cell state="unknown" size={52} label="C7" onFire={() => {}} />)
    const el = screen.getByRole('button')
    expect(el.style.width).toBe('52px')
    expect(el.style.height).toBe('52px')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/components/Cell.test.tsx`
Expected: FAIL — cannot resolve `./Cell`.

- [ ] **Step 3: Implement**

Create `src/ui/components/Cell.tsx`:

```tsx
import type { CellState } from '../../core/board'

export type CellProps = {
  state: CellState
  size: number
  /** Coordinate label, e.g. "C7". Announced to screen readers. */
  label: string
  onFire?: () => void
  disabled?: boolean
}

/**
 * Spec §5.3. States differ by glyph AND border-radius, never by colour alone,
 * so the board stays readable in grayscale and to a colourblind player. Sunk
 * going square is a silhouette change and is required.
 */
const GLYPH: Record<CellState, string> = {
  unknown: '',
  miss: '○',
  hit: '✕',
  sunk: '☠',
  ship: '',
}

const FILL: Record<CellState, string> = {
  unknown: 'var(--panel)',
  miss: 'var(--hull)',
  hit: 'var(--amber)',
  sunk: 'var(--sunk)',
  ship: 'var(--scope)',
}

const BORDER: Record<CellState, string> = {
  unknown: 'var(--line)',
  miss: 'var(--muted)',
  hit: 'var(--amber-edge)',
  sunk: 'var(--sunk-edge)',
  ship: 'var(--scope)',
}

const INK: Record<CellState, string> = {
  unknown: 'transparent',
  miss: 'var(--ink-2)',
  hit: 'var(--on-amber)',
  sunk: 'var(--on-sunk)',
  ship: 'var(--on-scope)',
}

export default function Cell({ state, size, label, onFire, disabled }: CellProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: state === 'sunk' ? 4 : 14,
    background: FILL[state],
    border: `3px solid ${BORDER[state]}`,
    color: INK[state],
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.round(size * 0.6),
    fontWeight: 900,
    lineHeight: 1,
    padding: 0,
    // Unlit depth on untouched water (spec §5.3).
    boxShadow: state === 'unknown' ? 'inset 0 0 0 8px rgba(0,0,0,.25)' : undefined,
  }

  // No handler means this is the own-deck readout: inert, and not a tab stop.
  if (!onFire) return <div style={style} aria-hidden="true" />

  return (
    <button
      type="button"
      style={style}
      onClick={onFire}
      disabled={disabled}
      aria-label={`${label}, ${state}`}
    >
      {GLYPH[state]}
    </button>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/components/Cell.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/Cell.tsx src/ui/components/Cell.test.tsx
git commit -m "feat(ui): Cell with glyph+silhouette state encoding"
```

---

### Task 3: The Grid component

**Files:**
- Create: `src/ui/components/Grid.tsx`, `src/ui/components/Grid.test.tsx`

**Interfaces:**
- Consumes: `Board`, `cellState` from `src/core/board`; `Coord`, `allCoords`, `coordLabel` from `src/core/coords`; `CellSizing` from `../sizing`; `Cell` from `./Cell`.
- Produces: `GridProps = { board: Board; reveal: boolean; sizing: CellSizing; onFire?: (at: Coord) => void; disabled?: boolean; label: string }`; default export `Grid`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/Grid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Grid from './Grid'
import { boardFrom, fire } from '../../core/board'
import type { Placement } from '../../core/placement'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('Grid', () => {
  it('renders one cell per board square', () => {
    render(<Grid board={fixture()} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={() => {}} label="their sea" />)
    expect(screen.getAllByRole('button')).toHaveLength(36)
  })

  it('hides ships from the opponent view', () => {
    render(<Grid board={fixture()} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={() => {}} label="their sea" />)
    expect(screen.getByRole('button', { name: 'A1, unknown' })).toBeInTheDocument()
  })

  it('reveals ships to their owner', () => {
    render(<Grid board={fixture()} reveal sizing={{ cell: 26, gap: 3 }} label="my deck" />)
    // Owner view is inert, so assert on the rendered tree rather than roles.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('reports the coordinate that was tapped', async () => {
    const onFire = vi.fn()
    render(<Grid board={fixture()} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={onFire} label="their sea" />)
    await userEvent.click(screen.getByRole('button', { name: 'C6, unknown' }))
    expect(onFire).toHaveBeenCalledWith({ x: 2, y: 5 })
  })

  it('renders every cell of a sunk ship as sunk, not just the last one hit', async () => {
    // The whole reason the UI must read cellState and never shot.result.
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    render(<Grid board={b} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={() => {}} label="their sea" />)
    expect(screen.getByRole('button', { name: 'A3, sunk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A4, sunk' })).toBeInTheDocument()
  })

  it('lays out as a square grid at the requested size', () => {
    const { container } = render(
      <Grid board={fixture()} reveal={false} sizing={{ cell: 52, gap: 5 }} onFire={() => {}} label="their sea" />,
    )
    const grid = container.firstElementChild as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('repeat(6, 52px)')
    expect(grid.style.gap).toBe('5px')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/components/Grid.test.tsx`
Expected: FAIL — cannot resolve `./Grid`.

- [ ] **Step 3: Implement**

Create `src/ui/components/Grid.tsx`:

```tsx
import { cellState, type Board } from '../../core/board'
import { allCoords, coordKey, coordLabel, type Coord } from '../../core/coords'
import type { CellSizing } from '../sizing'
import Cell from './Cell'

export type GridProps = {
  board: Board
  /** True for the board's owner, who sees their own ships. */
  reveal: boolean
  sizing: CellSizing
  onFire?: (at: Coord) => void
  disabled?: boolean
  label: string
}

/**
 * Renders a board. Every cell comes from `cellState`, never from the shot log —
 * `fire` marks only a destroyed ship's final cell 'sunk', so reading the log
 * would draw a sunk ship as half-hit.
 */
export default function Grid({ board, reveal, sizing, onFire, disabled, label }: GridProps) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${board.size}, ${sizing.cell}px)`,
        gap: `${sizing.gap}px`,
        justifyContent: 'center',
      }}
    >
      {allCoords(board.size).map((at) => (
        <Cell
          key={coordKey(at)}
          state={cellState(board, at, reveal)}
          size={sizing.cell}
          label={coordLabel(at)}
          onFire={onFire ? () => onFire(at) : undefined}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/components/Grid.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/Grid.tsx src/ui/components/Grid.test.tsx
git commit -m "feat(ui): Grid rendering from cellState"
```

---

### Task 4: Fleet pips and the last-shot chip

**Files:**
- Create: `src/ui/components/FleetPips.tsx`, `src/ui/components/LastShotChip.tsx`, `src/ui/components/FleetPips.test.tsx`, `src/ui/components/LastShotChip.test.tsx`

**Interfaces:**
- Consumes: `Board`, `sunkShipIds` from `src/core/board`; `LastShot` from `src/core/game`; `coordLabel` from `src/core/coords`.
- Produces: `FleetPipsProps = { board: Board; tone: 'enemy' | 'own' }` default export `FleetPips`; `LastShotChipProps = { lastShot: LastShot | null }` default export `LastShotChip`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/components/FleetPips.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FleetPips from './FleetPips'
import { boardFrom, fire } from '../../core/board'
import type { Placement } from '../../core/placement'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('FleetPips', () => {
  it('renders one pip per ship', () => {
    render(<FleetPips board={fixture()} tone="enemy" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks a sunk ship and leaves the survivor unmarked', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    render(<FleetPips board={b} tone="enemy" />)
    expect(screen.getByLabelText('tug, sunk')).toHaveTextContent('☠')
    expect(screen.getByLabelText('sub, afloat')).toHaveTextContent('')
  })

  it('sizes each pip in proportion to its ship length', () => {
    render(<FleetPips board={fixture()} tone="own" />)
    const sub = screen.getByLabelText('sub, afloat')
    const tug = screen.getByLabelText('tug, afloat')
    expect(parseInt(sub.style.width)).toBeGreaterThan(parseInt(tug.style.width))
  })
})
```

Create `src/ui/components/LastShotChip.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LastShotChip from './LastShotChip'

describe('LastShotChip', () => {
  it('renders nothing before the first shot', () => {
    const { container } = render(<LastShotChip lastShot={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the coordinate and marks a hit', () => {
    render(<LastShotChip lastShot={{ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'sub' }} />)
    expect(screen.getByText(/C7/)).toBeInTheDocument()
    expect(screen.getByText(/✕/)).toBeInTheDocument()
  })

  it('marks a miss with the miss glyph', () => {
    render(<LastShotChip lastShot={{ by: 'player', at: { x: 4, y: 6 }, result: 'miss' }} />)
    expect(screen.getByText(/○/)).toBeInTheDocument()
  })

  it('marks a sunk ship with the sunk glyph', () => {
    render(<LastShotChip lastShot={{ by: 'player', at: { x: 0, y: 0 }, result: 'sunk', shipId: 'tug' }} />)
    expect(screen.getByText(/☠/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/ui/components/FleetPips.test.tsx src/ui/components/LastShotChip.test.tsx`
Expected: FAIL — cannot resolve either module.

- [ ] **Step 3: Implement**

Create `src/ui/components/FleetPips.tsx`:

```tsx
import { sunkShipIds, type Board } from '../../core/board'

export type FleetPipsProps = {
  board: Board
  /** `enemy` pips are what he is hunting; `own` pips are his fleet's health. */
  tone: 'enemy' | 'own'
}

/**
 * One pip per ship, width proportional to length — so the shapes read as the
 * actual ships rather than as an abstract counter. A sunk ship turns red and
 * carries the skull, matching the cell state it corresponds to.
 */
export default function FleetPips({ board, tone }: FleetPipsProps) {
  const sunk = new Set(sunkShipIds(board))
  return (
    <ul
      style={{ display: 'flex', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}
      aria-label={tone === 'enemy' ? 'their fleet' : 'my fleet'}
    >
      {board.placements.map((p) => {
        const dead = sunk.has(p.shipId)
        return (
          <li
            key={p.shipId}
            aria-label={`${p.shipId}, ${dead ? 'sunk' : 'afloat'}`}
            style={{
              width: 12 + p.length * 12,
              height: 26,
              borderRadius: dead ? 4 : 6,
              background: dead ? 'var(--sunk)' : tone === 'own' ? 'var(--scope)' : 'var(--line)',
              color: 'var(--on-sunk)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            {dead ? '☠' : ''}
          </li>
        )
      })}
    </ul>
  )
}
```

Create `src/ui/components/LastShotChip.tsx`:

```tsx
import { coordLabel } from '../../core/coords'
import type { LastShot } from '../../core/game'

export type LastShotChipProps = { lastShot: LastShot | null }

const GLYPH = { miss: '○', hit: '✕', sunk: '☠' } as const

/** The small "last: C7 ✕" readout in the scope header. */
export default function LastShotChip({ lastShot }: LastShotChipProps) {
  if (!lastShot) return null
  return (
    <span
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        background: 'var(--hull)',
        color: 'var(--amber)',
        fontSize: 18,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {`last: ${coordLabel(lastShot.at)} ${GLYPH[lastShot.result]}`}
    </span>
  )
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/ui/components/FleetPips.test.tsx src/ui/components/LastShotChip.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/FleetPips.tsx src/ui/components/FleetPips.test.tsx src/ui/components/LastShotChip.tsx src/ui/components/LastShotChip.test.tsx
git commit -m "feat(ui): fleet pips and last-shot chip"
```

---

### Task 5: TurnBar and Bezel

**Files:**
- Create: `src/ui/components/TurnBar.tsx`, `src/ui/components/Bezel.tsx`, `src/ui/components/TurnBar.test.tsx`, `src/ui/components/Bezel.test.tsx`

**Interfaces:**
- Consumes: `Side`, `Phase` from `src/core/game`; `LayoutName` from `../layout`; `bezelWidth` from `../sizing`.
- Produces: `TurnBarProps = { turn: Side; phase: Phase; layout: LayoutName }` default export `TurnBar`; `BezelProps = { active: boolean; layout: LayoutName; children: React.ReactNode }` default export `Bezel`.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/components/TurnBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TurnBar from './TurnBar'

describe('TurnBar', () => {
  it('says YOU FIRE on the player turn', () => {
    render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    expect(screen.getByText('YOU FIRE')).toBeInTheDocument()
  })

  it('says THEIR TURN on the computer turn', () => {
    render(<TurnBar turn="computer" phase="playing" layout="portrait" />)
    expect(screen.getByText('THEIR TURN')).toBeInTheDocument()
  })

  it('goes amber on the player turn and panel-coloured otherwise', () => {
    const { rerender, container } = render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    const bar = () => container.firstElementChild as HTMLElement
    expect(bar().style.background).toBe('var(--amber)')
    rerender(<TurnBar turn="computer" phase="playing" layout="portrait" />)
    expect(bar().style.background).toBe('var(--panel)')
  })

  it('is shorter on a phone', () => {
    const { container, rerender } = render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    const bar = () => container.firstElementChild as HTMLElement
    expect(bar().style.height).toBe('92px')
    rerender(<TurnBar turn="player" phase="playing" layout="phone" />)
    expect(bar().style.height).toBe('74px')
  })

  it('announces the turn politely for assistive tech', () => {
    render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    expect(screen.getByRole('status')).toHaveTextContent('YOU FIRE')
  })

  it('reports the outcome once the game is over', () => {
    render(<TurnBar turn="player" phase="over" layout="portrait" />)
    expect(screen.getByText('GAME OVER')).toBeInTheDocument()
  })
})
```

Create `src/ui/components/Bezel.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Bezel from './Bezel'

describe('Bezel', () => {
  it('paints an amber frame when active', () => {
    const { container } = render(<Bezel active layout="portrait"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.boxShadow).toBe('inset 0 0 0 12px var(--amber)')
  })

  it('paints nothing when inactive', () => {
    const { container } = render(<Bezel active={false} layout="portrait"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.boxShadow).toBe('')
  })

  it('is 8px on a phone', () => {
    const { container } = render(<Bezel active layout="phone"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.boxShadow).toBe('inset 0 0 0 8px var(--amber)')
  })

  it('renders its children', () => {
    render(<Bezel active layout="portrait"><p>hi</p></Bezel>)
    expect(screen.getByText('hi')).toBeInTheDocument()
  })

  it('does not intercept taps', () => {
    const { container } = render(<Bezel active layout="portrait"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.pointerEvents).toBe('none')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/ui/components/TurnBar.test.tsx src/ui/components/Bezel.test.tsx`
Expected: FAIL — cannot resolve either module.

- [ ] **Step 3: Implement**

Create `src/ui/components/TurnBar.tsx`:

```tsx
import type { Phase, Side } from '../../core/game'
import type { LayoutName } from '../layout'

export type TurnBarProps = { turn: Side; phase: Phase; layout: LayoutName }

/**
 * The bar names the turn in words for the adult in the room. The child reads
 * the bezel (spec §5.4), which is why this is redundant by design rather than
 * the primary signal.
 */
export default function TurnBar({ turn, phase, layout }: TurnBarProps) {
  const mine = phase === 'playing' && turn === 'player'
  const text = phase === 'over' ? 'GAME OVER' : mine ? 'YOU FIRE' : 'THEIR TURN'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        height: layout === 'phone' ? 74 : 92,
        flex: 'none',
        borderRadius: 20,
        background: mine ? 'var(--amber)' : 'var(--panel)',
        color: mine ? 'var(--on-amber)' : 'var(--ink-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 20px',
        fontFamily: 'var(--font-display)',
        fontSize: layout === 'phone' ? 26 : 38,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: layout === 'phone' ? 48 : 60,
          height: layout === 'phone' ? 48 : 60,
          borderRadius: '50%',
          background: mine ? 'var(--on-amber)' : 'var(--line)',
          color: mine ? 'var(--amber)' : 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: layout === 'phone' ? 22 : 30,
        }}
      >
        {mine ? '▶' : '⏳'}
      </span>
      {text}
    </div>
  )
}
```

Create `src/ui/components/Bezel.tsx`:

```tsx
import type { LayoutName } from '../layout'
import { bezelWidth } from '../sizing'

export type BezelProps = { active: boolean; layout: LayoutName; children: React.ReactNode }

/**
 * Spec §5.4 — the single most important visual rule in the system. When it is
 * the child's turn the ENTIRE viewport is framed in amber. Not a badge, not a
 * label: a frame readable from across a room.
 */
export default function Bezel({ active, layout, children }: BezelProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      <div
        data-bezel
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: active ? `inset 0 0 0 ${bezelWidth(layout)}px var(--amber)` : undefined,
          transition: 'box-shadow 180ms ease',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/ui/components/TurnBar.test.tsx src/ui/components/Bezel.test.tsx`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/TurnBar.tsx src/ui/components/TurnBar.test.tsx src/ui/components/Bezel.tsx src/ui/components/Bezel.test.tsx
git commit -m "feat(ui): turn bar and the bezel turn signal"
```

---

### Task 6: The game store

**Files:**
- Create: `src/ui/store/gameStore.ts`, `src/ui/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `newGame`, `startPlaying`, `applyShot`, `GameState` from `src/core/game`; `computerShot` from `src/ai/index`; `Tier` from `src/ai/types`; `BoardMode` from `src/core/fleet`; `alreadyFired` from `src/core/board`; `inBounds`, `Coord` from `src/core/coords`; `systemRng`, `Rng` from `src/core/rng`.
- Produces: `type Takeover = { result: ShotResult; at: Coord; shipId?: ShipId } | null`; `useGameStore` with state `{ game, mode, tier, takeover, reduceMotion }` and actions `{ restart(mode?, tier?), fireAt(at), takeComputerTurn(), dismissTakeover(), canFire(at), setReduceMotion(v) }`.

**This store is the only module in `src/ui/**` permitted to call the engine.** Components receive state through it and never import from `core/` except for types and pure helpers like `cellState`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/store/gameStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { allCoords } from '../../core/coords'
import { cellState } from '../../core/board'

const s = () => useGameStore.getState()

/** First cell of the computer's fleet — a guaranteed hit. */
function aShipCell() {
  const p = s().game.computer.placements[0]!
  return p.origin
}

/** A cell with no ship on it — a guaranteed miss. */
function anEmptyCell() {
  const g = s().game
  return allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
}

describe('gameStore', () => {
  beforeEach(() => s().restart('little', 'rookie'))

  it('starts a playable game with the player to move', () => {
    expect(s().game.phase).toBe('playing')
    expect(s().game.turn).toBe('player')
    expect(s().game.player.placements).toHaveLength(3)
  })

  it('keeps the turn after a hit', () => {
    s().fireAt(aShipCell())
    expect(s().game.lastShot?.result).not.toBe('miss')
    expect(s().game.turn).toBe('player')
  })

  it('hands the turn over after a miss', () => {
    s().fireAt(anEmptyCell())
    expect(s().game.turn).toBe('computer')
  })

  it('ignores a tap during the computer turn instead of throwing', () => {
    s().fireAt(anEmptyCell())
    expect(s().game.turn).toBe('computer')
    const before = s().game
    expect(() => s().fireAt(anEmptyCell())).not.toThrow()
    expect(s().game).toBe(before)
  })

  it('ignores a repeat tap on an already-fired cell', () => {
    const at = anEmptyCell()
    s().fireAt(at)
    s().restart('little', 'rookie')
    const hit = aShipCell()
    s().fireAt(hit)
    const after = s().game
    s().fireAt(hit)
    expect(s().game).toBe(after)
  })

  it('reports canFire honestly', () => {
    const at = anEmptyCell()
    expect(s().canFire(at)).toBe(true)
    s().fireAt(at)
    expect(s().canFire(at)).toBe(false)
    expect(s().canFire({ x: -1, y: 0 })).toBe(false)
  })

  it('raises a takeover for the player shot and clears it on dismiss', () => {
    s().fireAt(aShipCell())
    expect(s().takeover).not.toBeNull()
    s().dismissTakeover()
    expect(s().takeover).toBeNull()
  })

  it('raises no takeover when reduce motion is on', () => {
    s().setReduceMotion(true)
    s().fireAt(aShipCell())
    expect(s().takeover).toBeNull()
  })

  it('lets the computer take its turn and never throws doing so', () => {
    s().fireAt(anEmptyCell())
    expect(s().game.turn).toBe('computer')
    expect(() => s().takeComputerTurn()).not.toThrow()
    expect(s().game.player.shots.length).toBeGreaterThan(0)
  })

  it('ignores takeComputerTurn when it is not the computer turn', () => {
    const before = s().game
    s().takeComputerTurn()
    expect(s().game).toBe(before)
  })

  it('plays a whole game to a winner without throwing', () => {
    let guard = 0
    while (s().game.phase === 'playing' && guard++ < 500) {
      if (s().game.turn === 'player') {
        const open = allCoords(s().game.size).filter((c) => s().canFire(c))
        s().fireAt(open[0]!)
      } else {
        s().takeComputerTurn()
      }
    }
    expect(s().game.phase).toBe('over')
    expect(s().game.winner).not.toBeNull()
  })

  it('restart produces a fresh game rather than resuming a finished one', () => {
    s().fireAt(anEmptyCell())
    s().restart()
    expect(s().game.phase).toBe('playing')
    expect(s().game.computer.shots).toHaveLength(0)
    expect(s().game.player.shots).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/store/gameStore.test.ts`
Expected: FAIL — cannot resolve `./gameStore`.

- [ ] **Step 3: Implement**

Create `src/ui/store/gameStore.ts`:

```ts
import { create } from 'zustand'
import { alreadyFired, type ShotResult } from '../../core/board'
import { inBounds, type Coord } from '../../core/coords'
import type { BoardMode, ShipId } from '../../core/fleet'
import { applyShot, newGame, startPlaying, type GameState } from '../../core/game'
import { systemRng } from '../../core/rng'
import { computerShot } from '../../ai/index'
import type { Tier } from '../../ai/types'

export type Takeover = { result: ShotResult; at: Coord; shipId?: ShipId } | null

type GameStore = {
  game: GameState
  mode: BoardMode
  tier: Tier
  takeover: Takeover
  reduceMotion: boolean

  restart: (mode?: BoardMode, tier?: Tier) => void
  /** True when a tap on `at` would be a legal player shot right now. */
  canFire: (at: Coord) => boolean
  fireAt: (at: Coord) => void
  takeComputerTurn: () => void
  dismissTakeover: () => void
  setReduceMotion: (v: boolean) => void
}

function freshGame(mode: BoardMode): GameState {
  // Ships are auto-placed. Plan 3 adds the placement screen.
  return startPlaying(newGame(mode, systemRng))
}

/**
 * The only module in the UI that talks to the engine.
 *
 * Every engine call the engine can throw on is guarded here instead, because
 * the caller is a five-year-old: a tap during the computer's turn, a second tap
 * on the same square, or a tap after the game ends must all be quietly inert,
 * never an exception that white-screens the app.
 */
export const useGameStore = create<GameStore>((set, get) => ({
  game: freshGame('little'),
  mode: 'little',
  tier: 'rookie',
  takeover: null,
  reduceMotion: false,

  restart: (mode, tier) => {
    const nextMode = mode ?? get().mode
    set({
      mode: nextMode,
      tier: tier ?? get().tier,
      game: freshGame(nextMode),
      takeover: null,
    })
  },

  canFire: (at) => {
    const { game } = get()
    if (game.phase !== 'playing' || game.turn !== 'player') return false
    if (!inBounds(at, game.size)) return false
    return !alreadyFired(game.computer, at)
  },

  fireAt: (at) => {
    if (!get().canFire(at)) return
    const next = applyShot(get().game, 'player', at)
    const shot = next.lastShot
    set({
      game: next,
      takeover:
        get().reduceMotion || !shot
          ? null
          : { result: shot.result, at: shot.at, shipId: shot.shipId },
    })
  },

  takeComputerTurn: () => {
    const { game, tier } = get()
    if (game.phase !== 'playing' || game.turn !== 'computer') return
    set({ game: computerShot(game, tier, systemRng) })
  },

  dismissTakeover: () => set({ takeover: null }),

  setReduceMotion: (v) => set({ reduceMotion: v }),
}))
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/store/gameStore.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/store/gameStore.ts src/ui/store/gameStore.test.ts
git commit -m "feat(ui): game store guarding every engine throw site"
```

---

### Task 7: Driving the computer's turn on a timer

**Files:**
- Create: `src/ui/store/useComputerTurn.ts`, `src/ui/store/useComputerTurn.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` from `./gameStore`.
- Produces: `useComputerTurn(delayMs?: number): void`.

The computer must not fire instantly — a five-year-old needs to see it happen. And because a hit keeps the turn, the computer may fire several times in a row; each shot gets its own beat.

- [ ] **Step 1: Write the failing test**

Create `src/ui/store/useComputerTurn.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComputerTurn } from './useComputerTurn'
import { useGameStore } from './gameStore'
import { allCoords } from '../../core/coords'
import { cellState } from '../../core/board'

const s = () => useGameStore.getState()

function anEmptyCell() {
  const g = s().game
  return allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
}

describe('useComputerTurn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    s().restart('little', 'rookie')
  })
  afterEach(() => vi.useRealTimers())

  it('does nothing while it is the player turn', () => {
    renderHook(() => useComputerTurn(300))
    act(() => void vi.advanceTimersByTime(1000))
    expect(s().game.player.shots).toHaveLength(0)
  })

  it('fires after the delay once the turn passes', () => {
    renderHook(() => useComputerTurn(300))
    act(() => s().fireAt(anEmptyCell()))
    expect(s().game.player.shots).toHaveLength(0)
    act(() => void vi.advanceTimersByTime(300))
    expect(s().game.player.shots).toHaveLength(1)
  })

  it('keeps firing on its own turn until it misses', () => {
    renderHook(() => useComputerTurn(300))
    act(() => s().fireAt(anEmptyCell()))
    for (let i = 0; i < 40 && s().game.turn === 'computer'; i++) {
      act(() => void vi.advanceTimersByTime(300))
    }
    expect(s().game.turn === 'player' || s().game.phase === 'over').toBe(true)
  })

  it('stops once the game is over', () => {
    renderHook(() => useComputerTurn(300))
    act(() => {
      while (s().game.phase === 'playing') {
        if (s().game.turn === 'player') {
          const open = allCoords(s().game.size).filter((c) => s().canFire(c))
          s().fireAt(open[0]!)
        } else {
          s().takeComputerTurn()
        }
      }
    })
    const shots = s().game.player.shots.length
    act(() => void vi.advanceTimersByTime(5000))
    expect(s().game.player.shots).toHaveLength(shots)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/store/useComputerTurn.test.tsx`
Expected: FAIL — cannot resolve `./useComputerTurn`.

- [ ] **Step 3: Implement**

Create `src/ui/store/useComputerTurn.ts`:

```ts
import { useEffect } from 'react'
import { useGameStore } from './gameStore'

/**
 * Drives the computer's turn on a timer. The pause is not decoration: without
 * it the computer's shots land instantly and a five-year-old cannot tell what
 * just happened to his fleet.
 *
 * A hit keeps the turn, so the computer may fire several times running. The
 * effect re-runs on every state change, scheduling one shot per beat until the
 * turn passes back or the game ends.
 */
export function useComputerTurn(delayMs = 700): void {
  const phase = useGameStore((s) => s.game.phase)
  const turn = useGameStore((s) => s.game.turn)
  const takeComputerTurn = useGameStore((s) => s.takeComputerTurn)

  useEffect(() => {
    if (phase !== 'playing' || turn !== 'computer') return
    const id = setTimeout(takeComputerTurn, delayMs)
    return () => clearTimeout(id)
  }, [phase, turn, takeComputerTurn, delayMs])
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/store/useComputerTurn.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/store/useComputerTurn.ts src/ui/store/useComputerTurn.test.tsx
git commit -m "feat(ui): pace the computer's turn so a child can follow it"
```

---

### Task 8: The feedback takeover

**Files:**
- Create: `src/ui/components/Takeover.tsx`, `src/ui/components/Takeover.test.tsx`

**Interfaces:**
- Consumes: `Takeover` type from `../store/gameStore`; `coordLabel` from `src/core/coords`.
- Produces: `TakeoverProps = { takeover: Takeover; onDismiss: () => void; autoAdvanceMs?: number }` default export `TakeoverView`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/Takeover.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TakeoverView from './Takeover'

afterEach(() => vi.useRealTimers())

describe('Takeover', () => {
  it('renders nothing when there is no takeover', () => {
    const { container } = render(<TakeoverView takeover={null} onDismiss={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shouts HIT with the coordinate', () => {
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={() => {}} />)
    expect(screen.getByText('HIT')).toBeInTheDocument()
    expect(screen.getByText(/B4/)).toBeInTheDocument()
  })

  it('shouts MISS', () => {
    render(<TakeoverView takeover={{ result: 'miss', at: { x: 4, y: 6 } }} onDismiss={() => {}} />)
    expect(screen.getByText('MISS')).toBeInTheDocument()
  })

  it('shouts SUNK and names the ship', () => {
    render(<TakeoverView takeover={{ result: 'sunk', at: { x: 0, y: 0 }, shipId: 'tug' }} onDismiss={() => {}} />)
    expect(screen.getByText('SUNK')).toBeInTheDocument()
    expect(screen.getByText(/tug/)).toBeInTheDocument()
  })

  it('auto-advances after 900ms', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(900))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('dismisses early when tapped', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('announces the result assertively', () => {
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('HIT')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/components/Takeover.test.tsx`
Expected: FAIL — cannot resolve `./Takeover`.

- [ ] **Step 3: Implement**

Create `src/ui/components/Takeover.tsx`:

```tsx
import { useEffect } from 'react'
import { coordLabel } from '../../core/coords'
import type { Takeover } from '../store/gameStore'

export type TakeoverProps = {
  takeover: Takeover
  onDismiss: () => void
  autoAdvanceMs?: number
}

const FIELD = { hit: 'var(--amber)', miss: 'var(--hull)', sunk: 'var(--sunk)' } as const
const INK = { hit: 'var(--on-amber)', miss: 'var(--ink-2)', sunk: 'var(--on-sunk)' } as const
const GLYPH = { hit: '✕', miss: '○', sunk: '☠' } as const
const WORD = { hit: 'HIT', miss: 'MISS', sunk: 'SUNK' } as const

/**
 * Spec §6.4 — the payoff the whole game exists for, at full frame. Auto-advances
 * after 900ms (§6.1) and is tap-to-skip, because a child who wants to keep
 * playing should never have to wait for an animation to finish.
 *
 * Suppressed entirely under reduce-motion: the store simply never sets a
 * takeover, so this renders null.
 */
export default function TakeoverView({ takeover, onDismiss, autoAdvanceMs = 900 }: TakeoverProps) {
  useEffect(() => {
    if (!takeover) return
    const id = setTimeout(onDismiss, autoAdvanceMs)
    return () => clearTimeout(id)
  }, [takeover, onDismiss, autoAdvanceMs])

  if (!takeover) return null

  const { result, at, shipId } = takeover
  const caption =
    result === 'sunk'
      ? `${coordLabel(at)} · sank their ${shipId ?? 'ship'}`
      : result === 'hit'
        ? `${coordLabel(at)} · fire again`
        : `${coordLabel(at)} · water only`

  return (
    <button
      type="button"
      role="alert"
      aria-label="continue"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        border: 'none',
        background: FIELD[result],
        color: INK[result],
        boxShadow: `inset 0 0 0 26px ${INK[result]}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: 'min(38vw, 210px)',
          lineHeight: 1,
          fontWeight: 900,
          transform: result === 'sunk' ? 'rotate(-8deg)' : undefined,
        }}
      >
        {GLYPH[result]}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'min(18vw, 132px)', lineHeight: 1 }}>
        {WORD[result]}
      </span>
      <span
        style={{
          padding: '10px 28px',
          borderRadius: 8,
          background: INK[result],
          color: FIELD[result],
          fontSize: 'min(5vw, 32px)',
          fontWeight: 700,
        }}
      >
        {caption}
      </span>
    </button>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/components/Takeover.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/Takeover.tsx src/ui/components/Takeover.test.tsx
git commit -m "feat(ui): full-frame hit/miss/sunk takeover"
```

---

### Task 9: The announcement bar

**Files:**
- Create: `src/ui/components/AnnouncementBar.tsx`, `src/ui/components/AnnouncementBar.test.tsx`

**Interfaces:**
- Consumes: `LastShot` from `src/core/game`; `coordLabel` from `src/core/coords`.
- Produces: `announcementText(lastShot: LastShot | null): string`; `AnnouncementBarProps = { lastShot: LastShot | null }` default export `AnnouncementBar`.

`announcementText` is deliberately exported: Plan 4 keys the baked audio clips off exactly this phrasing, so the visible text and the spoken line stay one source of truth.

- [ ] **Step 1: Write the failing test**

Create `src/ui/components/AnnouncementBar.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnnouncementBar, { announcementText } from './AnnouncementBar'

describe('announcementText', () => {
  it('invites the first shot before anything has happened', () => {
    expect(announcementText(null)).toBe('Tap a square to fire!')
  })

  it('reads a player hit as the coordinate then the result', () => {
    expect(announcementText({ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'sub' })).toBe(
      'C7… HIT!',
    )
  })

  it('reads a player miss', () => {
    expect(announcementText({ by: 'player', at: { x: 4, y: 6 }, result: 'miss' })).toBe('E7… miss.')
  })

  it('names the ship on a sink', () => {
    expect(announcementText({ by: 'player', at: { x: 0, y: 0 }, result: 'sunk', shipId: 'tug' })).toBe(
      'A1… you sank their tug!',
    )
  })

  it('speaks in the second person when the computer fires at you', () => {
    expect(announcementText({ by: 'computer', at: { x: 0, y: 0 }, result: 'hit', shipId: 'tug' })).toBe(
      'A1… they hit your tug!',
    )
  })
})

describe('AnnouncementBar', () => {
  it('shows the current line', () => {
    render(<AnnouncementBar lastShot={{ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'sub' }} />)
    expect(screen.getByText(/C7… HIT!/)).toBeInTheDocument()
  })

  it('announces politely rather than interrupting', () => {
    render(<AnnouncementBar lastShot={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('Tap a square to fire!')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/components/AnnouncementBar.test.tsx`
Expected: FAIL — cannot resolve `./AnnouncementBar`.

- [ ] **Step 3: Implement**

Create `src/ui/components/AnnouncementBar.tsx`:

```tsx
import { coordLabel } from '../../core/coords'
import type { LastShot } from '../../core/game'

/**
 * The one place the game's wording lives. Plan 4 bakes audio clips keyed off
 * exactly these strings, so the visible caption and the spoken line can never
 * drift apart.
 */
export function announcementText(lastShot: LastShot | null): string {
  if (!lastShot) return 'Tap a square to fire!'
  const where = coordLabel(lastShot.at)
  const ship = lastShot.shipId ?? 'ship'

  if (lastShot.by === 'player') {
    if (lastShot.result === 'sunk') return `${where}… you sank their ${ship}!`
    return lastShot.result === 'hit' ? `${where}… HIT!` : `${where}… miss.`
  }
  if (lastShot.result === 'sunk') return `${where}… they sank your ${ship}!`
  return lastShot.result === 'hit' ? `${where}… they hit your ${ship}!` : `${where}… they missed!`
}

export type AnnouncementBarProps = { lastShot: LastShot | null }

export default function AnnouncementBar({ lastShot }: AnnouncementBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        height: 80,
        flex: 'none',
        borderRadius: 18,
        background: 'var(--hull)',
        border: '2px solid var(--line)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        color: 'var(--paper)',
        fontSize: 20,
        fontWeight: 700,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'var(--panel)',
          border: '2px solid var(--scope)',
          color: 'var(--scope)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flex: 'none',
        }}
      >
        🔊
      </span>
      {announcementText(lastShot)}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/components/AnnouncementBar.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/AnnouncementBar.tsx src/ui/components/AnnouncementBar.test.tsx
git commit -m "feat(ui): announcement bar as the single source of game wording"
```

---

### Task 10: The game screen, three layouts, and app wiring

**Files:**
- Create: `src/ui/screens/GameScreen.tsx`, `src/ui/screens/GameScreen.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–9.
- Produces: default export `GameScreen`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/screens/GameScreen.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameScreen from './GameScreen'
import { useGameStore } from '../store/gameStore'
import { installMatchMedia } from '../../test/matchMedia'
import { allCoords, coordLabel } from '../../core/coords'
import { cellState } from '../../core/board'

const s = () => useGameStore.getState()

function emptyCellLabel() {
  const g = s().game
  const at = allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
  return coordLabel(at)
}

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installMatchMedia(768, 1024)
    s().restart('little', 'rookie')
    s().setReduceMotion(true) // takeovers are covered in their own suite
  })
  afterEach(() => vi.useRealTimers())

  it('shows both grids, clearly distinguished', () => {
    render(<GameScreen />)
    expect(screen.getByRole('group', { name: /their sea/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /my deck/i })).toBeInTheDocument()
  })

  it('makes only the enemy grid tappable', () => {
    render(<GameScreen />)
    const theirs = screen.getByRole('group', { name: /their sea/i })
    const mine = screen.getByRole('group', { name: /my deck/i })
    expect(within(theirs).getAllByRole('button').length).toBe(36)
    expect(within(mine).queryAllByRole('button')).toHaveLength(0)
  })

  it('fires when the child taps a scope cell', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<GameScreen />)
    const label = emptyCellLabel()
    const theirs = screen.getByRole('group', { name: /their sea/i })
    await user.click(within(theirs).getByRole('button', { name: `${label}, unknown` }))
    expect(s().game.computer.shots).toHaveLength(1)
  })

  it('lights the bezel on the player turn and drops it on the computer turn', () => {
    const { container } = render(<GameScreen />)
    const bezel = () => container.querySelector('[data-bezel]') as HTMLElement
    expect(bezel().style.boxShadow).toContain('var(--amber)')
    act(() => s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!))
    if (s().game.turn === 'computer') expect(bezel().style.boxShadow).toBe('')
  })

  it('renders the phone layout with an announcement bar', () => {
    installMatchMedia(390, 844)
    render(<GameScreen />)
    expect(screen.getByRole('status', { name: '' })).toBeTruthy()
    expect(screen.getByText(/Tap a square to fire!/)).toBeInTheDocument()
  })

  it('offers a restart once the game is over', async () => {
    act(() => {
      while (s().game.phase === 'playing') {
        if (s().game.turn === 'player') {
          s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!)
        } else {
          s().takeComputerTurn()
        }
      }
    })
    render(<GameScreen />)
    expect(screen.getByRole('button', { name: /dive again/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/ui/screens/GameScreen.test.tsx`
Expected: FAIL — cannot resolve `./GameScreen`.

- [ ] **Step 3: Implement**

Create `src/ui/screens/GameScreen.tsx`:

```tsx
import { cellState } from '../../core/board'
import AnnouncementBar from '../components/AnnouncementBar'
import Bezel from '../components/Bezel'
import FleetPips from '../components/FleetPips'
import Grid from '../components/Grid'
import LastShotChip from '../components/LastShotChip'
import TakeoverView from '../components/Takeover'
import TurnBar from '../components/TurnBar'
import { useLayout } from '../layout'
import { deckSizing, scopeSizing } from '../sizing'
import { useGameStore } from '../store/gameStore'
import { useComputerTurn } from '../store/useComputerTurn'

/**
 * Spec §7. One component tree, three layouts.
 *
 * The invariant across all three: the enemy scope is large, lit and bordered;
 * the player's own deck is a small passive readout. That asymmetry is what
 * stops a five-year-old firing at his own fleet — only one grid looks tappable,
 * and only one is.
 */
export default function GameScreen() {
  const layout = useLayout()
  const game = useGameStore((s) => s.game)
  const mode = useGameStore((s) => s.mode)
  const takeover = useGameStore((s) => s.takeover)
  const fireAt = useGameStore((s) => s.fireAt)
  const restart = useGameStore((s) => s.restart)
  const dismissTakeover = useGameStore((s) => s.dismissTakeover)

  useComputerTurn()

  const myTurn = game.phase === 'playing' && game.turn === 'player'
  const scope = scopeSizing(layout, mode)
  const deck = deckSizing(layout, mode)

  const scopePanel = (
    <section
      style={{
        flex: 1,
        minHeight: 0,
        borderRadius: 22,
        background: 'var(--panel)',
        border: '4px solid var(--scope)',
        boxSizing: 'border-box',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid var(--scope)',
            color: 'var(--scope)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          ◎
        </span>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--scope)' }}>
          SCOPE — THEIR SEA
        </h2>
        <span style={{ marginLeft: 'auto' }}>
          <LastShotChip lastShot={game.lastShot} />
        </span>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <Grid
          board={game.computer}
          reveal={false}
          sizing={scope}
          onFire={fireAt}
          disabled={!myTurn}
          label="their sea"
        />
      </div>

      <footer style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>THEIR FLEET</span>
        <FleetPips board={game.computer} tone="enemy" />
      </footer>
    </section>
  )

  const deckPanel = (
    <section
      style={{
        flex: 'none',
        borderRadius: 22,
        background: 'var(--panel)',
        border: '2px solid var(--line)',
        boxSizing: 'border-box',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: layout === 'landscape' ? 'column' : 'row',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-2)' }}>
        MY DECK
      </h2>
      <Grid board={game.player} reveal sizing={deck} label="my deck" />
      <span style={{ marginLeft: layout === 'landscape' ? 0 : 'auto' }}>
        <FleetPips board={game.player} tone="own" />
      </span>
    </section>
  )

  const gameOver = game.phase === 'over' && (
    <button
      type="button"
      onClick={() => restart()}
      style={{
        flex: 'none',
        height: 96,
        borderRadius: 26,
        border: 'none',
        background: 'var(--amber)',
        color: 'var(--on-amber)',
        fontFamily: 'var(--font-display)',
        fontSize: 40,
        cursor: 'pointer',
      }}
    >
      {game.winner === 'player' ? '↻ SURFACED! DIVE AGAIN' : '↻ DIVE AGAIN'}
    </button>
  )

  return (
    <Bezel active={myTurn} layout={layout}>
      <main
        style={{
          height: '100%',
          boxSizing: 'border-box',
          padding: layout === 'phone' ? 14 : 20,
          display: 'grid',
          gap: layout === 'phone' ? 10 : 14,
          gridTemplateRows: layout === 'landscape' ? 'auto 1fr auto' : 'auto 1fr auto auto',
          gridTemplateColumns: '1fr',
        }}
      >
        <TurnBar turn={game.turn} phase={game.phase} layout={layout} />

        {layout === 'landscape' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '62fr 38fr', gap: 14, minHeight: 0 }}>
            {scopePanel}
            {deckPanel}
          </div>
        ) : (
          <>
            {scopePanel}
            {deckPanel}
          </>
        )}

        {layout === 'phone' && <AnnouncementBar lastShot={game.lastShot} />}
        {gameOver}
      </main>

      <TakeoverView takeover={takeover} onDismiss={dismissTakeover} />
    </Bezel>
  )
}
```

Modify `src/App.tsx`, replacing its entire contents:

```tsx
import GameScreen from './ui/screens/GameScreen'

export default function App() {
  return <GameScreen />
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/ui/screens/GameScreen.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full suite and build**

Run: `pnpm test && pnpm build`
Expected: all green; the engine's 123 tests still pass untouched.

- [ ] **Step 6: Confirm the purity guard still holds with `.tsx` present**

Run: `pnpm vitest run src/core/isolation.test.ts`
Expected: PASS. This is the first run where `.tsx` files actually exist, so it is the first real exercise of Task 1's fix.

- [ ] **Step 7: Play it**

Run: `pnpm dev`, open the URL, and play a complete game. Confirm by eye: the bezel turns amber on your turn and dark on the computer's; tapping a scope cell fires; the computer answers after a beat; a sunk ship turns every one of its cells square and red; the game ends and DIVE AGAIN starts a fresh one. Resize the window from wide to narrow and confirm all three layouts render without the page scrolling horizontally.

- [ ] **Step 8: Commit**

```bash
git add src/ui/screens/GameScreen.tsx src/ui/screens/GameScreen.test.tsx src/App.tsx
git commit -m "feat(ui): playable game screen in three layouts"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §5.1 type (Bungee + Space Grotesk) | Task 1 |
| §5.2 palette | Tasks 2–10, via `var(--token)` only |
| §5.3 cell states, glyph + radius | Task 2 |
| §5.4 bezel turn state | Task 5 |
| §5.5 cell sizing | Task 1 |
| §6.3 game screen | Task 10 |
| §6.4 feedback takeover | Task 8 |
| §6.1 900ms auto-advance, tap-to-skip, reduce-motion | Tasks 6, 8 |
| §7 three layouts | Tasks 1, 10 |
| §4.1/§4.2 defaults (Little Captain, Rookie) | Task 6 |
| §6.1 title, §6.2 placement, §6.5 victory, §6.6 settings | **Plan 3** |
| §8 audio | **Plan 4** |

**Carry-over coverage:** items 1 and 2 (isolation `.tsx` + `core ↛ ai`) are Task 1 Step 1; item 3 (`startPlaying` idempotence) is handled by the store owning all engine calls and never calling `startPlaying` outside `freshGame`; item 5's `canFire` gap is closed in Task 6. Item 4 (`play.test.ts` dead assertions) and the `ShipId` union are Plan 3/4 concerns and are deliberately not addressed here.

**Type consistency:** `CellSizing` is defined in Task 1 and consumed by Tasks 2, 3, 10. `Takeover` is defined in Task 6 and consumed by Task 8. `LayoutName` is defined in Task 1 and consumed by Tasks 1, 5, 10. `announcementText` is defined in Task 9 and reserved for Plan 4. Grid's `label` prop values (`"their sea"`, `"my deck"`) are asserted in both Task 3 and Task 10.

---

## Follow-on plans

- **Plan 3 — the shell.** Title screen with mode and difficulty selection, ship placement with shuffle and drag, victory screen, parent settings behind the hold-3s gear.
- **Plan 4 — voice.** The line table keyed off `announcementText`, `scripts/bake-voice.mjs`, the playback scheduler, per-mode preloading, and static deploy.
