import { useRef } from 'react'
import type { BoardMode } from '../../core/fleet'
import type { Tier } from '../../ai/types'
import { fleetFor } from '../../core/fleet'
import { useGameStore } from '../store/gameStore'
import ParentSettings from './ParentSettings'

const TIERS: { tier: Tier; face: string; pips: number }[] = [
  { tier: 'rookie', face: '●', pips: 1 },
  { tier: 'sailor', face: '◐', pips: 2 },
  { tier: 'admiral', face: '◉', pips: 3 },
]

const MODES: BoardMode[] = ['little', 'admiral']

function DotGrid({ mode }: { mode: BoardMode }) {
  const size = fleetFor(mode).size
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, ${mode === 'little' ? 12 : 7}px)`,
        gap: mode === 'little' ? 5 : 3,
      }}
    >
      {Array.from({ length: size * size }, (_, i) => (
        <span
          key={i}
          style={{
            width: mode === 'little' ? 12 : 7,
            height: mode === 'little' ? 12 : 7,
            borderRadius: '50%',
            background: 'currentColor',
          }}
        />
      ))}
    </span>
  )
}

export default function TitleScreen() {
  const mode = useGameStore((s) => s.mode)
  const tier = useGameStore((s) => s.tier)
  const volume = useGameStore((s) => s.volume)
  const settingsOpen = useGameStore((s) => s.settingsOpen)
  const chooseMode = useGameStore((s) => s.chooseMode)
  const chooseTier = useGameStore((s) => s.chooseTier)
  const dive = useGameStore((s) => s.dive)
  const openSettings = useGameStore((s) => s.openSettings)
  const setVolume = useGameStore((s) => s.setVolume)
  const holdTimer = useRef<number | null>(null)

  const startHold = () => {
    stopHold()
    holdTimer.current = window.setTimeout(openSettings, 3000)
  }
  const stopHold = () => {
    if (holdTimer.current === null) return
    window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  return (
    <main
      style={{
        minHeight: '100%',
        boxSizing: 'border-box',
        padding: 'clamp(18px, 4vw, 44px)',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: 22,
        background: 'var(--hull)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <span
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: '4px solid var(--scope)',
            color: 'var(--scope)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
          }}
        >
          ◎
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(42px, 12vw, 92px)',
            lineHeight: 1,
            color: 'var(--paper)',
          }}
        >
          PERISCOPE
        </h1>
        <button
          type="button"
          aria-label="hold for parent settings"
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={stopHold}
          style={{
            marginLeft: 'auto',
            width: 58,
            height: 58,
            borderRadius: '50%',
            border: '3px solid var(--line)',
            background: 'var(--panel)',
            color: 'var(--ink-2)',
            fontSize: 28,
            cursor: 'pointer',
          }}
        >
          ⚙
        </button>
      </header>

      <section
        style={{
          alignSelf: 'center',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
        }}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--scope)' }}>
            SEA SIZE
          </h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {MODES.map((m) => {
              const selected = mode === m
              return (
                <button
                  key={m}
                  type="button"
                  aria-label={`${m} sea`}
                  aria-pressed={selected}
                  onClick={() => chooseMode(m)}
                  style={{
                    width: 150,
                    minHeight: 150,
                    border: `5px solid ${selected ? 'var(--scope)' : 'var(--line)'}`,
                    borderRadius: 8,
                    background: 'var(--panel)',
                    color: selected ? 'var(--scope)' : 'var(--ink-2)',
                    opacity: selected ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <DotGrid mode={m} />
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--scope)' }}>
            CAPTAIN
          </h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {TIERS.map((entry) => {
              const selected = tier === entry.tier
              return (
                <button
                  key={entry.tier}
                  type="button"
                  aria-label={`${entry.tier} opponent`}
                  aria-pressed={selected}
                  onClick={() => chooseTier(entry.tier)}
                  style={{
                    width: 150,
                    height: 186,
                    border: `5px solid ${selected ? 'var(--scope)' : 'var(--line)'}`,
                    borderRadius: 8,
                    background: 'var(--panel)',
                    color: selected ? 'var(--scope)' : 'var(--ink-2)',
                    opacity: selected ? 1 : 0.5,
                    display: 'grid',
                    gridTemplateRows: '1fr auto',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 72, lineHeight: 1 }}>
                    {entry.face}
                  </span>
                  <span aria-hidden="true" style={{ fontSize: 28, letterSpacing: 0 }}>
                    {'●'.repeat(entry.pips)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <footer style={{ display: 'grid', gap: 12 }}>
        <button
          type="button"
          aria-pressed={volume}
          onClick={() => setVolume(!volume)}
          style={{
            justifySelf: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '3px solid var(--line)',
            background: volume ? 'var(--scope)' : 'var(--panel)',
            color: volume ? 'var(--on-scope)' : 'var(--ink-2)',
            fontSize: 28,
            cursor: 'pointer',
          }}
        >
          {volume ? '🔊' : '🔇'}
        </button>
        <button
          type="button"
          onClick={dive}
          style={{
            height: 132,
            borderRadius: 8,
            border: 'none',
            background: 'var(--amber)',
            color: 'var(--on-amber)',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px, 12vw, 86px)',
            cursor: 'pointer',
          }}
        >
          DIVE
        </button>
      </footer>

      {settingsOpen && <ParentSettings />}
    </main>
  )
}
