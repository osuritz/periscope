import { useEffect } from 'react'
import { coordLabel } from '../../core/coords'
import type { Takeover } from '../store/gameStore'

export type TakeoverProps = {
  takeover: Takeover
  onDismiss: () => void
  autoAdvanceMs?: number
}

const FIELD = { hit: 'var(--amber)', miss: 'var(--hull)', sunk: 'var(--sunk)' } as const
const INK = { hit: 'var(--on-amber)', miss: 'var(--ink-2)', sunk: 'var(--on-sunk)' } as const
const GLYPH = { hit: '✕', miss: '○', sunk: '☠' } as const
const WORD = { hit: 'HIT', miss: 'MISS', sunk: 'SUNK' } as const

/**
 * Spec §6.4 — the payoff the whole game exists for, at full frame. Auto-advances
 * after 900ms (§6.1) and is tap-to-skip, because a child who wants to keep
 * playing should never have to wait for an animation to finish.
 *
 * Suppressed entirely under reduce-motion: the store simply never sets a
 * takeover, so this renders null.
 */
export default function TakeoverView({ takeover, onDismiss, autoAdvanceMs = 900 }: TakeoverProps) {
  useEffect(() => {
    if (!takeover) return
    const id = setTimeout(onDismiss, autoAdvanceMs)
    return () => clearTimeout(id)
  }, [takeover, onDismiss, autoAdvanceMs])

  if (!takeover) return null

  const { result, at, shipId } = takeover
  const caption =
    result === 'sunk'
      ? `${coordLabel(at)} · sank their ${shipId ?? 'ship'}`
      : result === 'hit'
        ? `${coordLabel(at)} · fire again`
        : `${coordLabel(at)} · water only`

  return (
    <button
      type="button"
      aria-label={`${WORD[result]}. ${caption}. Tap to continue`}
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        border: 'none',
        background: FIELD[result],
        color: INK[result],
        boxShadow: `inset 0 0 0 26px ${INK[result]}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: 'min(38vw, 210px)',
          lineHeight: 1,
          fontWeight: 900,
          transform: result === 'sunk' ? 'rotate(-8deg)' : undefined,
        }}
      >
        {GLYPH[result]}
      </span>
      <span role="alert" style={{ fontFamily: 'var(--font-display)', fontSize: 'min(18vw, 132px)', lineHeight: 1 }}>
        {WORD[result]}
      </span>
      <span
        style={{
          padding: '10px 28px',
          borderRadius: 8,
          background: INK[result],
          color: FIELD[result],
          fontSize: 'min(5vw, 32px)',
          fontWeight: 700,
        }}
      >
        {caption}
      </span>
    </button>
  )
}
