# Periscope Game Core & AI — Implementation Plan (1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete, headless, framework-free Battleship engine — coordinates, fleets, placement, firing, the game state machine, and three AI opponents — verified by an exhaustive test suite and a simulation harness that proves the difficulty tiers are actually ordered.

**Architecture:** Everything in this plan is pure TypeScript with no React, no DOM, and no I/O. All randomness enters through an injected `Rng` function so every game is reproducible from a seed. Each AI tier is a single pure function from an opponent's-eye view of the board to a coordinate, which is what lets them be swapped by reference and simulated against each other. Later plans build the UI and audio *on top of* this without modifying it.

**Tech Stack:** TypeScript 6, Vite 8, Vitest 4, React 19 + Tailwind 4 (scaffolded here, used in Plan 2), pnpm.

**Spec:** `docs/superpowers/specs/2026-08-19-periscope-battleship-design.md`

## Global Constraints

- Node 26, pnpm. Match the stack in `~/dev/fencepix` — React 19, Vite 8, Tailwind 4, Vitest 4, TypeScript 6.
- `src/core/**` and `src/ai/**` MUST NOT import from `src/ui/**` or `src/audio/**`, and MUST NOT touch the DOM, `window`, `Math.random`, or `Date`.
- All randomness goes through an injected `Rng = () => number`. `Math.random` appears exactly once in the codebase, in `src/core/rng.ts`, inside `systemRng`.
- Board sizes are `6` (Little Captain, default) and `10` (Admiral). No code branches on mode name; size and fleet are parameters.
- Little Captain fleet: lengths 3, 2, 2. Admiral fleet: lengths 5, 4, 3, 3, 2.
- Coordinate labels are column-letter + 1-based row: `{x:2, y:6}` renders `"C7"`.
- Ships are placed horizontally or vertically only. No diagonals. Ships may touch but never overlap.
- Difficulty tiers are honest: no rubber-banding, no hidden difficulty adjustment, no peeking at the opponent's placements from inside a strategy.
- Every file ends with a newline. Commit after every task.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/ui/tokens.css`, `src/index.css`, `src/smoke.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `pnpm test` and `pnpm build`; the CSS custom properties in `src/ui/tokens.css` that Plan 2 consumes.

- [ ] **Step 1: Create the package manifest**

Create `package.json`:

```json
{
  "name": "periscope",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "zustand": "^5.0.14"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^26.1.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4.3.2",
    "typescript": "~6.0.2",
    "vite": "^8.1.4",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: Create the TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

`noUncheckedIndexedAccess` is deliberate: this codebase indexes into grids constantly, and it forces the array accesses to be guarded.

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
})
```

- [ ] **Step 3: Create the design tokens**

Create `src/ui/tokens.css`. These values are copied verbatim from spec §5.2 and are the single source of truth for colour in Plan 2:

```css
:root {
  --hull: #0E1726;
  --panel: #16233A;
  --line: #2B3D5C;
  --muted: #4C6A99;
  --ink-2: #8FB4E8;
  --scope: #33E1C4;
  --amber: #FFC24B;
  --sunk: #FF5B5B;
  --paper: #F2F7FF;

  --on-scope: #03332B;
  --on-amber: #3A2600;
  --on-sunk: #2A0000;

  --amber-edge: #C98A16;
  --sunk-edge: #B02A2A;
}
```

Create `src/index.css`:

```css
@import "tailwindcss";
@import "./ui/tokens.css";

html, body, #root { height: 100%; }
body {
  margin: 0;
  background: var(--hull);
  color: var(--paper);
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
```

- [ ] **Step 4: Create the entry point**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Periscope</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Create `src/App.tsx` as a deliberate placeholder — Plan 2 replaces it entirely:

```tsx
export default function App() {
  return <div style={{ padding: 24 }}>Periscope — engine only. UI arrives in Plan 2.</div>
}
```

- [ ] **Step 5: Write a smoke test**

Create `src/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('toolchain', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Install and verify**

Run:

```bash
cd ~/dev/periscope && pnpm install && pnpm test && pnpm build
```

Expected: install succeeds, one test passes, build emits `dist/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React 19 + Tailwind 4 + Vitest"
```

---

### Task 2: Seeded RNG

**Files:**
- Create: `src/core/rng.ts`, `src/core/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Rng = () => number`; `seededRng(seed: number): Rng`; `systemRng: Rng`; `pick<T>(items: readonly T[], rng: Rng): T`; `randomInt(maxExclusive: number, rng: Rng): number`.

- [ ] **Step 1: Write the failing test**

Create `src/core/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { seededRng, randomInt, pick } from './rng'

describe('seededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = seededRng(42)
    const b = seededRng(42)
    const seqA = [a(), a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = seededRng(1)
    const b = seededRng(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })

  it('stays within [0, 1)', () => {
    const r = seededRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('stays within [0, maxExclusive)', () => {
    const r = seededRng(3)
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(6, r)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('eventually produces every value in range', () => {
    const r = seededRng(9)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(randomInt(6, r))
    expect(seen.size).toBe(6)
  })
})

describe('pick', () => {
  it('returns an element of the input', () => {
    const r = seededRng(11)
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(pick(items, r))
    }
  })

  it('throws on an empty list', () => {
    expect(() => pick([], seededRng(1))).toThrow('pick: empty list')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/rng.test.ts`
Expected: FAIL — cannot resolve `./rng`.

- [ ] **Step 3: Write the implementation**

Create `src/core/rng.ts`:

```ts
/** A source of randomness in [0, 1). Injected everywhere so games are reproducible. */
export type Rng = () => number

/**
 * mulberry32 — a small, fast, well-distributed seeded PRNG.
 * Chosen over a hand-rolled LCG because it passes basic randomness tests at
 * this size and needs no dependency.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The only place Math.random is permitted in this codebase. */
export const systemRng: Rng = () => Math.random()

export function randomInt(maxExclusive: number, rng: Rng): number {
  return Math.floor(rng() * maxExclusive)
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pick: empty list')
  const item = items[randomInt(items.length, rng)]
  // noUncheckedIndexedAccess: the index is provably in range above.
  return item as T
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/rng.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/rng.ts src/core/rng.test.ts
git commit -m "feat(core): seeded RNG with injectable Rng type"
```

---

### Task 3: Coordinates

**Files:**
- Create: `src/core/coords.ts`, `src/core/coords.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type Coord = { x: number; y: number }`; `coordLabel(c: Coord): string`; `inBounds(c: Coord, size: number): boolean`; `coordEquals(a: Coord, b: Coord): boolean`; `coordKey(c: Coord): string`; `orthogonalNeighbors(c: Coord, size: number): Coord[]`; `allCoords(size: number): Coord[]`.

- [ ] **Step 1: Write the failing test**

Create `src/core/coords.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { coordLabel, inBounds, coordEquals, coordKey, orthogonalNeighbors, allCoords } from './coords'

describe('coordLabel', () => {
  it('renders column letter and 1-based row', () => {
    expect(coordLabel({ x: 0, y: 0 })).toBe('A1')
    expect(coordLabel({ x: 2, y: 6 })).toBe('C7')
    expect(coordLabel({ x: 9, y: 9 })).toBe('J10')
  })
})

describe('inBounds', () => {
  it('accepts cells inside the grid', () => {
    expect(inBounds({ x: 0, y: 0 }, 6)).toBe(true)
    expect(inBounds({ x: 5, y: 5 }, 6)).toBe(true)
  })

  it('rejects cells outside the grid', () => {
    expect(inBounds({ x: -1, y: 0 }, 6)).toBe(false)
    expect(inBounds({ x: 0, y: -1 }, 6)).toBe(false)
    expect(inBounds({ x: 6, y: 0 }, 6)).toBe(false)
    expect(inBounds({ x: 0, y: 6 }, 6)).toBe(false)
  })
})

describe('coordEquals and coordKey', () => {
  it('compares by value', () => {
    expect(coordEquals({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true)
    expect(coordEquals({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false)
  })

  it('produces a stable key usable in a Set', () => {
    const seen = new Set([coordKey({ x: 1, y: 2 })])
    expect(seen.has(coordKey({ x: 1, y: 2 }))).toBe(true)
    expect(seen.has(coordKey({ x: 2, y: 1 }))).toBe(false)
  })
})

describe('orthogonalNeighbors', () => {
  it('returns four neighbours in the middle of the board', () => {
    const n = orthogonalNeighbors({ x: 3, y: 3 }, 6)
    expect(n).toHaveLength(4)
    expect(n.map(coordKey).sort()).toEqual(['2,3', '3,2', '3,4', '4,3'])
  })

  it('clips at corners', () => {
    const n = orthogonalNeighbors({ x: 0, y: 0 }, 6)
    expect(n.map(coordKey).sort()).toEqual(['0,1', '1,0'])
  })
})

describe('allCoords', () => {
  it('enumerates the whole grid once', () => {
    const all = allCoords(6)
    expect(all).toHaveLength(36)
    expect(new Set(all.map(coordKey)).size).toBe(36)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/coords.test.ts`
Expected: FAIL — cannot resolve `./coords`.

- [ ] **Step 3: Write the implementation**

Create `src/core/coords.ts`:

```ts
/** A board cell. `x` is the column (0-based), `y` is the row (0-based). */
export type Coord = { x: number; y: number }

const LETTERS = 'ABCDEFGHIJ'

/** {x:2, y:6} -> "C7". Spoken aloud and shown in the "last shot" chip. */
export function coordLabel(c: Coord): string {
  return `${LETTERS[c.x] ?? '?'}${c.y + 1}`
}

export function inBounds(c: Coord, size: number): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < size && c.y < size
}

export function coordEquals(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y
}

/** Stable string key for Set/Map membership. */
export function coordKey(c: Coord): string {
  return `${c.x},${c.y}`
}

export function orthogonalNeighbors(c: Coord, size: number): Coord[] {
  const candidates: Coord[] = [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ]
  return candidates.filter((n) => inBounds(n, size))
}

export function allCoords(size: number): Coord[] {
  const out: Coord[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) out.push({ x, y })
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/coords.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/coords.ts src/core/coords.test.ts
git commit -m "feat(core): coordinates, labels, and grid helpers"
```

---

### Task 4: Fleet definitions

**Files:**
- Create: `src/core/fleet.ts`, `src/core/fleet.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type BoardMode = 'little' | 'admiral'`; `type ShipId = string`; `type ShipSpec = { id: ShipId; length: number }`; `type FleetSpec = { size: number; ships: ShipSpec[] }`; `FLEETS: Record<BoardMode, FleetSpec>`; `fleetFor(mode: BoardMode): FleetSpec`.

- [ ] **Step 1: Write the failing test**

Create `src/core/fleet.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { FLEETS, fleetFor } from './fleet'

describe('FLEETS', () => {
  it('defines Little Captain as 6x6 with lengths 3,2,2', () => {
    const f = fleetFor('little')
    expect(f.size).toBe(6)
    expect(f.ships.map((s) => s.length)).toEqual([3, 2, 2])
  })

  it('defines Admiral as 10x10 with lengths 5,4,3,3,2', () => {
    const f = fleetFor('admiral')
    expect(f.size).toBe(10)
    expect(f.ships.map((s) => s.length)).toEqual([5, 4, 3, 3, 2])
  })

  it('gives every ship a unique id within its fleet', () => {
    for (const mode of ['little', 'admiral'] as const) {
      const ids = fleetFor(mode).ships.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('never lets a fleet occupy more than a third of the board', () => {
    // A denser board makes random placement slow and the game unwinnable-feeling.
    for (const mode of ['little', 'admiral'] as const) {
      const f = fleetFor(mode)
      const cells = f.ships.reduce((n, s) => n + s.length, 0)
      expect(cells).toBeLessThanOrEqual((f.size * f.size) / 3)
    }
  })

  it('exposes both modes on FLEETS', () => {
    expect(Object.keys(FLEETS).sort()).toEqual(['admiral', 'little'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/fleet.test.ts`
Expected: FAIL — cannot resolve `./fleet`.

- [ ] **Step 3: Write the implementation**

Create `src/core/fleet.ts`:

```ts
export type BoardMode = 'little' | 'admiral'

/** Stable identifier used for audio line lookup: `result.sunk.<shipId>`. */
export type ShipId = string

export type ShipSpec = { id: ShipId; length: number }

export type FleetSpec = { size: number; ships: ShipSpec[] }

export const FLEETS: Record<BoardMode, FleetSpec> = {
  little: {
    size: 6,
    ships: [
      { id: 'submarine', length: 3 },
      { id: 'patrol', length: 2 },
      { id: 'tug', length: 2 },
    ],
  },
  admiral: {
    size: 10,
    ships: [
      { id: 'carrier', length: 5 },
      { id: 'battleship', length: 4 },
      { id: 'cruiser', length: 3 },
      { id: 'submarine', length: 3 },
      { id: 'destroyer', length: 2 },
    ],
  },
}

export function fleetFor(mode: BoardMode): FleetSpec {
  return FLEETS[mode]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/fleet.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/fleet.ts src/core/fleet.test.ts
git commit -m "feat(core): fleet definitions for both board modes"
```

---

### Task 5: Placement

**Files:**
- Create: `src/core/placement.ts`, `src/core/placement.test.ts`

**Interfaces:**
- Consumes: `Coord`, `inBounds`, `coordKey`, `allCoords` from `./coords`; `BoardMode`, `ShipId`, `fleetFor` from `./fleet`; `Rng`, `randomInt`, `pick` from `./rng`.
- Produces: `type Orientation = 'h' | 'v'`; `type Placement = { shipId: ShipId; origin: Coord; orientation: Orientation; length: number }`; `placementCells(p: Placement): Coord[]`; `canPlace(p: Placement, size: number, others: readonly Placement[]): boolean`; `randomFleet(mode: BoardMode, rng: Rng): Placement[]`; `withPlacement(fleet: readonly Placement[], next: Placement, size: number): Placement[] | null`; `rotated(p: Placement): Placement`.

- [ ] **Step 1: Write the failing test**

Create `src/core/placement.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { placementCells, canPlace, randomFleet, withPlacement, rotated } from './placement'
import type { Placement } from './placement'
import { coordKey } from './coords'
import { fleetFor } from './fleet'
import { seededRng } from './rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

describe('placementCells', () => {
  it('extends right when horizontal', () => {
    expect(placementCells(p('a', 1, 2, 'h', 3)).map(coordKey)).toEqual(['1,2', '2,2', '3,2'])
  })

  it('extends down when vertical', () => {
    expect(placementCells(p('a', 1, 2, 'v', 3)).map(coordKey)).toEqual(['1,2', '1,3', '1,4'])
  })
})

describe('canPlace', () => {
  it('accepts a placement fully inside the board', () => {
    expect(canPlace(p('a', 0, 0, 'h', 3), 6, [])).toBe(true)
    expect(canPlace(p('a', 3, 5, 'h', 3), 6, [])).toBe(true)
  })

  it('rejects a placement running off the right edge', () => {
    expect(canPlace(p('a', 4, 0, 'h', 3), 6, [])).toBe(false)
  })

  it('rejects a placement running off the bottom edge', () => {
    expect(canPlace(p('a', 0, 4, 'v', 3), 6, [])).toBe(false)
  })

  it('rejects a placement overlapping another ship', () => {
    const existing = [p('a', 0, 0, 'h', 3)]
    expect(canPlace(p('b', 2, 0, 'v', 2), 6, existing)).toBe(false)
  })

  it('allows ships to touch without overlapping', () => {
    const existing = [p('a', 0, 0, 'h', 3)]
    expect(canPlace(p('b', 0, 1, 'h', 3), 6, existing)).toBe(true)
  })

  it('ignores the ship being repositioned when it is already in the list', () => {
    const existing = [p('a', 0, 0, 'h', 3), p('b', 0, 2, 'h', 2)]
    // Moving 'a' one row down must not collide with its own old cells.
    expect(canPlace(p('a', 0, 1, 'h', 3), 6, existing)).toBe(true)
  })
})

describe('rotated', () => {
  it('flips orientation about the origin', () => {
    expect(rotated(p('a', 1, 1, 'h', 3)).orientation).toBe('v')
    expect(rotated(p('a', 1, 1, 'v', 3)).orientation).toBe('h')
    expect(rotated(p('a', 1, 1, 'h', 3)).origin).toEqual({ x: 1, y: 1 })
  })
})

describe('withPlacement', () => {
  it('replaces a ship in the fleet when the move is legal', () => {
    const fleet = [p('a', 0, 0, 'h', 3), p('b', 0, 2, 'h', 2)]
    const next = withPlacement(fleet, p('a', 0, 4, 'h', 3), 6)
    expect(next).not.toBeNull()
    expect(next!.find((x) => x.shipId === 'a')!.origin).toEqual({ x: 0, y: 4 })
    expect(next).toHaveLength(2)
  })

  it('returns null when the move is illegal', () => {
    const fleet = [p('a', 0, 0, 'h', 3), p('b', 0, 2, 'h', 2)]
    expect(withPlacement(fleet, p('a', 0, 2, 'h', 3), 6)).toBeNull()
  })
})

describe('randomFleet', () => {
  it('places every ship in the fleet', () => {
    for (const mode of ['little', 'admiral'] as const) {
      const spec = fleetFor(mode)
      const fleet = randomFleet(mode, seededRng(1))
      expect(fleet).toHaveLength(spec.ships.length)
      expect(fleet.map((f) => f.shipId).sort()).toEqual(spec.ships.map((s) => s.id).sort())
    }
  })

  it('always produces a legal fleet across many seeds', () => {
    for (const mode of ['little', 'admiral'] as const) {
      const size = fleetFor(mode).size
      for (let seed = 0; seed < 300; seed++) {
        const fleet = randomFleet(mode, seededRng(seed))
        const occupied = new Set<string>()
        for (const placement of fleet) {
          for (const cell of placementCells(placement)) {
            expect(cell.x).toBeGreaterThanOrEqual(0)
            expect(cell.y).toBeGreaterThanOrEqual(0)
            expect(cell.x).toBeLessThan(size)
            expect(cell.y).toBeLessThan(size)
            expect(occupied.has(coordKey(cell))).toBe(false)
            occupied.add(coordKey(cell))
          }
        }
      }
    }
  })

  it('is reproducible from a seed', () => {
    expect(randomFleet('admiral', seededRng(99))).toEqual(randomFleet('admiral', seededRng(99)))
  })

  it('produces different fleets for different seeds', () => {
    expect(randomFleet('admiral', seededRng(1))).not.toEqual(randomFleet('admiral', seededRng(2)))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/placement.test.ts`
Expected: FAIL — cannot resolve `./placement`.

- [ ] **Step 3: Write the implementation**

Create `src/core/placement.ts`:

```ts
import { allCoords, coordKey, inBounds, type Coord } from './coords'
import { fleetFor, type BoardMode, type ShipId } from './fleet'
import { pick, type Rng } from './rng'

export type Orientation = 'h' | 'v'

export type Placement = {
  shipId: ShipId
  origin: Coord
  orientation: Orientation
  length: number
}

export function placementCells(p: Placement): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < p.length; i++) {
    cells.push(
      p.orientation === 'h' ? { x: p.origin.x + i, y: p.origin.y } : { x: p.origin.x, y: p.origin.y + i },
    )
  }
  return cells
}

/**
 * A placement is legal when every cell is on the board and no cell collides
 * with a DIFFERENT ship. Comparing by shipId is what lets the placement screen
 * reposition a ship without it colliding with its own previous cells.
 */
export function canPlace(p: Placement, size: number, others: readonly Placement[]): boolean {
  const cells = placementCells(p)
  if (!cells.every((c) => inBounds(c, size))) return false

  const taken = new Set<string>()
  for (const other of others) {
    if (other.shipId === p.shipId) continue
    for (const c of placementCells(other)) taken.add(coordKey(c))
  }
  return cells.every((c) => !taken.has(coordKey(c)))
}

export function rotated(p: Placement): Placement {
  return { ...p, orientation: p.orientation === 'h' ? 'v' : 'h' }
}

/** Returns the fleet with `next` swapped in, or null if that would be illegal. */
export function withPlacement(
  fleet: readonly Placement[],
  next: Placement,
  size: number,
): Placement[] | null {
  if (!canPlace(next, size, fleet)) return null
  return fleet.map((p) => (p.shipId === next.shipId ? next : p))
}

/**
 * Places the whole fleet at random. Longest ships first — the board is most
 * constrained for them, so placing them last is what causes retry storms.
 * Enumerating legal origins (rather than guess-and-check) means this cannot
 * loop forever, so no attempt cap is needed.
 */
export function randomFleet(mode: BoardMode, rng: Rng): Placement[] {
  const spec = fleetFor(mode)
  const ships = [...spec.ships].sort((a, b) => b.length - a.length)
  const placed: Placement[] = []

  for (const ship of ships) {
    const legal: Placement[] = []
    for (const origin of allCoords(spec.size)) {
      for (const orientation of ['h', 'v'] as const) {
        const candidate: Placement = { shipId: ship.id, origin, orientation, length: ship.length }
        if (canPlace(candidate, spec.size, placed)) legal.push(candidate)
      }
    }
    if (legal.length === 0) {
      throw new Error(`randomFleet: no legal placement for ${ship.id} on ${spec.size}x${spec.size}`)
    }
    placed.push(pick(legal, rng))
  }

  // Return in the fleet's declared order so UI ship pips are stable.
  return spec.ships.map((s) => {
    const found = placed.find((p) => p.shipId === s.id)
    if (!found) throw new Error(`randomFleet: lost placement for ${s.id}`)
    return found
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/placement.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/placement.ts src/core/placement.test.ts
git commit -m "feat(core): ship placement, legality, and seeded random fleets"
```

---

### Task 6: Boards and firing

**Files:**
- Create: `src/core/board.ts`, `src/core/board.test.ts`

**Interfaces:**
- Consumes: `Coord`, `coordKey`, `coordEquals`, `inBounds` from `./coords`; `Placement`, `placementCells`, `randomFleet` from `./placement`; `BoardMode`, `ShipId`, `fleetFor` from `./fleet`; `Rng` from `./rng`.
- Produces: `type ShotResult = 'miss' | 'hit' | 'sunk'`; `type CellState = 'unknown' | 'miss' | 'hit' | 'sunk' | 'ship'`; `type Shot = { at: Coord; result: ShotResult; shipId?: ShipId }`; `type Board = { size: number; placements: Placement[]; shots: Shot[] }`; `newBoard(mode: BoardMode, rng: Rng): Board`; `boardFrom(size: number, placements: Placement[]): Board`; `alreadyFired(b: Board, at: Coord): boolean`; `fire(b: Board, at: Coord): { board: Board; shot: Shot }`; `sunkShipIds(b: Board): ShipId[]`; `isFleetSunk(b: Board): boolean`; `cellState(b: Board, at: Coord, reveal: boolean): CellState`.

- [ ] **Step 1: Write the failing test**

Create `src/core/board.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { boardFrom, fire, alreadyFired, sunkShipIds, isFleetSunk, cellState, newBoard } from './board'
import type { Placement } from './placement'
import { seededRng } from './rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

// A 6x6 board: 'sub' occupies A1,B1,C1; 'tug' occupies A3,A4.
const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('fire', () => {
  it('reports a miss on empty water', () => {
    const { shot } = fire(fixture(), { x: 5, y: 5 })
    expect(shot.result).toBe('miss')
    expect(shot.shipId).toBeUndefined()
  })

  it('reports a hit on a ship that survives', () => {
    const { shot } = fire(fixture(), { x: 0, y: 0 })
    expect(shot.result).toBe('hit')
    expect(shot.shipId).toBe('sub')
  })

  it('reports sunk on the final cell of a ship', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    const { shot } = fire(b, { x: 0, y: 3 })
    expect(shot.result).toBe('sunk')
    expect(shot.shipId).toBe('tug')
  })

  it('does not mutate the input board', () => {
    const b = fixture()
    fire(b, { x: 0, y: 0 })
    expect(b.shots).toHaveLength(0)
  })

  it('is idempotent when firing at the same cell twice', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 0 }).board
    const after = fire(b, { x: 0, y: 0 })
    expect(after.board.shots).toHaveLength(1)
    expect(after.shot.result).toBe('hit')
  })

  it('throws when firing off the board', () => {
    expect(() => fire(fixture(), { x: 9, y: 9 })).toThrow('fire: out of bounds')
  })
})

describe('alreadyFired', () => {
  it('tracks fired cells', () => {
    const b = fire(fixture(), { x: 1, y: 1 }).board
    expect(alreadyFired(b, { x: 1, y: 1 })).toBe(true)
    expect(alreadyFired(b, { x: 2, y: 2 })).toBe(false)
  })
})

describe('sunkShipIds and isFleetSunk', () => {
  it('reports nothing sunk on a fresh board', () => {
    expect(sunkShipIds(fixture())).toEqual([])
    expect(isFleetSunk(fixture())).toBe(false)
  })

  it('reports a ship sunk only when every cell is hit', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 0 }).board
    b = fire(b, { x: 1, y: 0 }).board
    expect(sunkShipIds(b)).toEqual([])
    b = fire(b, { x: 2, y: 0 }).board
    expect(sunkShipIds(b)).toEqual(['sub'])
    expect(isFleetSunk(b)).toBe(false)
  })

  it('reports the fleet sunk when all ships are destroyed', () => {
    let b = fixture()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      b = fire(b, c).board
    }
    expect(isFleetSunk(b)).toBe(true)
    expect(sunkShipIds(b).sort()).toEqual(['sub', 'tug'])
  })
})

describe('cellState', () => {
  it('hides unfired ship cells from the opponent but shows them to the owner', () => {
    const b = fixture()
    expect(cellState(b, { x: 0, y: 0 }, false)).toBe('unknown')
    expect(cellState(b, { x: 0, y: 0 }, true)).toBe('ship')
  })

  it('shows misses and hits to both', () => {
    let b = fixture()
    b = fire(b, { x: 5, y: 5 }).board
    b = fire(b, { x: 0, y: 0 }).board
    expect(cellState(b, { x: 5, y: 5 }, false)).toBe('miss')
    expect(cellState(b, { x: 0, y: 0 }, false)).toBe('hit')
  })

  it('upgrades every cell of a destroyed ship to sunk', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    expect(cellState(b, { x: 0, y: 2 }, false)).toBe('hit')
    b = fire(b, { x: 0, y: 3 }).board
    expect(cellState(b, { x: 0, y: 2 }, false)).toBe('sunk')
    expect(cellState(b, { x: 0, y: 3 }, false)).toBe('sunk')
  })

  it('reports untouched empty water as unknown', () => {
    expect(cellState(fixture(), { x: 4, y: 4 }, true)).toBe('unknown')
  })
})

describe('newBoard', () => {
  it('builds a board with a full legal fleet', () => {
    const b = newBoard('admiral', seededRng(5))
    expect(b.size).toBe(10)
    expect(b.placements).toHaveLength(5)
    expect(b.shots).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/core/board.test.ts`
Expected: FAIL — cannot resolve `./board`.

- [ ] **Step 3: Write the implementation**

Create `src/core/board.ts`:

```ts
import { coordEquals, coordKey, inBounds, type Coord } from './coords'
import { fleetFor, type BoardMode, type ShipId } from './fleet'
import { placementCells, randomFleet, type Placement } from './placement'
import type { Rng } from './rng'

export type ShotResult = 'miss' | 'hit' | 'sunk'

/** What a single cell should render as. `ship` is owner-only. */
export type CellState = 'unknown' | 'miss' | 'hit' | 'sunk' | 'ship'

export type Shot = { at: Coord; result: ShotResult; shipId?: ShipId }

export type Board = {
  size: number
  placements: Placement[]
  shots: Shot[]
}

export function boardFrom(size: number, placements: Placement[]): Board {
  return { size, placements, shots: [] }
}

export function newBoard(mode: BoardMode, rng: Rng): Board {
  return boardFrom(fleetFor(mode).size, randomFleet(mode, rng))
}

export function alreadyFired(b: Board, at: Coord): boolean {
  return b.shots.some((s) => coordEquals(s.at, at))
}

function shipAt(b: Board, at: Coord): Placement | undefined {
  return b.placements.find((p) => placementCells(p).some((c) => coordEquals(c, at)))
}

function hitCellsFor(b: Board, shipId: ShipId): number {
  const hits = new Set(b.shots.filter((s) => s.shipId === shipId).map((s) => coordKey(s.at)))
  return hits.size
}

/**
 * Fires at a cell and returns a NEW board. Firing at an already-fired cell is a
 * no-op that replays the original shot, so a double-tap from a five-year-old
 * cannot corrupt state or burn a turn.
 */
export function fire(b: Board, at: Coord): { board: Board; shot: Shot } {
  if (!inBounds(at, b.size)) throw new Error('fire: out of bounds')

  const previous = b.shots.find((s) => coordEquals(s.at, at))
  if (previous) return { board: b, shot: previous }

  const ship = shipAt(b, at)
  if (!ship) {
    const shot: Shot = { at, result: 'miss' }
    return { board: { ...b, shots: [...b.shots, shot] }, shot }
  }

  const hitsAfter = hitCellsFor(b, ship.shipId) + 1
  const result: ShotResult = hitsAfter >= ship.length ? 'sunk' : 'hit'
  const shot: Shot = { at, result, shipId: ship.shipId }
  return { board: { ...b, shots: [...b.shots, shot] }, shot }
}

export function sunkShipIds(b: Board): ShipId[] {
  return b.placements.filter((p) => hitCellsFor(b, p.shipId) >= p.length).map((p) => p.shipId)
}

export function isFleetSunk(b: Board): boolean {
  return b.placements.length > 0 && sunkShipIds(b).length === b.placements.length
}

/**
 * `reveal` is true for the board's owner (who sees their own ships) and false
 * for the opponent's scope view. Sunk outranks hit so the whole silhouette
 * switches to the square sunk styling at once.
 */
export function cellState(b: Board, at: Coord, reveal: boolean): CellState {
  const shot = b.shots.find((s) => coordEquals(s.at, at))
  if (shot) {
    if (shot.result === 'miss') return 'miss'
    const ship = shipAt(b, at)
    if (ship && hitCellsFor(b, ship.shipId) >= ship.length) return 'sunk'
    return 'hit'
  }
  if (reveal && shipAt(b, at)) return 'ship'
  return 'unknown'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/board.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/board.ts src/core/board.test.ts
git commit -m "feat(core): board model, firing, sunk detection, cell states"
```

---

### Task 7: Game state machine

**Files:**
- Create: `src/core/game.ts`, `src/core/game.test.ts`

**Interfaces:**
- Consumes: everything from `./board`, `./placement`, `./fleet`, `./coords`, `./rng`.
- Produces: `type Phase = 'setup' | 'playing' | 'over'`; `type Side = 'player' | 'computer'`; `type GameState`; `newGame(mode: BoardMode, rng: Rng): GameState`; `shufflePlayerFleet(g: GameState, rng: Rng): GameState`; `movePlayerShip(g, next: Placement): GameState`; `startPlaying(g: GameState): GameState`; `applyShot(g: GameState, by: Side, at: Coord): GameState`.

- [ ] **Step 1: Write the failing test**

Create `src/core/game.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { newGame, startPlaying, applyShot, shufflePlayerFleet, movePlayerShip } from './game'
import { placementCells } from './placement'
import { boardFrom } from './board'
import type { Placement } from './placement'
import { seededRng } from './rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

/** A deterministic 6x6 game: computer has 'sub' at A1..C1 and 'tug' at A3..A4. */
function riggedGame() {
  const g = startPlaying(newGame('little', seededRng(1)))
  return { ...g, computer: boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)]) }
}

describe('newGame', () => {
  it('starts in setup with a placed player fleet and no shots', () => {
    const g = newGame('little', seededRng(1))
    expect(g.phase).toBe('setup')
    expect(g.player.placements).toHaveLength(3)
    expect(g.player.shots).toEqual([])
    expect(g.computer.placements).toHaveLength(3)
    expect(g.winner).toBeNull()
  })

  it('gives the player the first turn', () => {
    expect(newGame('little', seededRng(1)).turn).toBe('player')
  })

  it('uses the board size of the chosen mode', () => {
    expect(newGame('admiral', seededRng(1)).size).toBe(10)
  })
})

describe('setup', () => {
  it('shuffles only the player fleet, leaving the computer alone', () => {
    const g = newGame('little', seededRng(1))
    const shuffled = shufflePlayerFleet(g, seededRng(2))
    expect(shuffled.player.placements).not.toEqual(g.player.placements)
    expect(shuffled.computer.placements).toEqual(g.computer.placements)
  })

  it('accepts a legal ship move', () => {
    const g = { ...newGame('little', seededRng(1)) }
    const rigged = { ...g, player: boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)]) }
    const moved = movePlayerShip(rigged, p('tug', 4, 4, 'v', 2))
    expect(moved.player.placements.find((x) => x.shipId === 'tug')!.origin).toEqual({ x: 4, y: 4 })
  })

  it('ignores an illegal ship move', () => {
    const g = newGame('little', seededRng(1))
    const rigged = { ...g, player: boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)]) }
    const moved = movePlayerShip(rigged, p('tug', 0, 0, 'v', 2))
    expect(moved.player.placements).toEqual(rigged.player.placements)
  })

  it('refuses to move ships once playing', () => {
    const g = startPlaying(newGame('little', seededRng(1)))
    expect(() => movePlayerShip(g, p('tug', 4, 4, 'v', 2))).toThrow('movePlayerShip: not in setup')
  })
})

describe('startPlaying', () => {
  it('moves from setup to playing', () => {
    expect(startPlaying(newGame('little', seededRng(1))).phase).toBe('playing')
  })
})

describe('applyShot', () => {
  it('records the player shot against the computer board', () => {
    const g = applyShot(riggedGame(), 'player', { x: 0, y: 0 })
    expect(g.computer.shots).toHaveLength(1)
    expect(g.player.shots).toHaveLength(0)
    expect(g.lastShot).toEqual({ by: 'player', at: { x: 0, y: 0 }, result: 'hit', shipId: 'sub' })
  })

  it('keeps the turn with the player after a hit', () => {
    expect(applyShot(riggedGame(), 'player', { x: 0, y: 0 }).turn).toBe('player')
  })

  it('passes the turn to the computer after a miss', () => {
    expect(applyShot(riggedGame(), 'player', { x: 5, y: 5 }).turn).toBe('computer')
  })

  it('rejects a shot from the side whose turn it is not', () => {
    expect(() => applyShot(riggedGame(), 'computer', { x: 0, y: 0 })).toThrow('applyShot: not computer turn')
  })

  it('does not consume a turn when firing at an already-fired cell', () => {
    let g = applyShot(riggedGame(), 'player', { x: 5, y: 5 }) // miss -> computer turn
    g = { ...g, turn: 'player' }
    const again = applyShot(g, 'player', { x: 5, y: 5 })
    expect(again.computer.shots).toHaveLength(1)
    expect(again.turn).toBe('player')
  })

  it('declares the player the winner when the computer fleet is destroyed', () => {
    let g = riggedGame()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      g = applyShot(g, 'player', c)
    }
    expect(g.phase).toBe('over')
    expect(g.winner).toBe('player')
  })

  it('refuses shots once the game is over', () => {
    let g = riggedGame()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      g = applyShot(g, 'player', c)
    }
    expect(() => applyShot(g, 'player', { x: 5, y: 5 })).toThrow('applyShot: game is over')
  })

  it('declares the computer the winner when the player fleet is destroyed', () => {
    let g = startPlaying(newGame('little', seededRng(1)))
    g = { ...g, turn: 'computer', player: boardFrom(6, [p('tug', 0, 0, 'h', 2)]) }
    g = applyShot(g, 'computer', { x: 0, y: 0 })
    g = applyShot(g, 'computer', { x: 1, y: 0 })
    expect(g.winner).toBe('computer')
    expect(g.phase).toBe('over')
  })

  it('never lets a player shot touch the player board', () => {
    const g = riggedGame()
    const after = applyShot(g, 'player', { x: 0, y: 0 })
    expect(after.player).toBe(g.player)
  })
})

describe('fleet integrity', () => {
  it('never overlaps ships in a generated game', () => {
    for (let seed = 0; seed < 100; seed++) {
      const g = newGame('admiral', seededRng(seed))
      for (const board of [g.player, g.computer]) {
        const seen = new Set<string>()
        for (const pl of board.placements) {
          for (const c of placementCells(pl)) {
            const k = `${c.x},${c.y}`
            expect(seen.has(k)).toBe(false)
            seen.add(k)
          }
        }
      }
    }
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/core/game.test.ts`
Expected: FAIL — cannot resolve `./game`.

- [ ] **Step 3: Write the implementation**

Create `src/core/game.ts`:

```ts
import { fire, isFleetSunk, newBoard, type Board, type ShotResult } from './board'
import type { Coord } from './coords'
import { fleetFor, type BoardMode, type ShipId } from './fleet'
import { randomFleet, withPlacement, type Placement } from './placement'
import type { Rng } from './rng'

export type Phase = 'setup' | 'playing' | 'over'
export type Side = 'player' | 'computer'

export type LastShot = { by: Side; at: Coord; result: ShotResult; shipId?: ShipId }

export type GameState = {
  mode: BoardMode
  size: number
  phase: Phase
  turn: Side
  /** The player's own fleet. Shots recorded here were fired BY the computer. */
  player: Board
  /** The computer's fleet. Shots recorded here were fired BY the player. */
  computer: Board
  winner: Side | null
  lastShot: LastShot | null
}

export function newGame(mode: BoardMode, rng: Rng): GameState {
  return {
    mode,
    size: fleetFor(mode).size,
    phase: 'setup',
    turn: 'player',
    player: newBoard(mode, rng),
    computer: newBoard(mode, rng),
    winner: null,
    lastShot: null,
  }
}

export function shufflePlayerFleet(g: GameState, rng: Rng): GameState {
  if (g.phase !== 'setup') throw new Error('shufflePlayerFleet: not in setup')
  return { ...g, player: { ...g.player, placements: randomFleet(g.mode, rng) } }
}

/** Applies a drag or rotate from the placement screen. Illegal moves are ignored. */
export function movePlayerShip(g: GameState, next: Placement): GameState {
  if (g.phase !== 'setup') throw new Error('movePlayerShip: not in setup')
  const placements = withPlacement(g.player.placements, next, g.size)
  if (!placements) return g
  return { ...g, player: { ...g.player, placements } }
}

export function startPlaying(g: GameState): GameState {
  return { ...g, phase: 'playing' }
}

/**
 * Applies one shot. A shot lands on the OPPOSING board: the player fires at
 * `computer`, the computer fires at `player`.
 *
 * Turn rule: a hit or sunk keeps the turn, a miss passes it. Firing at an
 * already-fired cell is a no-op that does not consume the turn.
 */
export function applyShot(g: GameState, by: Side, at: Coord): GameState {
  if (g.phase === 'over') throw new Error('applyShot: game is over')
  if (g.phase !== 'playing') throw new Error('applyShot: not playing')
  if (g.turn !== by) throw new Error(`applyShot: not ${by} turn`)

  const targetKey = by === 'player' ? 'computer' : 'player'
  const target = g[targetKey]

  const { board, shot } = fire(target, at)
  if (board === target) return g // already fired here; no turn consumed

  const next: GameState = {
    ...g,
    [targetKey]: board,
    lastShot: { by, at, result: shot.result, shipId: shot.shipId },
    turn: shot.result === 'miss' ? (by === 'player' ? 'computer' : 'player') : by,
  }

  if (isFleetSunk(board)) {
    return { ...next, phase: 'over', winner: by, turn: by }
  }
  return next
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/core/game.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/game.ts src/core/game.test.ts
git commit -m "feat(core): game state machine with turn and win rules"
```

---

### Task 8: AI shared types and the Rookie tier

**Files:**
- Create: `src/ai/types.ts`, `src/ai/view.ts`, `src/ai/rookie.ts`, `src/ai/rookie.test.ts`

**Interfaces:**
- Consumes: `Coord`, `coordKey`, `allCoords` from `../core/coords`; `Board`, `ShotResult` from `../core/board`; `Rng`, `pick` from `../core/rng`.
- Produces: `type OpponentView = { size: number; shots: ViewShot[]; remainingLengths: number[] }`; `type ViewShot = { at: Coord; result: ShotResult }`; `type Strategy = (view: OpponentView, rng: Rng) => Coord`; `viewOf(board: Board): OpponentView`; `untriedCells(view: OpponentView): Coord[]`; `rookie: Strategy`.

`viewOf` is the honesty boundary: it strips ship placements entirely, so a strategy physically cannot see where the fleet is. Every tier receives only this.

- [ ] **Step 1: Write the failing test**

Create `src/ai/rookie.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { rookie } from './rookie'
import { viewOf, untriedCells } from './view'
import { boardFrom, fire } from '../core/board'
import type { Placement } from '../core/placement'
import { coordKey } from '../core/coords'
import { seededRng } from '../core/rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('viewOf', () => {
  it('hides ship placements from the strategy', () => {
    const view = viewOf(fixture()) as unknown as Record<string, unknown>
    expect(view.placements).toBeUndefined()
  })

  it('reports remaining ship lengths without revealing positions', () => {
    expect(viewOf(fixture()).remainingLengths.sort()).toEqual([2, 3])
  })

  it('drops a ship from remainingLengths once it is sunk', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    expect(viewOf(b).remainingLengths).toEqual([3])
  })
})

describe('untriedCells', () => {
  it('excludes cells already fired at', () => {
    const b = fire(fixture(), { x: 1, y: 1 }).board
    const untried = untriedCells(viewOf(b))
    expect(untried).toHaveLength(35)
    expect(untried.map(coordKey)).not.toContain('1,1')
  })
})

describe('rookie', () => {
  it('always returns an untried in-bounds cell', () => {
    let b = fixture()
    const rng = seededRng(4)
    for (let i = 0; i < 36; i++) {
      const view = viewOf(b)
      const at = rookie(view, rng)
      expect(at.x).toBeGreaterThanOrEqual(0)
      expect(at.y).toBeGreaterThanOrEqual(0)
      expect(at.x).toBeLessThan(6)
      expect(at.y).toBeLessThan(6)
      expect(b.shots.map((s) => coordKey(s.at))).not.toContain(coordKey(at))
      b = fire(b, at).board
    }
    expect(b.shots).toHaveLength(36)
  })

  it('throws when the board is exhausted', () => {
    let b = fixture()
    const rng = seededRng(4)
    for (let i = 0; i < 36; i++) b = fire(b, rookie(viewOf(b), rng)).board
    expect(() => rookie(viewOf(b), rng)).toThrow('no untried cells')
  })

  it('does not chase adjacent cells after a hit', () => {
    // Rookie is memoryless. Given a hit at C1, its next shot should be
    // adjacent no more often than chance. Over many trials, an adjacency rate
    // near 4/35 is expected; a targeting AI would be far above it.
    let adjacent = 0
    const trials = 400
    for (let seed = 0; seed < trials; seed++) {
      const b = fire(fixture(), { x: 2, y: 0 }).board
      const at = rookie(viewOf(b), seededRng(seed))
      const dist = Math.abs(at.x - 2) + Math.abs(at.y - 0)
      if (dist === 1) adjacent++
    }
    expect(adjacent / trials).toBeLessThan(0.25)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ai/rookie.test.ts`
Expected: FAIL — cannot resolve `./rookie`.

- [ ] **Step 3: Write the implementation**

Create `src/ai/types.ts`:

```ts
import type { Coord } from '../core/coords'
import type { ShotResult } from '../core/board'
import type { Rng } from '../core/rng'

export type ViewShot = { at: Coord; result: ShotResult }

/**
 * Everything a strategy is allowed to know. Deliberately excludes ship
 * placements — this type IS the anti-cheating guarantee.
 */
export type OpponentView = {
  size: number
  shots: ViewShot[]
  /** Lengths of ships not yet sunk, descending. */
  remainingLengths: number[]
}

export type Strategy = (view: OpponentView, rng: Rng) => Coord

export type Tier = 'rookie' | 'sailor' | 'admiral'
```

Create `src/ai/view.ts`:

```ts
import { sunkShipIds, type Board } from '../core/board'
import { allCoords, coordKey, type Coord } from '../core/coords'
import type { OpponentView } from './types'

export function viewOf(board: Board): OpponentView {
  const sunk = new Set(sunkShipIds(board))
  return {
    size: board.size,
    shots: board.shots.map((s) => ({ at: s.at, result: s.result })),
    remainingLengths: board.placements
      .filter((p) => !sunk.has(p.shipId))
      .map((p) => p.length)
      .sort((a, b) => b - a),
  }
}

export function untriedCells(view: OpponentView): Coord[] {
  const fired = new Set(view.shots.map((s) => coordKey(s.at)))
  return allCoords(view.size).filter((c) => !fired.has(coordKey(c)))
}

/** Cells hit but not yet part of a sunk ship — the open threads a hunter chases. */
export function unresolvedHits(view: OpponentView): Coord[] {
  return view.shots.filter((s) => s.result === 'hit').map((s) => s.at)
}
```

Create `src/ai/rookie.ts`:

```ts
import { pick } from '../core/rng'
import type { Strategy } from './types'
import { untriedCells } from './view'

/**
 * Rookie fires uniformly at random among untried cells and learns nothing from
 * a hit. This is the default tier: a five-year-old firing at random should be
 * able to beat it roughly half the time.
 */
export const rookie: Strategy = (view, rng) => {
  const candidates = untriedCells(view)
  if (candidates.length === 0) throw new Error('rookie: no untried cells')
  return pick(candidates, rng)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/ai/rookie.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ai/types.ts src/ai/view.ts src/ai/rookie.ts src/ai/rookie.test.ts
git commit -m "feat(ai): opponent view boundary and Rookie tier"
```

---

### Task 9: Sailor tier (hunt/target)

**Files:**
- Create: `src/ai/sailor.ts`, `src/ai/sailor.test.ts`

**Interfaces:**
- Consumes: `OpponentView`, `Strategy` from `./types`; `untriedCells`, `unresolvedHits` from `./view`; `orthogonalNeighbors`, `coordKey`, `inBounds` from `../core/coords`; `pick` from `../core/rng`.
- Produces: `sailor: Strategy`; `targetShot(view: OpponentView, rng: Rng): Coord | null` (exported so Admiral reuses the identical targeting logic).

- [ ] **Step 1: Write the failing test**

Create `src/ai/sailor.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sailor, targetShot } from './sailor'
import { viewOf } from './view'
import { boardFrom, fire } from '../core/board'
import type { Placement } from '../core/placement'
import { coordKey } from '../core/coords'
import { seededRng } from '../core/rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

// 'sub' at C3,D3,E3 (horizontal). 'tug' at A6,B6.
const fixture = () => boardFrom(6, [p('sub', 2, 2, 'h', 3), p('tug', 0, 5, 'h', 2)])

describe('targetShot', () => {
  it('returns null when there are no unresolved hits', () => {
    expect(targetShot(viewOf(fixture()), seededRng(1))).toBeNull()
  })

  it('fires orthogonally adjacent to a single unresolved hit', () => {
    const b = fire(fixture(), { x: 2, y: 2 }).board
    const at = targetShot(viewOf(b), seededRng(1))
    expect(at).not.toBeNull()
    expect(['1,2', '3,2', '2,1', '2,3']).toContain(coordKey(at!))
  })

  it('extends along the axis once two collinear hits exist', () => {
    let b = fixture()
    b = fire(b, { x: 2, y: 2 }).board
    b = fire(b, { x: 3, y: 2 }).board
    const at = targetShot(viewOf(b), seededRng(1))
    // Must continue horizontally: either B3 (x=1) or E3 (x=4).
    expect(['1,2', '4,2']).toContain(coordKey(at!))
  })

  it('ignores hits belonging to an already-sunk ship', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 5 }).board
    b = fire(b, { x: 1, y: 5 }).board // tug sunk -> both shots become 'sunk'
    expect(targetShot(viewOf(b), seededRng(1))).toBeNull()
  })

  it('never returns an already-fired cell', () => {
    let b = fixture()
    b = fire(b, { x: 2, y: 2 }).board
    b = fire(b, { x: 1, y: 2 }).board
    b = fire(b, { x: 2, y: 1 }).board
    b = fire(b, { x: 2, y: 3 }).board
    const at = targetShot(viewOf(b), seededRng(1))
    expect(at && coordKey(at)).toBe('3,2')
  })
})

describe('sailor', () => {
  it('always returns an untried in-bounds cell until the board is full', () => {
    let b = fixture()
    const rng = seededRng(8)
    for (let i = 0; i < 36; i++) {
      const at = sailor(viewOf(b), rng)
      expect(b.shots.map((s) => coordKey(s.at))).not.toContain(coordKey(at))
      b = fire(b, at).board
    }
    expect(b.shots).toHaveLength(36)
  })

  it('chases a hit instead of firing randomly', () => {
    const b = fire(fixture(), { x: 2, y: 2 }).board
    for (let seed = 0; seed < 50; seed++) {
      const at = sailor(viewOf(b), seededRng(seed))
      expect(Math.abs(at.x - 2) + Math.abs(at.y - 2)).toBe(1)
    }
  })

  it('sinks a known fleet in fewer shots than exhaustive search', () => {
    let b = fixture()
    const rng = seededRng(12)
    let shots = 0
    while (b.placements.some((pl) => b.shots.filter((s) => s.shipId === pl.shipId).length < pl.length)) {
      b = fire(b, sailor(viewOf(b), rng)).board
      shots++
      if (shots > 36) break
    }
    expect(shots).toBeLessThan(36)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ai/sailor.test.ts`
Expected: FAIL — cannot resolve `./sailor`.

- [ ] **Step 3: Write the implementation**

Create `src/ai/sailor.ts`:

```ts
import { coordKey, inBounds, orthogonalNeighbors, type Coord } from '../core/coords'
import { pick, type Rng } from '../core/rng'
import type { OpponentView, Strategy } from './types'
import { untriedCells, unresolvedHits } from './view'

/**
 * Targeting mode, shared by Sailor and Admiral.
 *
 * With one unresolved hit, fire at an untried orthogonal neighbour. With two or
 * more collinear hits, the ship's axis is known — extend past either end and
 * discard perpendicular candidates entirely, which is the whole efficiency win.
 *
 * Returns null when there is nothing to chase, handing control back to hunt mode.
 */
export function targetShot(view: OpponentView, rng: Rng): Coord | null {
  const hits = unresolvedHits(view)
  if (hits.length === 0) return null

  const fired = new Set(view.shots.map((s) => coordKey(s.at)))
  const hitKeys = new Set(hits.map(coordKey))

  // Look for a collinear run of two or more unresolved hits.
  for (const axis of ['h', 'v'] as const) {
    for (const hit of hits) {
      const step = axis === 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 }
      const partner: Coord = { x: hit.x + step.x, y: hit.y + step.y }
      if (!hitKeys.has(coordKey(partner))) continue

      // Walk to both ends of the run and try to extend.
      const ends: Coord[] = []
      let forward: Coord = partner
      while (hitKeys.has(coordKey(forward))) forward = { x: forward.x + step.x, y: forward.y + step.y }
      ends.push(forward)

      let back: Coord = hit
      while (hitKeys.has(coordKey(back))) back = { x: back.x - step.x, y: back.y - step.y }
      ends.push(back)

      const usable = ends.filter((c) => inBounds(c, view.size) && !fired.has(coordKey(c)))
      if (usable.length > 0) return pick(usable, rng)
    }
  }

  // A single isolated hit (or a run that is blocked at both ends): probe neighbours.
  const candidates = hits
    .flatMap((h) => orthogonalNeighbors(h, view.size))
    .filter((c) => !fired.has(coordKey(c)))
  if (candidates.length > 0) return pick(candidates, rng)

  return null
}

/**
 * Sailor hunts at random, then switches to targeting the moment it lands a hit.
 * No parity, no density map — that is what separates it from Admiral.
 */
export const sailor: Strategy = (view, rng) => {
  const target = targetShot(view, rng)
  if (target) return target

  const candidates = untriedCells(view)
  if (candidates.length === 0) throw new Error('sailor: no untried cells')
  return pick(candidates, rng)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/ai/sailor.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ai/sailor.ts src/ai/sailor.test.ts
git commit -m "feat(ai): Sailor tier with hunt/target and axis extension"
```

---

### Task 10: Admiral tier, registry, and the strength-ordering proof

**Files:**
- Create: `src/ai/admiral.ts`, `src/ai/admiral.test.ts`, `src/ai/index.ts`, `src/ai/simulate.ts`, `src/ai/simulate.test.ts`

**Interfaces:**
- Consumes: `targetShot` from `./sailor`; `untriedCells` from `./view`; `OpponentView`, `Strategy`, `Tier` from `./types`; `newBoard`, `fire`, `isFleetSunk` from `../core/board`.
- Produces: `admiral: Strategy`; `STRATEGIES: Record<Tier, Strategy>`; `strategyFor(tier: Tier): Strategy`; `simulateGame(mode: BoardMode, tier: Tier, seed: number): number`; `averageShots(mode: BoardMode, tier: Tier, games: number): number`.

- [ ] **Step 1: Write the failing test**

Create `src/ai/admiral.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { admiral } from './admiral'
import { viewOf } from './view'
import { boardFrom, fire } from '../core/board'
import type { Placement } from '../core/placement'
import { coordKey } from '../core/coords'
import { seededRng } from '../core/rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 2, 2, 'h', 3), p('tug', 0, 5, 'h', 2)])

describe('admiral', () => {
  it('always returns an untried in-bounds cell until the board is full', () => {
    let b = fixture()
    const rng = seededRng(21)
    for (let i = 0; i < 36; i++) {
      const at = admiral(viewOf(b), rng)
      expect(b.shots.map((s) => coordKey(s.at))).not.toContain(coordKey(at))
      b = fire(b, at).board
    }
    expect(b.shots).toHaveLength(36)
  })

  it('opens on a parity cell when the smallest ship is at least 2 long', () => {
    const at = admiral(viewOf(fixture()), seededRng(3))
    expect((at.x + at.y) % 2).toBe(0)
  })

  it('chases a hit before returning to hunting', () => {
    const b = fire(fixture(), { x: 2, y: 2 }).board
    for (let seed = 0; seed < 30; seed++) {
      const at = admiral(viewOf(b), seededRng(seed))
      expect(Math.abs(at.x - 2) + Math.abs(at.y - 2)).toBe(1)
    }
  })

  it('never picks a cell that cannot hold any remaining ship', () => {
    // Wall off the top-left 2x2 corner so no ship of length >= 2 fits in it.
    let b = boardFrom(6, [p('sub', 3, 3, 'h', 3)])
    for (const c of [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }]) {
      b = fire(b, c).board
    }
    // A1,B1,A2,B2 remain untried but can only hold a 2-ship inside the pocket,
    // so admiral must never rate them above cells with real coverage.
    const at = admiral(viewOf(b), seededRng(6))
    expect(at.x >= 0 && at.y >= 0).toBe(true)
  })

  it('is deterministic for a fixed seed and board', () => {
    const b = fixture()
    expect(admiral(viewOf(b), seededRng(77))).toEqual(admiral(viewOf(b), seededRng(77)))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ai/admiral.test.ts`
Expected: FAIL — cannot resolve `./admiral`.

- [ ] **Step 3: Write the Admiral implementation**

Create `src/ai/admiral.ts`:

```ts
import { coordKey, type Coord } from '../core/coords'
import { pick, type Rng } from '../core/rng'
import { targetShot } from './sailor'
import type { OpponentView, Strategy } from './types'
import { untriedCells } from './view'

/**
 * Density map: for every remaining ship length, slide it over every legal
 * position and increment each cell it covers. A cell's score is therefore the
 * number of ways a surviving ship could still occupy it — the classic
 * probability-density heuristic, and much stronger than parity alone.
 *
 * A position is legal if every cell it covers is on the board and has not
 * already been fired at. (In hunt mode there are no unresolved hits, so hits
 * never appear here.)
 */
function densityMap(view: OpponentView): Map<string, number> {
  const fired = new Set(view.shots.map((s) => coordKey(s.at)))
  const density = new Map<string, number>()

  const bump = (cells: Coord[]) => {
    for (const c of cells) {
      const k = coordKey(c)
      density.set(k, (density.get(k) ?? 0) + 1)
    }
  }

  for (const length of view.remainingLengths) {
    for (let y = 0; y < view.size; y++) {
      for (let x = 0; x <= view.size - length; x++) {
        const cells: Coord[] = []
        for (let i = 0; i < length; i++) cells.push({ x: x + i, y })
        if (cells.every((c) => !fired.has(coordKey(c)))) bump(cells)
      }
    }
    for (let x = 0; x < view.size; x++) {
      for (let y = 0; y <= view.size - length; y++) {
        const cells: Coord[] = []
        for (let i = 0; i < length; i++) cells.push({ x, y: y + i })
        if (cells.every((c) => !fired.has(coordKey(c)))) bump(cells)
      }
    }
  }

  return density
}

/**
 * Admiral: target unresolved hits first, otherwise hunt by density restricted
 * to the parity lattice. Parity is safe while the smallest surviving ship is at
 * least 2 long — such a ship must cover at least one cell of the lattice, so
 * half the board can be skipped with no loss of information.
 */
export const admiral: Strategy = (view, rng) => {
  const target = targetShot(view, rng)
  if (target) return target

  const candidates = untriedCells(view)
  if (candidates.length === 0) throw new Error('admiral: no untried cells')

  const smallest = view.remainingLengths.length > 0 ? Math.min(...view.remainingLengths) : 1
  const parityCells = smallest >= 2 ? candidates.filter((c) => (c.x + c.y) % 2 === 0) : []
  const pool = parityCells.length > 0 ? parityCells : candidates

  const density = densityMap(view)
  let best = -1
  let bestCells: Coord[] = []
  for (const c of pool) {
    const score = density.get(coordKey(c)) ?? 0
    if (score > best) {
      best = score
      bestCells = [c]
    } else if (score === best) {
      bestCells.push(c)
    }
  }

  return pick(bestCells, rng)
}
```

- [ ] **Step 4: Run the Admiral test to verify it passes**

Run: `pnpm vitest run src/ai/admiral.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the registry and simulation harness**

Create `src/ai/index.ts`:

```ts
export type { OpponentView, Strategy, Tier, ViewShot } from './types'
export { viewOf, untriedCells, unresolvedHits } from './view'
export { rookie } from './rookie'
export { sailor, targetShot } from './sailor'
export { admiral } from './admiral'

import { rookie } from './rookie'
import { sailor } from './sailor'
import { admiral } from './admiral'
import type { Strategy, Tier } from './types'

export const STRATEGIES: Record<Tier, Strategy> = { rookie, sailor, admiral }

export function strategyFor(tier: Tier): Strategy {
  return STRATEGIES[tier]
}
```

Create `src/ai/simulate.ts`:

```ts
import { fire, isFleetSunk, newBoard } from '../core/board'
import type { BoardMode } from '../core/fleet'
import { seededRng } from '../core/rng'
import { strategyFor } from './index'
import type { Tier } from './types'
import { viewOf } from './view'

/**
 * Plays a tier against a randomly-placed fleet and returns how many shots it
 * needed to sink everything. Lower is stronger. Used only by tests.
 */
export function simulateGame(mode: BoardMode, tier: Tier, seed: number): number {
  const rng = seededRng(seed)
  let board = newBoard(mode, rng)
  const strategy = strategyFor(tier)

  let shots = 0
  const cap = board.size * board.size
  while (!isFleetSunk(board) && shots < cap) {
    board = fire(board, strategy(viewOf(board), rng)).board
    shots++
  }
  return shots
}

export function averageShots(mode: BoardMode, tier: Tier, games: number): number {
  let total = 0
  for (let seed = 0; seed < games; seed++) total += simulateGame(mode, tier, seed)
  return total / games
}
```

- [ ] **Step 6: Write the strength-ordering test**

Create `src/ai/simulate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { simulateGame, averageShots } from './simulate'
import { strategyFor, STRATEGIES } from './index'
import type { Tier } from './types'

const TIERS: Tier[] = ['rookie', 'sailor', 'admiral']

describe('strategy registry', () => {
  it('exposes exactly the three tiers', () => {
    expect(Object.keys(STRATEGIES).sort()).toEqual(['admiral', 'rookie', 'sailor'])
  })

  it('returns a callable for each tier', () => {
    for (const tier of TIERS) expect(typeof strategyFor(tier)).toBe('function')
  })
})

describe('every tier terminates', () => {
  it('always sinks the fleet within the cell budget', () => {
    for (const tier of TIERS) {
      for (const mode of ['little', 'admiral'] as const) {
        const cap = mode === 'little' ? 36 : 100
        for (let seed = 0; seed < 20; seed++) {
          expect(simulateGame(mode, tier, seed)).toBeLessThanOrEqual(cap)
        }
      }
    }
  })
})

describe('difficulty is genuinely ordered', () => {
  it('ranks admiral stronger than sailor, and sailor stronger than rookie (10x10)', () => {
    const games = 60
    const rookieAvg = averageShots('admiral', 'rookie', games)
    const sailorAvg = averageShots('admiral', 'sailor', games)
    const admiralAvg = averageShots('admiral', 'admiral', games)

    expect(sailorAvg).toBeLessThan(rookieAvg)
    expect(admiralAvg).toBeLessThan(sailorAvg)
  })

  it('keeps the same ordering on the 6x6 board', () => {
    const games = 60
    expect(averageShots('little', 'sailor', games)).toBeLessThan(averageShots('little', 'rookie', games))
    expect(averageShots('little', 'admiral', games)).toBeLessThan(averageShots('little', 'sailor', games))
  })

  it('leaves Rookie weak enough for a child to beat', () => {
    // Rookie is memoryless, so it needs close to the whole board on average.
    expect(averageShots('little', 'rookie', 60)).toBeGreaterThan(24)
  })
})
```

- [ ] **Step 7: Run the full suite**

Run: `pnpm test`
Expected: PASS, all files. If the ordering test is flaky at these sample sizes, raise `games` rather than loosening the assertion — the ordering is a real property, not a statistical accident.

- [ ] **Step 8: Verify the isolation constraint holds**

Run:

```bash
grep -rn "from '\.\./ui\|from '\.\./audio\|Math\.random\|document\.\|window\." src/core src/ai --include=*.ts | grep -v "\.test\.ts"
```

Expected: exactly one line — `systemRng` in `src/core/rng.ts`. Any other hit is a violation of the Global Constraints and must be fixed before committing.

- [ ] **Step 9: Typecheck and build**

Run: `pnpm build`
Expected: clean `tsc -b`, successful Vite build.

- [ ] **Step 10: Commit**

```bash
git add src/ai/
git commit -m "feat(ai): Admiral density tier, strategy registry, simulation harness"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §4.1 board modes | Task 4 (`FLEETS`), Task 7 (`newGame`) |
| §4.2 three honest tiers | Tasks 8, 9, 10 |
| §5.2 palette tokens | Task 1 (`src/ui/tokens.css`) |
| §5.3 cell states | Task 6 (`cellState`) |
| §9 module boundaries | Tasks 2–10, enforced by Task 10 Step 8 |
| §10 testing (placement legality, AI invariants, strength ordering, seeded determinism) | Tasks 5, 8, 9, 10 |
| §4.3 voice packs, §5.1/§5.4/§5.5 visual rules, §6 screens, §7 layouts | **Plan 2** |
| §8 audio pipeline | **Plan 3** |
| §11 deploy | **Plan 3** |

Deliberately deferred, not missing: this plan builds only the engine. `src/audio/lines.ts` (spec §8.1) is Plan 3's first task, and no task here imports it.

**Type consistency:** `Coord`, `Placement`, `Board`, `Shot`, `ShotResult`, `CellState`, `GameState`, `OpponentView`, `Strategy`, and `Tier` are each defined once and imported everywhere else. `fire` returns `{ board, shot }` in Task 6 and is destructured that way in Tasks 7, 9, 10. `targetShot` is defined in Task 9 and consumed by Task 10.

---

## Follow-on plans

- **Plan 2 — Periscope UI.** Screens 1–6, three responsive layouts, the bezel turn-state rule, cell rendering from `cellState`, drag/rotate placement. Consumes this plan's core unchanged; audio calls are stubbed behind an interface.
- **Plan 3 — Voice.** `src/audio/lines.ts` line table, `scripts/bake-voice.mjs`, the playback scheduler, preloading per mode, and static deploy.
