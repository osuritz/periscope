import { fire, isFleetSunk, newBoard } from '../core/board'
import type { BoardMode } from '../core/fleet'
import { seededRng } from '../core/rng'
import { strategyFor } from './index'
import type { Tier } from './types'
import { viewOf } from './view'

/**
 * Plays a tier against a randomly-placed fleet and returns how many shots it
 * needed to sink everything. Lower is stronger. Used only by tests.
 *
 * Returns `null` when the loop hit the one-shot-per-cell cap without sinking
 * the fleet. That distinction is the whole point of the return type: the loop
 * is bounded by the cap, so a plain shot count is `<= cap` by construction and
 * a caller asserting only `<= cap` cannot tell a clean win from a strategy
 * that burned the budget re-firing at cells it had already tried.
 */
export function simulateGame(mode: BoardMode, tier: Tier, seed: number): number | null {
  const rng = seededRng(seed)
  let board = newBoard(mode, rng)
  const strategy = strategyFor(tier)

  let shots = 0
  const cap = board.size * board.size
  while (!isFleetSunk(board) && shots < cap) {
    board = fire(board, strategy(viewOf(board), rng)).board
    shots++
  }
  return isFleetSunk(board) ? shots : null
}

/**
 * Mean shots to clear the board over `games` seeded games. Throws if any game
 * failed to finish rather than coercing a `null` to 0 and quietly reporting a
 * stronger average than the tier earned.
 */
export function averageShots(mode: BoardMode, tier: Tier, games: number): number {
  let total = 0
  for (let seed = 0; seed < games; seed++) {
    const shots = simulateGame(mode, tier, seed)
    if (shots === null) {
      throw new Error(`averageShots: ${tier} failed to sink the ${mode} fleet on seed ${seed}`)
    }
    total += shots
  }
  return total / games
}
