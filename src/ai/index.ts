export type { OpponentView, Strategy, Tier, ViewShot } from './types'
export { viewOf, untriedCells, unresolvedHits } from './view'
export { rookie } from './rookie'
export { sailor, targetShot } from './sailor'
export { admiral } from './admiral'

import { applyShot, type GameState } from '../core/game'
import type { Rng } from '../core/rng'
import { rookie } from './rookie'
import { sailor } from './sailor'
import { admiral } from './admiral'
import type { Strategy, Tier } from './types'
import { viewOf } from './view'

export const STRATEGIES: Record<Tier, Strategy> = { rookie, sailor, admiral }

export function strategyFor(tier: Tier): Strategy {
  return STRATEGIES[tier]
}

/**
 * Takes the computer's turn: picks a cell with `tier`'s strategy and applies it.
 * This lives in `ai/` and not in `core/game.ts` because the spec's architecture
 * has `core/` depending on nothing; an AI driver in core would invert that.
 *
 * It owns `viewOf(g.player)` so no caller can hand a strategy the wrong board.
 * That mistake is one token wide and has no type-level protection — both boards
 * are `Board` — and its symptom is nasty: the strategy returns a cell already
 * fired on the real target, `applyShot` no-ops, the turn is never consumed, and
 * a UI's `while (turn === 'computer')` loop spins forever.
 *
 * Guards duplicate `applyShot`'s, deliberately. `applyShot` can only check
 * after the coordinate exists, by which point a bad call has already run the
 * strategy — and on a finished board that throws `no untried cells`, a symptom
 * rather than a diagnosis. Checking first makes the error name the real fault.
 */
export function computerShot(g: GameState, tier: Tier, rng: Rng): GameState {
  if (g.phase === 'over') throw new Error('computerShot: game is over')
  if (g.phase !== 'playing') throw new Error('computerShot: not playing')
  if (g.turn !== 'computer') throw new Error('computerShot: not computer turn')

  const at = strategyFor(tier)(viewOf(g.player), rng)
  const next = applyShot(g, 'computer', at)

  // applyShot returns `g` by reference when the cell was already fired at. For
  // the player that is double-tap protection; for the computer it is a deadlock.
  // Unreachable while the strategy honours its contract, so it is a tripwire on
  // the strategy, turning a hung turn loop into a named failure.
  if (next === g) throw new Error('computerShot: strategy returned an already-fired cell')
  return next
}
