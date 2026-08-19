import { fire, isFleetSunk, newBoard } from '../core/board'
import type { BoardMode } from '../core/fleet'
import { seededRng } from '../core/rng'
import { strategyFor } from './index'
import type { Tier } from './types'
import { viewOf } from './view'

/**
 * Plays a tier against a randomly-placed fleet and returns how many shots it
 * needed to sink everything. Lower is stronger. Used only by tests.
 */
export function simulateGame(mode: BoardMode, tier: Tier, seed: number): number {
  const rng = seededRng(seed)
  let board = newBoard(mode, rng)
  const strategy = strategyFor(tier)

  let shots = 0
  const cap = board.size * board.size
  while (!isFleetSunk(board) && shots < cap) {
    board = fire(board, strategy(viewOf(board), rng)).board
    shots++
  }
  return shots
}

export function averageShots(mode: BoardMode, tier: Tier, games: number): number {
  let total = 0
  for (let seed = 0; seed < games; seed++) total += simulateGame(mode, tier, seed)
  return total / games
}
