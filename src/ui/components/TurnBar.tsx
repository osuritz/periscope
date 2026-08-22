import type { Phase, Side } from '../../core/game'
import type { LayoutName } from '../layout'

export type TurnBarProps = {
  turn: Side
  phase: Phase
  layout: LayoutName
  /**
   * Whether this bar is the live region announcing turn changes. Defaults to
   * true. On the phone layout `AnnouncementBar` is the single live region
   * carrying the real game information, so `GameScreen` passes `false` there
   * to avoid a screen reader announcing every shot twice.
   */
  live?: boolean
  /**
   * A short viewport (see `useCompact`) has no room for the full-height bar.
   * Shrinks the bar, its icon and its type — the bar is redundant by design
   * (the bezel is the primary signal), so it can afford to give up space.
   */
  compact?: boolean
}

/**
 * The bar names the turn in words for the adult in the room. The child reads
 * the bezel (spec §5.4), which is why this is redundant by design rather than
 * the primary signal.
 */
export default function TurnBar({ turn, phase, layout, live = true, compact = false }: TurnBarProps) {
  const mine = phase === 'playing' && turn === 'player'
  const text =
    phase === 'setup' ? 'GET READY' : phase === 'over' ? 'GAME OVER' : mine ? 'YOU FIRE' : 'THEIR TURN'

  return (
    <div
      role="status"
      aria-live={live ? 'polite' : 'off'}
      style={{
        height: compact ? 32 : layout === 'phone' ? 74 : 92,
        flex: 'none',
        borderRadius: compact ? 10 : 20,
        background: mine ? 'var(--amber)' : 'var(--panel)',
        color: mine ? 'var(--on-amber)' : 'var(--ink-2)',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 6 : 16,
        padding: compact ? '0 10px' : '0 20px',
        fontFamily: 'var(--font-display)',
        fontSize: compact ? 13 : layout === 'phone' ? 26 : 38,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: compact ? 18 : layout === 'phone' ? 48 : 60,
          height: compact ? 18 : layout === 'phone' ? 48 : 60,
          borderRadius: '50%',
          background: mine ? 'var(--on-amber)' : 'var(--line)',
          color: mine ? 'var(--amber)' : 'var(--ink-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? 11 : layout === 'phone' ? 22 : 30,
        }}
      >
        {mine ? '▶' : '⏳'}
      </span>
      {text}
    </div>
  )
}
