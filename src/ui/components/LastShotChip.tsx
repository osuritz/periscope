import type { Shot } from '../../core/board'
import { coordLabel } from '../../core/coords'

export type LastShotChipProps = {
  /**
   * A shot ON THE BOARD THIS CHIP SITS OVER, not `game.lastShot`.
   *
   * The chip lives in the scope header, under "SCOPE — THEIR SEA", so it must
   * report the last shot the player fired at the enemy — `game.computer.shots`
   * — which by construction is always a player shot. Feeding it
   * `game.lastShot` meant it showed whichever side fired last, and since the
   * computer fires while the result takeover is still up, that was *always*
   * the computer's shot by the time anyone read it: a coordinate on the
   * child's own board, sometimes with a skull, captioned as the enemy's sea.
   *
   * Reading `.result` for a single shot is correct — the render-from-
   * `cellState` trap documented on `Shot` is about board CELLS, where a sunk
   * ship's earlier cells still read 'hit' in the log. One shot's own result is
   * exactly what it says it is.
   */
  shot: Shot | null
  /** A short viewport (see `useCompact`) — shrinks the chip to match the
   * compact header it sits in. */
  compact?: boolean
}

const GLYPH = { miss: '○', hit: '✕', sunk: '☠' } as const

/** The small "last: C7 ✕" readout in the scope header. */
export default function LastShotChip({ shot, compact = false }: LastShotChipProps) {
  if (!shot) return null
  return (
    <span
      style={{
        padding: compact ? '3px 10px' : '6px 14px',
        borderRadius: 999,
        background: 'var(--hull)',
        color: 'var(--amber)',
        fontSize: compact ? 12 : 18,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {`last: ${coordLabel(shot.at)} ${GLYPH[shot.result]}`}
    </span>
  )
}
