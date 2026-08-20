import AnnouncementBar from '../components/AnnouncementBar'
import Bezel from '../components/Bezel'
import FleetPips from '../components/FleetPips'
import Grid from '../components/Grid'
import LastShotChip from '../components/LastShotChip'
import TakeoverView from '../components/Takeover'
import TurnBar from '../components/TurnBar'
import { useLayout } from '../layout'
import { deckSizing, scopeSizing } from '../sizing'
import { useGameStore } from '../store/gameStore'
import { useComputerTurn } from '../store/useComputerTurn'

/** Reserves room for the last-shot chip so its first appearance (it renders
 * null before the first shot) doesn't shift the scope header's layout. Set to
 * the chip's own rendered height — 18px Space Grotesk bold over 6px
 * top/bottom padding — measured at 39px in the browser. */
const LAST_SHOT_CHIP_MIN_HEIGHT = 39

/**
 * Spec §7. One component tree, three layouts.
 *
 * The invariant across all three: the enemy scope is large, lit and bordered;
 * the player's own deck is a small passive readout. That asymmetry is what
 * stops a five-year-old firing at his own fleet — only one grid looks tappable,
 * and only one is.
 */
export default function GameScreen() {
  const layout = useLayout()
  const game = useGameStore((s) => s.game)
  const mode = useGameStore((s) => s.mode)
  const takeover = useGameStore((s) => s.takeover)
  const fireAt = useGameStore((s) => s.fireAt)
  const restart = useGameStore((s) => s.restart)
  const dismissTakeover = useGameStore((s) => s.dismissTakeover)

  useComputerTurn()

  const myTurn = game.phase === 'playing' && game.turn === 'player'
  const scope = scopeSizing(layout, mode)
  const deck = deckSizing(layout, mode)

  const scopePanel = (
    <section
      style={{
        flex: 1,
        minHeight: 0,
        borderRadius: 22,
        background: 'var(--panel)',
        border: '4px solid var(--scope)',
        boxSizing: 'border-box',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid var(--scope)',
            color: 'var(--scope)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          ◎
        </span>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--scope)' }}>
          SCOPE — THEIR SEA
        </h2>
        <span style={{ marginLeft: 'auto', minHeight: LAST_SHOT_CHIP_MIN_HEIGHT, display: 'flex', alignItems: 'center' }}>
          <LastShotChip lastShot={game.lastShot} />
        </span>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <Grid
          board={game.computer}
          reveal={false}
          sizing={scope}
          onFire={fireAt}
          disabled={!myTurn}
          label="their sea"
        />
      </div>

      <footer style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>THEIR FLEET</span>
        <FleetPips board={game.computer} tone="enemy" />
      </footer>
    </section>
  )

  const deckPanel = (
    <section
      style={{
        flex: 'none',
        borderRadius: 22,
        background: 'var(--panel)',
        border: '2px solid var(--line)',
        boxSizing: 'border-box',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: layout === 'landscape' ? 'column' : 'row',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-2)' }}>
        MY DECK
      </h2>
      <Grid board={game.player} reveal sizing={deck} label="my deck" />
      <span style={{ marginLeft: layout === 'landscape' ? 0 : 'auto' }}>
        <FleetPips board={game.player} tone="own" />
      </span>
    </section>
  )

  const gameOver = game.phase === 'over' && (
    <button
      type="button"
      onClick={() => restart()}
      style={{
        flex: 'none',
        height: 96,
        borderRadius: 26,
        border: 'none',
        background: 'var(--amber)',
        color: 'var(--on-amber)',
        fontFamily: 'var(--font-display)',
        fontSize: 40,
        cursor: 'pointer',
      }}
    >
      {game.winner === 'player' ? '↻ SURFACED! DIVE AGAIN' : '↻ DIVE AGAIN'}
    </button>
  )

  return (
    <Bezel active={myTurn} layout={layout}>
      <main
        style={{
          height: '100%',
          boxSizing: 'border-box',
          padding: layout === 'phone' ? 14 : 20,
          display: 'grid',
          gap: layout === 'phone' ? 10 : 14,
          gridTemplateRows: layout === 'landscape' ? 'auto 1fr auto' : 'auto 1fr auto auto',
          gridTemplateColumns: '1fr',
        }}
      >
        <TurnBar turn={game.turn} phase={game.phase} layout={layout} live={layout !== 'phone'} />

        {layout === 'landscape' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '62fr 38fr', gap: 14, minHeight: 0 }}>
            {scopePanel}
            {deckPanel}
          </div>
        ) : (
          <>
            {scopePanel}
            {deckPanel}
          </>
        )}

        {layout === 'phone' && <AnnouncementBar lastShot={game.lastShot} />}
        {gameOver}
      </main>

      <TakeoverView takeover={takeover} onDismiss={dismissTakeover} />
    </Bezel>
  )
}
