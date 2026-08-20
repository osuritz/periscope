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

describe('scopeSizing with fit', () => {
  it('keeps the spec size when the available height already fits it', () => {
    // 1024×768: ample room, matches the brief's "none clipped" measurement.
    expect(scopeSizing('landscape', 'little', { rows: 6, availableHeight: 478 })).toEqual({
      cell: 72,
      gap: 8,
    })
  })

  it('shrinks the gap before the cell on a mild shortfall', () => {
    // 1133×744 (iPad mini landscape): 18px short of the spec's 472px content
    // height. The cell size — the part of the invariant that actually reads
    // as "large" — should be the last thing to give.
    const sizing = scopeSizing('landscape', 'little', { rows: 6, availableHeight: 452 })
    expect(sizing.cell).toBe(72)
    expect(sizing.cell * 6 + sizing.gap * 5).toBeLessThanOrEqual(452)
  })

  it('floors the cell at 44px on a severe shortfall, never below it', () => {
    // 844×390 (phone held sideways): nowhere near enough room for the spec
    // table even at 0 gap, so this must floor rather than violate the tap
    // minimum.
    const sizing = scopeSizing('landscape', 'little', { rows: 6, availableHeight: 272 })
    expect(sizing.cell).toBe(44)
    expect(sizing.cell * 6 + sizing.gap * 5).toBeLessThanOrEqual(272)
  })

  it('still returns the 44px floor when nothing fits, rather than shrinking further', () => {
    // A 10-row board in a viewport with almost no height left: even the
    // floor size overflows. Returning the floor (not something smaller) is
    // the honest answer — the tap-target rule doesn't bend further.
    expect(scopeSizing('landscape', 'admiral', { rows: 10, availableHeight: 50 })).toEqual({
      cell: 44,
      gap: 1,
    })
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
