import { allCoords, coordKey, inBounds, type Coord } from './coords'
import { fleetFor, type BoardMode, type ShipId } from './fleet'
import { pick, type Rng } from './rng'

export type Orientation = 'h' | 'v'

export type Placement = {
  shipId: ShipId
  origin: Coord
  orientation: Orientation
  length: number
}

export function placementCells(p: Placement): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < p.length; i++) {
    cells.push(
      p.orientation === 'h' ? { x: p.origin.x + i, y: p.origin.y } : { x: p.origin.x, y: p.origin.y + i },
    )
  }
  return cells
}

/**
 * A placement is legal when every cell is on the board and no cell collides
 * with a DIFFERENT ship. Comparing by shipId is what lets the placement screen
 * reposition a ship without it colliding with its own previous cells.
 */
export function canPlace(p: Placement, size: number, others: readonly Placement[]): boolean {
  const cells = placementCells(p)
  if (!cells.every((c) => inBounds(c, size))) return false

  const taken = new Set<string>()
  for (const other of others) {
    if (other.shipId === p.shipId) continue
    for (const c of placementCells(other)) taken.add(coordKey(c))
  }
  return cells.every((c) => !taken.has(coordKey(c)))
}

export function rotated(p: Placement): Placement {
  return { ...p, orientation: p.orientation === 'h' ? 'v' : 'h' }
}

/** Returns the fleet with `next` swapped in, or null if that would be illegal. */
export function withPlacement(
  fleet: readonly Placement[],
  next: Placement,
  size: number,
): Placement[] | null {
  if (!canPlace(next, size, fleet)) return null
  return fleet.map((p) => (p.shipId === next.shipId ? next : p))
}

/**
 * Places the whole fleet at random. Longest ships first — the board is most
 * constrained for them, so placing them last is what causes retry storms.
 * Enumerating legal origins (rather than guess-and-check) means this cannot
 * loop forever, so no attempt cap is needed.
 */
export function randomFleet(mode: BoardMode, rng: Rng): Placement[] {
  const spec = fleetFor(mode)
  const ships = [...spec.ships].sort((a, b) => b.length - a.length)
  const placed: Placement[] = []

  for (const ship of ships) {
    const legal: Placement[] = []
    for (const origin of allCoords(spec.size)) {
      for (const orientation of ['h', 'v'] as const) {
        const candidate: Placement = { shipId: ship.id, origin, orientation, length: ship.length }
        if (canPlace(candidate, spec.size, placed)) legal.push(candidate)
      }
    }
    if (legal.length === 0) {
      throw new Error(`randomFleet: no legal placement for ${ship.id} on ${spec.size}x${spec.size}`)
    }
    placed.push(pick(legal, rng))
  }

  // Return in the fleet's declared order so UI ship pips are stable.
  return spec.ships.map((s) => {
    const found = placed.find((p) => p.shipId === s.id)
    if (!found) throw new Error(`randomFleet: lost placement for ${s.id}`)
    return found
  })
}
