import { describe, it, expect } from 'vitest'
import { computerShot } from './index'
import { viewOf, untriedCells } from './view'
import { boardFrom, fire, isFleetSunk } from '../core/board'
import { allCoords, coordEquals, coordKey } from '../core/coords'
import type { BoardMode } from '../core/fleet'
import { applyShot, newGame, startPlaying, type GameState } from '../core/game'
import type { Placement } from '../core/placement'
import { pick, seededRng, type Rng } from '../core/rng'
import type { Tier } from './types'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

/**
 * The human side, modelled the way `rookie.ts` models a five-year-old: a
 * uniform pick among cells not yet fired at. The point of this driver is not
 * the player's skill but the handoff — it is the only place in the suite where
 * `applyShot`'s computer branch, the turn rule and `viewOf` run together.
 */
function playerShot(g: GameState, rng: Rng): GameState {
  const untried = untriedCells(viewOf(g.computer))
  expect(untried.length).toBeGreaterThan(0)
  const at = pick(untried, rng)
  expect(g.computer.shots.some((s) => coordEquals(s.at, at))).toBe(false)

  const before = g.computer.shots.length
  const next = applyShot(g, 'player', at)
  // A repeat shot would no-op and leave the length unchanged, so this is the
  // "no illegal shot was attempted" assertion, not just a bookkeeping check.
  expect(next.computer.shots).toHaveLength(before + 1)
  return next
}

function playToFinish(mode: BoardMode, tier: Tier, seed: number): GameState {
  const rng = seededRng(seed)
  let g = startPlaying(newGame(mode, rng))
  const cells = g.size * g.size

  let turns = 0
  while (g.phase === 'playing') {
    // Every turn consumes a cell on one board or the other, so 2 * cells is a
    // hard ceiling. Blowing it means the handoff deadlocked.
    if (++turns > 2 * cells) throw new Error(`playToFinish: no winner after ${turns} turns`)

    if (g.turn === 'player') {
      g = playerShot(g, rng)
    } else {
      const before = g.player.shots.length
      g = computerShot(g, tier, rng)
      expect(g.player.shots).toHaveLength(before + 1)
    }

    expect(g.player.shots.length).toBeLessThanOrEqual(cells)
    expect(g.computer.shots.length).toBeLessThanOrEqual(cells)
  }
  return g
}

describe('a full game against the computer', () => {
  for (const mode of ['little', 'admiral'] as const) {
    for (const tier of ['rookie', 'sailor', 'admiral'] as const) {
      it(`terminates with exactly one winner (${mode} / ${tier})`, () => {
        for (let seed = 0; seed < 5; seed++) {
          const g = playToFinish(mode, tier, seed)

          expect(g.phase).toBe('over')
          expect(g.winner).not.toBeNull()

          // Exactly one winner: the loser's fleet is intact enough to still be
          // afloat. Both boards cleared would mean the state machine let the
          // game run past its own end.
          if (g.winner === 'player') {
            expect(isFleetSunk(g.computer)).toBe(true)
            expect(isFleetSunk(g.player)).toBe(false)
          } else {
            expect(isFleetSunk(g.player)).toBe(true)
            expect(isFleetSunk(g.computer)).toBe(false)
          }
        }
      })
    }
  }

  it('never fires twice at the same cell on either board', () => {
    const g = playToFinish('little', 'sailor', 7)
    for (const board of [g.player, g.computer]) {
      const keys = board.shots.map((s) => coordKey(s.at))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})

describe('computerShot', () => {
  /**
   * The player board has exactly one untried cell; the computer board has
   * thirty-six. Reading `viewOf(g.computer)` by mistake would therefore pick
   * from the wrong candidate set, and this assertion is what catches it.
   */
  function riggedTurn(): GameState {
    let b = boardFrom(6, [p('tug', 4, 5, 'h', 2)])
    for (const c of allCoords(6)) {
      if (!coordEquals(c, { x: 5, y: 5 })) b = fire(b, c).board
    }
    expect(isFleetSunk(b)).toBe(false)
    return { ...startPlaying(newGame('little', seededRng(1))), turn: 'computer', player: b }
  }

  it('fires at the player board, not its own', () => {
    const g = riggedTurn()
    const next = computerShot(g, 'rookie', seededRng(3))
    expect(next.lastShot?.at).toEqual({ x: 5, y: 5 })
    expect(next.lastShot?.by).toBe('computer')
    expect(next.computer.shots).toEqual(g.computer.shots)
  })

  it('always consumes the turn or ends the game', () => {
    const g = riggedTurn()
    const next = computerShot(g, 'rookie', seededRng(3))
    expect(next).not.toBe(g)
    expect(next.phase).toBe('over')
    expect(next.winner).toBe('computer')
  })

  it('refuses to act out of turn', () => {
    const g = startPlaying(newGame('little', seededRng(1)))
    expect(g.turn).toBe('player')
    expect(() => computerShot(g, 'rookie', seededRng(1))).toThrow('computerShot: not computer turn')
  })

  it('refuses to act before the game starts', () => {
    const g = { ...newGame('little', seededRng(1)), turn: 'computer' as const }
    expect(() => computerShot(g, 'rookie', seededRng(1))).toThrow('computerShot: not playing')
  })

  it('refuses to act once the game is over', () => {
    const g = playToFinish('little', 'rookie', 0)
    expect(() => computerShot(g, 'rookie', seededRng(1))).toThrow('computerShot: game is over')
  })
})
