import type { BoardMode } from '../core/fleet'
import type { LayoutName } from './layout'

export type CellSizing = { cell: number; gap: number }

/** How much room a `rows`-tall grid needs at a given cell size. */
function contentHeight(rows: number, sizing: CellSizing): number {
  return rows * sizing.cell + (rows - 1) * sizing.gap
}

const TAP_FLOOR = 44

/**
 * Spec §5.5. The enemy scope is the only interactive grid, so every value here
 * is at or above the 44px tap floor — a five-year-old's fingertip.
 *
 * `fit` is for a viewport where the spec's px table genuinely will not fit —
 * a phone held sideways has nowhere near enough height for it (see
 * `useCompact`/`useViewportHeight` in `layout.ts`). Given the number of rows
 * the board has and the height actually available for the grid, this returns
 * the largest cell size (and, failing that, the largest gap) that fits,
 * floored at the 44px tap minimum. The spec's exact px values are
 * deliberately not preserved here — a visible board beats a spec-exact
 * invisible one. Below the floor, it returns the floor size regardless of
 * whether that still overflows: a 10-row board on an extremely short
 * viewport has nowhere left to give without breaking the tap-target rule,
 * and that's a genuine device limitation, not something this function can
 * paper over.
 */
export function scopeSizing(
  layout: LayoutName,
  mode: BoardMode,
  fit?: { rows: number; availableHeight: number },
): CellSizing {
  const spec =
    layout === 'phone'
      ? mode === 'little'
        ? { cell: 46, gap: 4 }
        : { cell: 44, gap: 3 }
      : mode === 'little'
        ? { cell: 72, gap: 8 }
        : { cell: 52, gap: 5 }

  if (!fit) return spec
  const { rows, availableHeight } = fit
  if (contentHeight(rows, spec) <= availableHeight) return spec

  for (let cell = spec.cell; cell >= TAP_FLOOR; cell--) {
    for (let gap = spec.gap; gap >= 1; gap--) {
      if (contentHeight(rows, { cell, gap }) <= availableHeight) return { cell, gap }
    }
  }
  return { cell: TAP_FLOOR, gap: 1 }
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
