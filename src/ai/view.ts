import { sunkShipIds, type Board } from '../core/board'
import { allCoords, coordKey, type Coord } from '../core/coords'
import { placementCells } from '../core/placement'
import type { OpponentView } from './types'

/**
 * `viewOf` is the honesty boundary: it strips ship placements entirely, so a
 * strategy physically cannot see where the fleet is. Every tier receives
 * only this.
 *
 * It also re-labels every shot belonging to a fully-destroyed ship as
 * `'sunk'` — `fire` in `../core/board` only marks the FINAL cell of a
 * destroyed ship `'sunk'`; every earlier cell of that ship keeps `'hit'` in
 * the shot log permanently. Without this relabeling, `unresolvedHits` would
 * keep surfacing cells belonging to ships that are already dead, and a
 * hunting strategy would chase sunk ships forever. This leaks nothing new: a
 * real opponent already knows a ship sank and which cells it occupied, since
 * that's implied by the shot log plus `remainingLengths`.
 */
export function viewOf(board: Board): OpponentView {
  const sunk = new Set(sunkShipIds(board))
  const sunkCells = new Set(
    board.placements
      .filter((p) => sunk.has(p.shipId))
      .flatMap((p) => placementCells(p))
      .map(coordKey),
  )
  return {
    size: board.size,
    shots: board.shots.map((s) => ({
      at: s.at,
      result: sunkCells.has(coordKey(s.at)) ? 'sunk' : s.result,
    })),
    remainingLengths: board.placements
      .filter((p) => !sunk.has(p.shipId))
      .map((p) => p.length)
      .sort((a, b) => b - a),
  }
}

export function untriedCells(view: OpponentView): Coord[] {
  const fired = new Set(view.shots.map((s) => coordKey(s.at)))
  return allCoords(view.size).filter((c) => !fired.has(coordKey(c)))
}

/** Cells hit but not yet part of a sunk ship — the open threads a hunter chases. */
export function unresolvedHits(view: OpponentView): Coord[] {
  return view.shots.filter((s) => s.result === 'hit').map((s) => s.at)
}
