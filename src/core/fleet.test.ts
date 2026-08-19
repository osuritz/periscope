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
