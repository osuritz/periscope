export type { OpponentView, Strategy, Tier, ViewShot } from './types'
export { viewOf, untriedCells, unresolvedHits } from './view'
export { rookie } from './rookie'
export { sailor, targetShot } from './sailor'
export { admiral } from './admiral'

import { rookie } from './rookie'
import { sailor } from './sailor'
import { admiral } from './admiral'
import type { Strategy, Tier } from './types'

export const STRATEGIES: Record<Tier, Strategy> = { rookie, sailor, admiral }

export function strategyFor(tier: Tier): Strategy {
  return STRATEGIES[tier]
}
