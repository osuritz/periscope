import { sunkShipIds, type Board } from '../../core/board'

export type FleetPipsProps = {
  board: Board
  /** `enemy` pips are what he is hunting; `own` pips are his fleet's health. */
  tone: 'enemy' | 'own'
}

/**
 * One pip per ship, width proportional to length — so the shapes read as the
 * actual ships rather than as an abstract counter. A sunk ship turns red and
 * carries the skull, matching the cell state it corresponds to.
 */
export default function FleetPips({ board, tone }: FleetPipsProps) {
  const sunk = new Set(sunkShipIds(board))
  return (
    <ul
      style={{ display: 'flex', gap: 6, listStyle: 'none', margin: 0, padding: 0 }}
      aria-label={tone === 'enemy' ? 'their fleet' : 'my fleet'}
    >
      {board.placements.map((p) => {
        const dead = sunk.has(p.shipId)
        return (
          <li
            key={p.shipId}
            aria-label={`${p.shipId}, ${dead ? 'sunk' : 'afloat'}`}
            style={{
              width: 12 + p.length * 12,
              height: 26,
              borderRadius: dead ? 4 : 6,
              background: dead ? 'var(--sunk)' : tone === 'own' ? 'var(--scope)' : 'var(--line)',
              color: 'var(--on-sunk)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              lineHeight: 1,
            }}
          >
            {dead ? '☠' : ''}
          </li>
        )
      })}
    </ul>
  )
}
