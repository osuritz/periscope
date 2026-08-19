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
