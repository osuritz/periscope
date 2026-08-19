export type BoardMode = 'little' | 'admiral'

/** Stable identifier used for audio line lookup: `result.sunk.<shipId>`. */
export type ShipId = string

export type ShipSpec = { id: ShipId; length: number }

export type FleetSpec = { size: number; ships: ShipSpec[] }

export const FLEETS: Record<BoardMode, FleetSpec> = {
  little: {
    size: 6,
    ships: [
      { id: 'submarine', length: 3 },
      { id: 'patrol', length: 2 },
      { id: 'tug', length: 2 },
    ],
  },
  admiral: {
    size: 10,
    ships: [
      { id: 'carrier', length: 5 },
      { id: 'battleship', length: 4 },
      { id: 'cruiser', length: 3 },
      { id: 'submarine', length: 3 },
      { id: 'destroyer', length: 2 },
    ],
  },
}

export function fleetFor(mode: BoardMode): FleetSpec {
  return FLEETS[mode]
}
