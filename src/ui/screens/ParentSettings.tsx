import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useKeyboard } from '../hooks/useKeyboard'
import { useGameStore, type VoicePack } from '../store/gameStore'

const PACKS: { value: VoicePack; label: string }[] = [
  { value: 'captain', label: 'Silly Sea Captain' },
  { value: 'narrator', label: 'Calm Narrator' },
]

export default function ParentSettings() {
  const voicePack = useGameStore((s) => s.voicePack)
  const reduceMotion = useGameStore((s) => s.reduceMotion)
  const volume = useGameStore((s) => s.volume)
  const speakEveryMove = useGameStore((s) => s.speakEveryMove)
  const setVoicePack = useGameStore((s) => s.setVoicePack)
  const setReduceMotion = useGameStore((s) => s.setReduceMotion)
  const setVolume = useGameStore((s) => s.setVolume)
  const setSpeakEveryMove = useGameStore((s) => s.setSpeakEveryMove)
  const closeSettings = useGameStore((s) => s.closeSettings)
  const restart = useGameStore((s) => s.restart)
  const dialog = useRef<HTMLElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useKeyboard({ escape: closeSettings })

  useEffect(() => {
    closeButton.current?.focus()
  }, [])

  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const focusables = dialog.current?.querySelectorAll<HTMLElement>(
      'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="parent settings"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, .62)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 18,
        boxSizing: 'border-box',
        zIndex: 20,
      }}
    >
      <section
        ref={dialog}
        onKeyDown={trapFocus}
        style={{
          width: 'min(560px, 100%)',
          borderRadius: 8,
          border: '2px solid var(--line)',
          background: 'var(--hull)',
          padding: 22,
          boxSizing: 'border-box',
          display: 'grid',
          gap: 18,
          fontFamily: 'var(--font-ui)',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: 'var(--paper)' }}>Parent settings</h2>
          <button
            ref={closeButton}
            type="button"
            aria-label="close settings"
            onClick={closeSettings}
            style={{
              marginLeft: 'auto',
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '2px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--paper)',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </header>

        <label style={{ display: 'grid', gap: 8, color: 'var(--ink-2)', fontWeight: 700 }}>
          Voice pack
          <select
            value={voicePack}
            onChange={(event) => setVoicePack(event.currentTarget.value as VoicePack)}
            style={{
              height: 48,
              borderRadius: 6,
              border: '2px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--paper)',
              font: 'inherit',
              padding: '0 12px',
            }}
          >
            {PACKS.map((pack) => (
              <option key={pack.value} value={pack.value}>
                {pack.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--paper)' }}>
          <input type="checkbox" checked={volume} onChange={(e) => setVolume(e.currentTarget.checked)} />
          Volume
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--paper)' }}>
          <input
            type="checkbox"
            checked={speakEveryMove}
            onChange={(e) => setSpeakEveryMove(e.currentTarget.checked)}
          />
          Speak every move
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--paper)' }}>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(e) => setReduceMotion(e.currentTarget.checked)}
          />
          Reduce motion
        </label>

        <button
          type="button"
          onClick={() => {
            restart()
            closeSettings()
          }}
          style={{
            height: 52,
            borderRadius: 6,
            border: '2px solid var(--sunk-edge)',
            background: 'var(--panel)',
            color: 'var(--sunk)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Reset game
        </button>
      </section>
    </div>
  )
}
