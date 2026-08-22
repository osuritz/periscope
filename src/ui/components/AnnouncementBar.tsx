import { announcementFor, type VoicePack } from '../../audio/lines'
import type { LastShot } from '../../core/game'

/**
 * The visible caption is assembled from the same line table used by the baked
 * audio clips. Keep this as a small wrapper so tests can assert the wording
 * without needing to render the bar.
 */
export function announcementText(lastShot: LastShot | null, pack: VoicePack = 'captain'): string {
  return announcementFor(pack, lastShot).text
}

export type AnnouncementBarProps = { lastShot: LastShot | null; pack: VoicePack }

export default function AnnouncementBar({ lastShot, pack }: AnnouncementBarProps) {
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
      {announcementText(lastShot, pack)}
    </div>
  )
}
