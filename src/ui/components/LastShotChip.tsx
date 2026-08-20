import { coordLabel } from '../../core/coords'
import type { LastShot } from '../../core/game'

export type LastShotChipProps = { lastShot: LastShot | null }

const GLYPH = { miss: '○', hit: '✕', sunk: '☠' } as const

/** The small "last: C7 ✕" readout in the scope header. */
export default function LastShotChip({ lastShot }: LastShotChipProps) {
  if (!lastShot) return null
  return (
    <span
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        background: 'var(--hull)',
        color: 'var(--amber)',
        fontSize: 18,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {`last: ${coordLabel(lastShot.at)} ${GLYPH[lastShot.result]}`}
    </span>
  )
}
