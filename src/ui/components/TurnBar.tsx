import type { Phase, Side } from '../../core/game'
import type { LayoutName } from '../layout'

export type TurnBarProps = { turn: Side; phase: Phase; layout: LayoutName }

/**
 * The bar names the turn in words for the adult in the room. The child reads
 * the bezel (spec §5.4), which is why this is redundant by design rather than
 * the primary signal.
 */
export default function TurnBar({ turn, phase, layout }: TurnBarProps) {
  const mine = phase === 'playing' && turn === 'player'
  const text = phase === 'over' ? 'GAME OVER' : mine ? 'YOU FIRE' : 'THEIR TURN'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        height: layout === 'phone' ? 74 : 92,
        flex: 'none',
        borderRadius: 20,
        background: mine ? 'var(--amber)' : 'var(--panel)',
        color: mine ? 'var(--on-amber)' : 'var(--ink-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 20px',
        fontFamily: 'var(--font-display)',
        fontSize: layout === 'phone' ? 26 : 38,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: layout === 'phone' ? 48 : 60,
          height: layout === 'phone' ? 48 : 60,
          borderRadius: '50%',
          background: mine ? 'var(--on-amber)' : 'var(--line)',
          color: mine ? 'var(--amber)' : 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: layout === 'phone' ? 22 : 30,
        }}
      >
        {mine ? '▶' : '⏳'}
      </span>
      {text}
    </div>
  )
}
