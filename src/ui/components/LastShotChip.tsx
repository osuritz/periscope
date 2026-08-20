import { coordLabel } from '../../core/coords'
import type { LastShot } from '../../core/game'

export type LastShotChipProps = {
  lastShot: LastShot | null
  /** A short viewport (see `useCompact`) — shrinks the chip to match the
   * compact header it sits in. */
  compact?: boolean
}

const GLYPH = { miss: '○', hit: '✕', sunk: '☠' } as const

/** The small "last: C7 ✕" readout in the scope header. */
export default function LastShotChip({ lastShot, compact = false }: LastShotChipProps) {
  if (!lastShot) return null
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
      {`last: ${coordLabel(lastShot.at)} ${GLYPH[lastShot.result]}`}
    </span>
  )
}
