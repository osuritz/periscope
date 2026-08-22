import { sunkShipIds } from '../../core/board'
import { useGameStore } from '../store/gameStore'

export default function VictoryScreen() {
  const game = useGameStore((s) => s.game)
  const restart = useGameStore((s) => s.restart)
  const home = useGameStore((s) => s.home)
  const won = game.winner === 'player'
  const trophies = sunkShipIds(game.computer)

  return (
    <main
      style={{
        minHeight: '100%',
        boxSizing: 'border-box',
        padding: 'clamp(18px, 4vw, 44px)',
        display: 'grid',
        gridTemplateRows: '1fr auto',
        gap: 24,
        background: won
          ? 'conic-gradient(from 0deg, var(--scope), var(--panel), var(--scope))'
          : 'var(--hull)',
        color: won ? 'var(--on-scope)' : 'var(--paper)',
      }}
    >
      <section
        style={{
          alignSelf: 'center',
          display: 'grid',
          justifyItems: 'center',
          gap: 28,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(64px, 15vw, 118px)',
            lineHeight: 1,
          }}
        >
          {won ? 'SURFACED!' : 'TRY AGAIN!'}
        </h1>
        <div aria-label="sunken fleet trophies" role="list" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {trophies.map((shipId) => (
            <span
              key={shipId}
              role="listitem"
              aria-label={`${shipId} sunk`}
              style={{
                width: 86,
                height: 86,
                borderRadius: 8,
                background: 'var(--sunk)',
                color: 'var(--on-sunk)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 52,
                border: '4px solid var(--sunk-edge)',
              }}
            >
              ☠
            </span>
          ))}
        </div>
      </section>

      <nav style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 12 }}>
        <button
          type="button"
          aria-label="home"
          onClick={home}
          style={{
            height: 88,
            borderRadius: 8,
            border: '3px solid var(--line)',
            background: 'var(--panel)',
            color: 'var(--paper)',
            fontSize: 42,
            cursor: 'pointer',
          }}
        >
          ⌂
        </button>
        <button
          type="button"
          onClick={() => restart()}
          style={{
            height: 88,
            borderRadius: 8,
            border: 'none',
            background: 'var(--amber)',
            color: 'var(--on-amber)',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(34px, 8vw, 58px)',
            cursor: 'pointer',
          }}
        >
          DIVE AGAIN
        </button>
      </nav>
    </main>
  )
}
