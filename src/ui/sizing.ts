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
