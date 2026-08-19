import { coordKey, type Coord } from '../core/coords'
import { pick } from '../core/rng'
import { targetShot } from './sailor'
import type { OpponentView, Strategy } from './types'
import { untriedCells } from './view'

/**
 * Density map: for every remaining ship length, slide it over every legal
 * position and increment each cell it covers. A cell's score is therefore the
 * number of ways a surviving ship could still occupy it — the classic
 * probability-density heuristic, and much stronger than parity alone.
 *
 * A position is legal if every cell it covers is on the board and has not
 * already been fired at. (In hunt mode there are no unresolved hits, so hits
 * never appear here.)
 */
function densityMap(view: OpponentView): Map<string, number> {
  const fired = new Set(view.shots.map((s) => coordKey(s.at)))
  const density = new Map<string, number>()

  const bump = (cells: Coord[]) => {
    for (const c of cells) {
      const k = coordKey(c)
      density.set(k, (density.get(k) ?? 0) + 1)
    }
  }

  for (const length of view.remainingLengths) {
    for (let y = 0; y < view.size; y++) {
      for (let x = 0; x <= view.size - length; x++) {
        const cells: Coord[] = []
        for (let i = 0; i < length; i++) cells.push({ x: x + i, y })
        if (cells.every((c) => !fired.has(coordKey(c)))) bump(cells)
      }
    }
    for (let x = 0; x < view.size; x++) {
      for (let y = 0; y <= view.size - length; y++) {
        const cells: Coord[] = []
        for (let i = 0; i < length; i++) cells.push({ x, y: y + i })
        if (cells.every((c) => !fired.has(coordKey(c)))) bump(cells)
      }
    }
  }

  return density
}

/**
 * Admiral: target unresolved hits first, otherwise hunt by density restricted
 * to the parity lattice. Parity is safe while the smallest surviving ship is at
 * least 2 long — such a ship must cover at least one cell of the lattice, so
 * half the board can be skipped with no loss of information.
 */
export const admiral: Strategy = (view, rng) => {
  const target = targetShot(view, rng)
  if (target) return target

  const candidates = untriedCells(view)
  if (candidates.length === 0) throw new Error('admiral: no untried cells')

  const smallest = view.remainingLengths.length > 0 ? Math.min(...view.remainingLengths) : 1
  const parityCells = smallest >= 2 ? candidates.filter((c) => (c.x + c.y) % 2 === 0) : []
  const pool = parityCells.length > 0 ? parityCells : candidates

  const density = densityMap(view)
  let best = -1
  let bestCells: Coord[] = []
  for (const c of pool) {
    const score = density.get(coordKey(c)) ?? 0
    if (score > best) {
      best = score
      bestCells = [c]
    } else if (score === best) {
      bestCells.push(c)
    }
  }

  return pick(bestCells, rng)
}
