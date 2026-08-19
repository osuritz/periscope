import { pick } from '../core/rng'
import type { Strategy } from './types'
import { untriedCells } from './view'

/**
 * Rookie fires uniformly at random among untried cells and learns nothing from
 * a hit. This is the default tier: a five-year-old firing at random should be
 * able to beat it roughly half the time.
 */
export const rookie: Strategy = (view, rng) => {
  const candidates = untriedCells(view)
  if (candidates.length === 0) throw new Error('rookie: no untried cells')
  return pick(candidates, rng)
}
