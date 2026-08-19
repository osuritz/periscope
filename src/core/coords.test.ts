import { describe, it, expect } from 'vitest'
import { coordLabel, inBounds, coordEquals, coordKey, orthogonalNeighbors, allCoords } from './coords'

describe('coordLabel', () => {
  it('renders column letter and 1-based row', () => {
    expect(coordLabel({ x: 0, y: 0 })).toBe('A1')
    expect(coordLabel({ x: 2, y: 6 })).toBe('C7')
    expect(coordLabel({ x: 9, y: 9 })).toBe('J10')
  })

  it('throws a RangeError on an out-of-range coord', () => {
    expect(() => coordLabel({ x: -1, y: 0 })).toThrow(RangeError)
    expect(() => coordLabel({ x: 0, y: -1 })).toThrow(RangeError)
    expect(() => coordLabel({ x: 10, y: 0 })).toThrow(RangeError)
    expect(() => coordLabel({ x: 0, y: 10 })).toThrow(RangeError)
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
