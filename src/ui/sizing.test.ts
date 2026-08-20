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
