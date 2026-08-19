import { coordKey, inBounds, orthogonalNeighbors, type Coord } from '../core/coords'
import { pick, type Rng } from '../core/rng'
import type { OpponentView, Strategy } from './types'
import { untriedCells, unresolvedHits } from './view'

/**
 * Targeting mode, shared by Sailor and Admiral.
 *
 * With one unresolved hit, fire at an untried orthogonal neighbour. With two or
 * more collinear hits, the ship's axis is known — extend past either end and
 * discard perpendicular candidates entirely, which is the whole efficiency win.
 *
 * Returns null when there is nothing to chase, handing control back to hunt mode.
 */
export function targetShot(view: OpponentView, rng: Rng): Coord | null {
  const hits = unresolvedHits(view)
  if (hits.length === 0) return null

  const fired = new Set(view.shots.map((s) => coordKey(s.at)))
  const hitKeys = new Set(hits.map(coordKey))

  // Look for a collinear run of two or more unresolved hits.
  for (const axis of ['h', 'v'] as const) {
    for (const hit of hits) {
      const step = axis === 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 }
      const partner: Coord = { x: hit.x + step.x, y: hit.y + step.y }
      if (!hitKeys.has(coordKey(partner))) continue

      // Walk to both ends of the run and try to extend.
      const ends: Coord[] = []
      let forward: Coord = partner
      while (hitKeys.has(coordKey(forward))) forward = { x: forward.x + step.x, y: forward.y + step.y }
      ends.push(forward)

      let back: Coord = hit
      while (hitKeys.has(coordKey(back))) back = { x: back.x - step.x, y: back.y - step.y }
      ends.push(back)

      const usable = ends.filter((c) => inBounds(c, view.size) && !fired.has(coordKey(c)))
      if (usable.length > 0) return pick(usable, rng)
    }
  }

  // A single isolated hit (or a run that is blocked at both ends): probe neighbours.
  const candidates = hits
    .flatMap((h) => orthogonalNeighbors(h, view.size))
    .filter((c) => !fired.has(coordKey(c)))
  if (candidates.length > 0) return pick(candidates, rng)

  return null
}

/**
 * Sailor hunts at random, then switches to targeting the moment it lands a hit.
 * No parity, no density map — that is what separates it from Admiral.
 */
export const sailor: Strategy = (view, rng) => {
  const target = targetShot(view, rng)
  if (target) return target

  const candidates = untriedCells(view)
  if (candidates.length === 0) throw new Error('sailor: no untried cells')
  return pick(candidates, rng)
}
