import { cellState, sunkShipIds, type Board, type CellState } from '../../core/board'
import { placementCells } from '../../core/placement'

export type FleetPipsProps = {
  board: Board
  /** `enemy` pips are what he is hunting; `own` pips are his fleet's health. */
  tone: 'enemy' | 'own'
  /** A short viewport (see `useCompact`) — shrinks the pips to reclaim height. */
  compact?: boolean
}

/**
 * One glyph per resolved segment state — mirrors `Cell.tsx` so a hit/sunk
 * segment reads the same way a hit/sunk board cell does. `ship` and `unknown`
 * are both blank: the only way to tell a live own-fleet cell from a hidden
 * enemy one is which fleet group it's in, which is exactly the information
 * each of those two states is allowed to carry.
 */
const GLYPH: Record<CellState, string> = {
  unknown: '',
  miss: '',
  hit: '✕',
  sunk: '☠',
  ship: '',
}

const FILL: Record<CellState, string> = {
  unknown: 'var(--panel)',
  miss: 'var(--hull)',
  hit: 'var(--amber)',
  sunk: 'var(--sunk)',
  ship: 'var(--scope)',
}

const BORDER: Record<CellState, string> = {
  unknown: 'var(--line)',
  miss: 'var(--muted)',
  hit: 'var(--amber-edge)',
  sunk: 'var(--sunk-edge)',
  ship: 'var(--scope)',
}

const INK: Record<CellState, string> = {
  unknown: 'transparent',
  miss: 'transparent',
  hit: 'var(--on-amber)',
  sunk: 'var(--on-sunk)',
  ship: 'var(--on-scope)',
}

/**
 * One pip GROUP per ship, one small SQUARE per cell of that ship's length —
 * so a partially-damaged ship shows exactly which cells took a hit instead
 * of an undifferentiated bar (the thing the five-year-old's feedback flagged:
 * he couldn't count hit points on a continuous bar sized off ship length).
 *
 * Every segment's fill comes from `cellState(board, coord, reveal)`, never
 * from `board.placements` or the shot log directly — see the trap documented
 * on the `Shot` type and in CLAUDE.md. `own` passes `reveal=true` so an
 * unfired cell reads `ship`; `enemy` passes `reveal=false` so an unfired cell
 * reads `unknown` and stays hidden. Showing enemy damage per-ship is correct:
 * the official rules have the opponent name the ship on every hit, not just
 * on a sink (see docs/BATTLESHIP-RULES.md, "Mistakes already made" #2).
 *
 * Segments are kept deliberately tiny — smaller than even the passive
 * own-deck cells, let alone the interactive scope grid — because this is a
 * readout of a readout, not a second board, and must never compete for
 * attention with the enemy scope (spec's core asymmetry).
 */
export default function FleetPips({ board, tone, compact = false }: FleetPipsProps) {
  const sunk = new Set(sunkShipIds(board))
  const reveal = tone === 'own'
  const segmentSize = compact ? 8 : 12
  const radius = compact ? 2 : 3

  return (
    <ul
      style={{ display: 'flex', gap: compact ? 4 : 6, listStyle: 'none', margin: 0, padding: 0 }}
      aria-label={tone === 'enemy' ? 'their fleet' : 'my fleet'}
    >
      {board.placements.map((p) => {
        const dead = sunk.has(p.shipId)
        return (
          <li
            key={p.shipId}
            aria-label={`${p.shipId}, ${dead ? 'sunk' : 'afloat'}`}
            style={{ display: 'flex', gap: 1, listStyle: 'none' }}
          >
            {placementCells(p).map((cell, i) => {
              const state = cellState(board, cell, reveal)
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  style={{
                    width: segmentSize,
                    height: segmentSize,
                    borderRadius: state === 'sunk' ? 1 : radius,
                    background: FILL[state],
                    border: `1px solid ${BORDER[state]}`,
                    color: INK[state],
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: compact ? 6 : 8,
                    lineHeight: 1,
                  }}
                >
                  {GLYPH[state]}
                </span>
              )
            })}
          </li>
        )
      })}
    </ul>
  )
}
