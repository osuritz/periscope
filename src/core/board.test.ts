import { describe, it, expect } from 'vitest'
import { boardFrom, fire, alreadyFired, sunkShipIds, isFleetSunk, cellState, newBoard } from './board'
import type { Placement } from './placement'
import { seededRng } from './rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

// A 6x6 board: 'sub' occupies A1,B1,C1; 'tug' occupies A3,A4.
const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('fire', () => {
  it('reports a miss on empty water', () => {
    const { shot } = fire(fixture(), { x: 5, y: 5 })
    expect(shot.result).toBe('miss')
    expect(shot.shipId).toBeUndefined()
  })

  it('reports a hit on a ship that survives', () => {
    const { shot } = fire(fixture(), { x: 0, y: 0 })
    expect(shot.result).toBe('hit')
    expect(shot.shipId).toBe('sub')
  })

  it('reports sunk on the final cell of a ship', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    const { shot } = fire(b, { x: 0, y: 3 })
    expect(shot.result).toBe('sunk')
    expect(shot.shipId).toBe('tug')
  })

  it('does not mutate the input board', () => {
    const b = fixture()
    fire(b, { x: 0, y: 0 })
    expect(b.shots).toHaveLength(0)
  })

  it('is idempotent when firing at the same cell twice', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 0 }).board
    const after = fire(b, { x: 0, y: 0 })
    expect(after.board.shots).toHaveLength(1)
    expect(after.shot.result).toBe('hit')
    expect(after.board).toBe(b)
  })

  it('throws when firing off the board', () => {
    expect(() => fire(fixture(), { x: 9, y: 9 })).toThrow('fire: out of bounds')
  })
})

describe('alreadyFired', () => {
  it('tracks fired cells', () => {
    const b = fire(fixture(), { x: 1, y: 1 }).board
    expect(alreadyFired(b, { x: 1, y: 1 })).toBe(true)
    expect(alreadyFired(b, { x: 2, y: 2 })).toBe(false)
  })
})

describe('sunkShipIds and isFleetSunk', () => {
  it('reports nothing sunk on a fresh board', () => {
    expect(sunkShipIds(fixture())).toEqual([])
    expect(isFleetSunk(fixture())).toBe(false)
  })

  it('reports a ship sunk only when every cell is hit', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 0 }).board
    b = fire(b, { x: 1, y: 0 }).board
    expect(sunkShipIds(b)).toEqual([])
    b = fire(b, { x: 2, y: 0 }).board
    expect(sunkShipIds(b)).toEqual(['sub'])
    expect(isFleetSunk(b)).toBe(false)
  })

  it('reports the fleet sunk when all ships are destroyed', () => {
    let b = fixture()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      b = fire(b, c).board
    }
    expect(isFleetSunk(b)).toBe(true)
    expect(sunkShipIds(b).sort()).toEqual(['sub', 'tug'])
  })
})

describe('cellState', () => {
  it('hides unfired ship cells from the opponent but shows them to the owner', () => {
    const b = fixture()
    expect(cellState(b, { x: 0, y: 0 }, false)).toBe('unknown')
    expect(cellState(b, { x: 0, y: 0 }, true)).toBe('ship')
  })

  it('shows misses and hits to both', () => {
    let b = fixture()
    b = fire(b, { x: 5, y: 5 }).board
    b = fire(b, { x: 0, y: 0 }).board
    expect(cellState(b, { x: 5, y: 5 }, false)).toBe('miss')
    expect(cellState(b, { x: 0, y: 0 }, false)).toBe('hit')
  })

  it('upgrades every cell of a destroyed ship to sunk', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    expect(cellState(b, { x: 0, y: 2 }, false)).toBe('hit')
    b = fire(b, { x: 0, y: 3 }).board
    expect(cellState(b, { x: 0, y: 2 }, false)).toBe('sunk')
    expect(cellState(b, { x: 0, y: 3 }, false)).toBe('sunk')
  })

  it('reports untouched empty water as unknown', () => {
    expect(cellState(fixture(), { x: 4, y: 4 }, true)).toBe('unknown')
  })
})

describe('newBoard', () => {
  it('builds a board with a full legal fleet', () => {
    const b = newBoard('admiral', seededRng(5))
    expect(b.size).toBe(10)
    expect(b.placements).toHaveLength(5)
    expect(b.shots).toEqual([])
  })
})
