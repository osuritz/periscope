import type { Coord } from '../core/coords'
import type { ShotResult } from '../core/board'
import type { Rng } from '../core/rng'

export type ViewShot = { at: Coord; result: ShotResult }

/**
 * Everything a strategy is allowed to know. Deliberately excludes ship
 * placements — this type IS the anti-cheating guarantee.
 */
export type OpponentView = {
  size: number
  shots: ViewShot[]
  /** Lengths of ships not yet sunk, descending. */
  remainingLengths: number[]
}

export type Strategy = (view: OpponentView, rng: Rng) => Coord

export type Tier = 'rookie' | 'sailor' | 'admiral'
