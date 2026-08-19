import { describe, it, expect } from 'vitest'
import { newGame, startPlaying, applyShot, shufflePlayerFleet, movePlayerShip } from './game'
import { placementCells } from './placement'
import { boardFrom } from './board'
import type { Placement } from './placement'
import { seededRng } from './rng'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

/** A deterministic 6x6 game: computer has 'sub' at A1..C1 and 'tug' at A3..A4. */
function riggedGame() {
  const g = startPlaying(newGame('little', seededRng(1)))
  return { ...g, computer: boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)]) }
}

describe('newGame', () => {
  it('starts in setup with a placed player fleet and no shots', () => {
    const g = newGame('little', seededRng(1))
    expect(g.phase).toBe('setup')
    expect(g.player.placements).toHaveLength(3)
    expect(g.player.shots).toEqual([])
    expect(g.computer.placements).toHaveLength(3)
    expect(g.winner).toBeNull()
  })

  it('gives the player the first turn', () => {
    expect(newGame('little', seededRng(1)).turn).toBe('player')
  })

  it('uses the board size of the chosen mode', () => {
    expect(newGame('admiral', seededRng(1)).size).toBe(10)
  })
})

describe('setup', () => {
  it('shuffles only the player fleet, leaving the computer alone', () => {
    const g = newGame('little', seededRng(1))
    const shuffled = shufflePlayerFleet(g, seededRng(2))
    expect(shuffled.player.placements).not.toEqual(g.player.placements)
    expect(shuffled.computer.placements).toEqual(g.computer.placements)
  })

  it('accepts a legal ship move', () => {
    const g = { ...newGame('little', seededRng(1)) }
    const rigged = { ...g, player: boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)]) }
    const moved = movePlayerShip(rigged, p('tug', 4, 4, 'v', 2))
    expect(moved.player.placements.find((x) => x.shipId === 'tug')!.origin).toEqual({ x: 4, y: 4 })
  })

  it('ignores an illegal ship move', () => {
    const g = newGame('little', seededRng(1))
    const rigged = { ...g, player: boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)]) }
    const moved = movePlayerShip(rigged, p('tug', 0, 0, 'v', 2))
    expect(moved.player.placements).toEqual(rigged.player.placements)
  })

  it('rejects a placement whose length contradicts the fleet spec', () => {
    // fire() and sunkShipIds() read length off the Placement, so a shortened
    // submarine would silently change the win condition rather than misdraw.
    const g = newGame('little', seededRng(1))
    expect(() => movePlayerShip(g, p('submarine', 0, 0, 'h', 1))).toThrow(
      'movePlayerShip: submarine has length 3, got 1',
    )
  })

  it('rejects a ship that is not in the fleet at all', () => {
    const g = newGame('little', seededRng(1))
    expect(() => movePlayerShip(g, p('battleship', 0, 0, 'h', 4))).toThrow(
      "movePlayerShip: no ship 'battleship' in the little fleet",
    )
  })

  it('refuses to move ships once playing', () => {
    const g = startPlaying(newGame('little', seededRng(1)))
    expect(() => movePlayerShip(g, p('tug', 4, 4, 'v', 2))).toThrow('movePlayerShip: not in setup')
  })
})

describe('startPlaying', () => {
  it('moves from setup to playing', () => {
    expect(startPlaying(newGame('little', seededRng(1))).phase).toBe('playing')
  })

  it('refuses to restart a game that is already playing', () => {
    const g = startPlaying(newGame('little', seededRng(1)))
    expect(() => startPlaying(g)).toThrow('startPlaying: not in setup')
  })

  it('refuses to revive a finished game', () => {
    // A UI wiring DIVE AGAIN to startPlaying instead of newGame would otherwise
    // get phase 'playing' with the winner still set and every cell fired.
    let g = riggedGame()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      g = applyShot(g, 'player', c)
    }
    expect(g.phase).toBe('over')
    expect(() => startPlaying(g)).toThrow('startPlaying: not in setup')
  })
})

describe('applyShot', () => {
  it('records the player shot against the computer board', () => {
    const g = applyShot(riggedGame(), 'player', { x: 0, y: 0 })
    expect(g.computer.shots).toHaveLength(1)
    expect(g.player.shots).toHaveLength(0)
    expect(g.lastShot).toEqual({ by: 'player', at: { x: 0, y: 0 }, result: 'hit', shipId: 'sub' })
  })

  it('keeps the turn with the player after a hit', () => {
    expect(applyShot(riggedGame(), 'player', { x: 0, y: 0 }).turn).toBe('player')
  })

  it('passes the turn to the computer after a miss', () => {
    expect(applyShot(riggedGame(), 'player', { x: 5, y: 5 }).turn).toBe('computer')
  })

  it('rejects a shot from the side whose turn it is not', () => {
    expect(() => applyShot(riggedGame(), 'computer', { x: 0, y: 0 })).toThrow('applyShot: not computer turn')
  })

  it('does not consume a turn when firing at an already-fired cell', () => {
    let g = applyShot(riggedGame(), 'player', { x: 5, y: 5 }) // miss -> computer turn
    g = { ...g, turn: 'player' }
    const again = applyShot(g, 'player', { x: 5, y: 5 })
    expect(again.computer.shots).toHaveLength(1)
    expect(again.turn).toBe('player')
  })

  it('does not consume a turn when the computer fires at an already-fired cell', () => {
    // Mirror of the player-side case above. Now load-bearing: computerShot
    // detects this no-op by reference identity and throws rather than letting a
    // UI turn loop spin.
    let g = startPlaying(newGame('little', seededRng(1)))
    g = { ...g, turn: 'computer', player: boardFrom(6, [p('tug', 0, 0, 'h', 2)]) }
    g = applyShot(g, 'computer', { x: 5, y: 5 }) // miss -> player turn
    expect(g.turn).toBe('player')

    const before = { ...g, turn: 'computer' as const }
    const again = applyShot(before, 'computer', { x: 5, y: 5 })
    expect(again).toBe(before) // same reference, exactly as on the player side
    expect(again.player.shots).toHaveLength(1)
    expect(again.turn).toBe('computer')
  })

  it('declares the player the winner when the computer fleet is destroyed', () => {
    let g = riggedGame()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      g = applyShot(g, 'player', c)
    }
    expect(g.phase).toBe('over')
    expect(g.winner).toBe('player')
  })

  it('refuses shots once the game is over', () => {
    let g = riggedGame()
    for (const c of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 3 }]) {
      g = applyShot(g, 'player', c)
    }
    expect(() => applyShot(g, 'player', { x: 5, y: 5 })).toThrow('applyShot: game is over')
  })

  it('declares the computer the winner when the player fleet is destroyed', () => {
    let g = startPlaying(newGame('little', seededRng(1)))
    g = { ...g, turn: 'computer', player: boardFrom(6, [p('tug', 0, 0, 'h', 2)]) }
    g = applyShot(g, 'computer', { x: 0, y: 0 })
    g = applyShot(g, 'computer', { x: 1, y: 0 })
    expect(g.winner).toBe('computer')
    expect(g.phase).toBe('over')
  })

  it('never lets a player shot touch the player board', () => {
    const g = riggedGame()
    const after = applyShot(g, 'player', { x: 0, y: 0 })
    expect(after.player).toBe(g.player)
  })
})

describe('fleet integrity', () => {
  it('never overlaps ships in a generated game', () => {
    for (let seed = 0; seed < 100; seed++) {
      const g = newGame('admiral', seededRng(seed))
      for (const board of [g.player, g.computer]) {
        const seen = new Set<string>()
        for (const pl of board.placements) {
          for (const c of placementCells(pl)) {
            const k = `${c.x},${c.y}`
            expect(seen.has(k)).toBe(false)
            seen.add(k)
          }
        }
      }
    }
  })
})
