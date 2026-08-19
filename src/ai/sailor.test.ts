import { describe, it, expect } from 'vitest'
import { sailor, targetShot } from './sailor'
import { viewOf, unresolvedHits } from './view'
import { boardFrom, fire } from '../core/board'
import type { Placement } from '../core/placement'
import { coordKey, orthogonalNeighbors } from '../core/coords'
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

  it('stays legal when two different ships leave orthogonally-adjacent hits', () => {
    // shipA (vertical, length 3) at A2-A4. shipB (vertical, length 2) at B1-B2.
    // A's hit at (0,1) and B's hit at (1,1) are horizontally adjacent, so
    // targetShot infers a phantom run between two DIFFERENT ships' hits —
    // it has no way to know they belong to different ships, since OpponentView
    // carries no such information. The guarantee under test is narrower than
    // "finds the right cell": whatever it fires at must still be legal.
    let b = boardFrom(6, [p('shipA', 0, 1, 'v', 3), p('shipB', 1, 0, 'v', 2)])
    b = fire(b, { x: 1, y: 1 }).board // hits shipB
    b = fire(b, { x: 0, y: 3 }).board // hits shipA
    b = fire(b, { x: 0, y: 1 }).board // hits shipA, leaving a gap at (0,2)

    const view = viewOf(b)
    const fired = new Set(view.shots.map((s) => coordKey(s.at)))
    const legalCandidates = new Set(
      unresolvedHits(view)
        .flatMap((h) => orthogonalNeighbors(h, view.size))
        .filter((c) => !fired.has(coordKey(c)))
        .map(coordKey),
    )

    for (let seed = 0; seed < 50; seed++) {
      const at = targetShot(view, seededRng(seed))
      expect(at).not.toBeNull() // load-bearing: must still return a legal cell
      expect(fired.has(coordKey(at!))).toBe(false)
      expect(legalCandidates.has(coordKey(at!))).toBe(true)
    }
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
})
