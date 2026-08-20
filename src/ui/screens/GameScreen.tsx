import AnnouncementBar from '../components/AnnouncementBar'
import Bezel from '../components/Bezel'
import FleetPips from '../components/FleetPips'
import Grid from '../components/Grid'
import LastShotChip from '../components/LastShotChip'
import TakeoverView from '../components/Takeover'
import TurnBar from '../components/TurnBar'
import { useCompact, useLayout, useViewportHeight } from '../layout'
import { deckSizing, scopeSizing } from '../sizing'
import { useGameStore } from '../store/gameStore'
import { useComputerTurn } from '../store/useComputerTurn'

/** Reserves room for the last-shot chip so its first appearance (it renders
 * null before the first shot) doesn't shift the scope header's layout. Set to
 * the chip's own rendered height — 18px Space Grotesk bold over 6px
 * top/bottom padding — measured at 39px in the browser. Halved when
 * `compact`, matching the smaller header font that goes with it — measured
 * the same way, in the browser, at 24px. */
const LAST_SHOT_CHIP_MIN_HEIGHT = 39
const LAST_SHOT_CHIP_MIN_HEIGHT_COMPACT = 24

/**
 * Everything around the scope grid in the `landscape` layout — main's padding
 * and row-gaps, the turn bar, the panel's header/footer/padding/border/gaps —
 * measured with real viewport emulation (see task-10-report.md) rather than
 * summed from the styles below, since line-height and font-metric rounding
 * make the two disagree by a few px. Kept a little conservative (the measured
 * available height ran ~2-3px ahead of what `scopeSizing` demanded) so normal
 * rendering variance doesn't reopen the clip this exists to close.
 *
 * Only `landscape` gets this treatment: it is the one layout where the scope
 * and deck panels sit side by side, so nothing else competes with the scope
 * panel for vertical space and a single constant is accurate. `portrait` and
 * `phone` already fit at their required viewports without it.
 */
function landscapeChromeOverhead(compact: boolean): number {
  return compact ? 118 : 292
}

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
  const compact = useCompact()
  const viewportHeight = useViewportHeight()
  const game = useGameStore((s) => s.game)
  const mode = useGameStore((s) => s.mode)
  const takeover = useGameStore((s) => s.takeover)
  const fireAt = useGameStore((s) => s.fireAt)
  const restart = useGameStore((s) => s.restart)
  const dismissTakeover = useGameStore((s) => s.dismissTakeover)

  useComputerTurn()

  const myTurn = game.phase === 'playing' && game.turn === 'player'
  const fit =
    layout === 'landscape'
      ? { rows: game.size, availableHeight: viewportHeight - landscapeChromeOverhead(compact) }
      : undefined
  const scope = scopeSizing(layout, mode, fit)
  const deck = deckSizing(layout, mode)

  const scopePanel = (
    <section
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        borderRadius: compact ? 14 : 22,
        background: 'var(--panel)',
        border: '4px solid var(--scope)',
        boxSizing: 'border-box',
        padding: compact ? 4 : 16,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 3 : 12,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: compact ? 5 : 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: compact ? 18 : 40,
            height: compact ? 18 : 40,
            borderRadius: '50%',
            border: '3px solid var(--scope)',
            color: 'var(--scope)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            fontSize: compact ? 10 : undefined,
          }}
        >
          ◎
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 12 : 24,
            color: 'var(--scope)',
          }}
        >
          SCOPE — THEIR SEA
        </h2>
        <span
          style={{
            marginLeft: 'auto',
            minHeight: compact ? LAST_SHOT_CHIP_MIN_HEIGHT_COMPACT : LAST_SHOT_CHIP_MIN_HEIGHT,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LastShotChip lastShot={game.lastShot} compact={compact} />
        </span>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        <Grid
          board={game.computer}
          reveal={false}
          sizing={scope}
          onFire={fireAt}
          disabled={!myTurn}
          label="their sea"
        />
      </div>

      <footer style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: compact ? 4 : 8 }}>
        <span style={{ fontSize: compact ? 9 : 14, fontWeight: 700, color: 'var(--ink-2)' }}>THEIR FLEET</span>
        <FleetPips board={game.computer} tone="enemy" compact={compact} />
      </footer>
    </section>
  )

  const deckPanel = (
    <section
      style={{
        flex: 'none',
        minWidth: 0,
        borderRadius: 22,
        background: 'var(--panel)',
        border: '2px solid var(--line)',
        boxSizing: 'border-box',
        padding: layout === 'phone' ? '8px 8px' : '14px 18px',
        display: 'flex',
        flexDirection: layout === 'landscape' ? 'column' : 'row',
        flexWrap: layout === 'phone' ? 'wrap' : 'nowrap',
        alignItems: 'center',
        justifyContent: layout === 'phone' ? 'center' : 'flex-start',
        gap: layout === 'phone' ? 4 : 18,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: layout === 'phone' ? 12 : 20,
          color: 'var(--ink-2)',
        }}
      >
        MY DECK
      </h2>
      <Grid board={game.player} reveal sizing={deck} label="my deck" />
      <span style={{ marginLeft: layout === 'landscape' ? 0 : 'auto' }}>
        <FleetPips board={game.player} tone="own" compact={layout === 'phone'} />
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
          padding: compact ? 6 : layout === 'phone' ? 14 : 20,
          display: 'grid',
          gap: compact ? 6 : layout === 'phone' ? 10 : 14,
          gridTemplateRows:
            layout === 'landscape' ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr) auto auto',
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        <TurnBar
          turn={game.turn}
          phase={game.phase}
          layout={layout}
          live={layout !== 'phone'}
          compact={compact}
        />

        {layout === 'landscape' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '62fr 38fr',
              gridTemplateRows: 'minmax(0, 1fr)',
              gap: compact ? 8 : 14,
              minHeight: 0,
            }}
          >
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
