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

  it('never picks a walled-off pocket cell that cannot hold any remaining ship', () => {
    // Wall off the top-left 2x2 corner so no ship of length >= 2 fits in it.
    let b = boardFrom(6, [p('sub', 3, 3, 'h', 3)])
    for (const c of [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }]) {
      b = fire(b, c).board
    }
    // A1,B1,A2,B2 (the corners of the pocket) remain untried, but the only
    // surviving ship is length 3 and no length-3 placement fits inside the
    // pocket: every placement that would cover one of these four cells also
    // needs (2,0), (2,1), (0,2), or (1,2), which are all fired. So all four
    // pocket cells have zero density, and a correct density search must
    // never choose one over a cell with real coverage.
    const pocket = new Set(
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }].map(coordKey),
    )
    for (let seed = 0; seed < 20; seed++) {
      const at = admiral(viewOf(b), seededRng(seed))
      expect(pocket.has(coordKey(at))).toBe(false)
    }
  })

  it('is deterministic for a fixed seed and board', () => {
    const b = fixture()
    expect(admiral(viewOf(b), seededRng(77))).toEqual(admiral(viewOf(b), seededRng(77)))
  })
})
