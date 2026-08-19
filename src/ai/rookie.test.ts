import { describe, it, expect } from 'vitest'
import { rookie } from './rookie'
import { viewOf, untriedCells } from './view'
import { boardFrom, fire } from '../core/board'
import type { Placement } from '../core/placement'
import { coordKey } from '../core/coords'
import { seededRng } from '../core/rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('viewOf', () => {
  it('hides ship placements from the strategy', () => {
    const view = viewOf(fixture()) as unknown as Record<string, unknown>
    expect(view.placements).toBeUndefined()
  })

  it('reports remaining ship lengths without revealing positions', () => {
    expect(viewOf(fixture()).remainingLengths.sort()).toEqual([2, 3])
  })

  it('drops a ship from remainingLengths once it is sunk', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    expect(viewOf(b).remainingLengths).toEqual([3])
  })

  it('relabels every cell of a fully-destroyed ship as sunk, not just the last one hit', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    const view = viewOf(b)
    const first = view.shots.find((s) => coordKey(s.at) === coordKey({ x: 0, y: 2 }))
    const second = view.shots.find((s) => coordKey(s.at) === coordKey({ x: 0, y: 3 }))
    expect(first?.result).toBe('sunk')
    expect(second?.result).toBe('sunk')
  })
})

describe('untriedCells', () => {
  it('excludes cells already fired at', () => {
    const b = fire(fixture(), { x: 1, y: 1 }).board
    const untried = untriedCells(viewOf(b))
    expect(untried).toHaveLength(35)
    expect(untried.map(coordKey)).not.toContain('1,1')
  })
})

describe('rookie', () => {
  it('always returns an untried in-bounds cell', () => {
    let b = fixture()
    const rng = seededRng(4)
    for (let i = 0; i < 36; i++) {
      const view = viewOf(b)
      const at = rookie(view, rng)
      expect(at.x).toBeGreaterThanOrEqual(0)
      expect(at.y).toBeGreaterThanOrEqual(0)
      expect(at.x).toBeLessThan(6)
      expect(at.y).toBeLessThan(6)
      expect(b.shots.map((s) => coordKey(s.at))).not.toContain(coordKey(at))
      b = fire(b, at).board
    }
    expect(b.shots).toHaveLength(36)
  })

  it('throws when the board is exhausted', () => {
    let b = fixture()
    const rng = seededRng(4)
    for (let i = 0; i < 36; i++) b = fire(b, rookie(viewOf(b), rng)).board
    expect(() => rookie(viewOf(b), rng)).toThrow('no untried cells')
  })

  it('does not chase adjacent cells after a hit', () => {
    // Rookie is memoryless. Given a hit at C1, its next shot should be
    // adjacent no more often than chance. Over many trials, an adjacency rate
    // near 4/35 is expected; a targeting AI would be far above it.
    let adjacent = 0
    const trials = 400
    for (let seed = 0; seed < trials; seed++) {
      const b = fire(fixture(), { x: 2, y: 0 }).board
      const at = rookie(viewOf(b), seededRng(seed))
      const dist = Math.abs(at.x - 2) + Math.abs(at.y - 0)
      if (dist === 1) adjacent++
    }
    expect(adjacent / trials).toBeLessThan(0.25)
  })
})
