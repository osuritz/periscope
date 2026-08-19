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
