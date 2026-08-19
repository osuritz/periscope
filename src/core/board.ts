import { coordEquals, coordKey, inBounds, type Coord } from './coords'
import { fleetFor, type BoardMode, type ShipId } from './fleet'
import { placementCells, randomFleet, type Placement } from './placement'
import type { Rng } from './rng'

export type ShotResult = 'miss' | 'hit' | 'sunk'

/** What a single cell should render as. `ship` is owner-only. */
export type CellState = 'unknown' | 'miss' | 'hit' | 'sunk' | 'ship'

export type Shot = { at: Coord; result: ShotResult; shipId?: ShipId }

export type Board = {
  size: number
  placements: Placement[]
  shots: Shot[]
}

export function boardFrom(size: number, placements: Placement[]): Board {
  return { size, placements, shots: [] }
}

export function newBoard(mode: BoardMode, rng: Rng): Board {
  return boardFrom(fleetFor(mode).size, randomFleet(mode, rng))
}

export function alreadyFired(b: Board, at: Coord): boolean {
  return b.shots.some((s) => coordEquals(s.at, at))
}

function shipAt(b: Board, at: Coord): Placement | undefined {
  return b.placements.find((p) => placementCells(p).some((c) => coordEquals(c, at)))
}

function hitCellsFor(b: Board, shipId: ShipId): number {
  const hits = new Set(b.shots.filter((s) => s.shipId === shipId).map((s) => coordKey(s.at)))
  return hits.size
}

/**
 * Fires at a cell and returns a NEW board. Firing at an already-fired cell is a
 * no-op that replays the original shot, so a double-tap from a five-year-old
 * cannot corrupt state or burn a turn.
 */
export function fire(b: Board, at: Coord): { board: Board; shot: Shot } {
  if (!inBounds(at, b.size)) throw new Error('fire: out of bounds')

  const previous = b.shots.find((s) => coordEquals(s.at, at))
  if (previous) return { board: b, shot: previous }

  const ship = shipAt(b, at)
  if (!ship) {
    const shot: Shot = { at, result: 'miss' }
    return { board: { ...b, shots: [...b.shots, shot] }, shot }
  }

  const hitsAfter = hitCellsFor(b, ship.shipId) + 1
  const result: ShotResult = hitsAfter >= ship.length ? 'sunk' : 'hit'
  const shot: Shot = { at, result, shipId: ship.shipId }
  return { board: { ...b, shots: [...b.shots, shot] }, shot }
}

export function sunkShipIds(b: Board): ShipId[] {
  return b.placements.filter((p) => hitCellsFor(b, p.shipId) >= p.length).map((p) => p.shipId)
}

export function isFleetSunk(b: Board): boolean {
  return b.placements.length > 0 && sunkShipIds(b).length === b.placements.length
}

/**
 * `reveal` is true for the board's owner (who sees their own ships) and false
 * for the opponent's scope view. Sunk outranks hit so the whole silhouette
 * switches to the square sunk styling at once.
 */
export function cellState(b: Board, at: Coord, reveal: boolean): CellState {
  const shot = b.shots.find((s) => coordEquals(s.at, at))
  if (shot) {
    if (shot.result === 'miss') return 'miss'
    const ship = shipAt(b, at)
    if (ship && hitCellsFor(b, ship.shipId) >= ship.length) return 'sunk'
    return 'hit'
  }
  if (reveal && shipAt(b, at)) return 'ship'
  return 'unknown'
}
