import { coordLabel } from '../../core/coords'
import type { LastShot } from '../../core/game'

/**
 * The one place the game's wording lives. Plan 4 bakes audio clips keyed off
 * exactly these strings, so the visible caption and the spoken line can never
 * drift apart.
 */
export function announcementText(lastShot: LastShot | null): string {
  if (!lastShot) return 'Tap a square to fire!'
  const where = coordLabel(lastShot.at)
  const ship = lastShot.shipId ?? 'ship'

  if (lastShot.by === 'player') {
    if (lastShot.result === 'sunk') return `${where}… you sank their ${ship}!`
    return lastShot.result === 'hit' ? `${where}… you hit their ${ship}!` : `${where}… miss.`
  }
  if (lastShot.result === 'sunk') return `${where}… they sank your ${ship}!`
  return lastShot.result === 'hit' ? `${where}… they hit your ${ship}!` : `${where}… they missed!`
}

export type AnnouncementBarProps = { lastShot: LastShot | null }

export default function AnnouncementBar({ lastShot }: AnnouncementBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        height: 80,
        flex: 'none',
        borderRadius: 18,
        background: 'var(--hull)',
        border: '2px solid var(--line)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        color: 'var(--paper)',
        fontSize: 20,
        fontWeight: 700,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'var(--panel)',
          border: '2px solid var(--scope)',
          color: 'var(--scope)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flex: 'none',
        }}
      >
        🔊
      </span>
      {announcementText(lastShot)}
    </div>
  )
}
