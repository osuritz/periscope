import AnnouncementBar from '../components/AnnouncementBar'
import Bezel from '../components/Bezel'
import FleetPips from '../components/FleetPips'
import Grid from '../components/Grid'
import LastShotChip from '../components/LastShotChip'
import TakeoverView from '../components/Takeover'
import TurnBar from '../components/TurnBar'
import { useCompact, useLayout, useViewportHeight, type LayoutName } from '../layout'
import { deckSizing, scopeSizing } from '../sizing'
import { useGameStore } from '../store/gameStore'
import { useComputerTurn } from '../store/useComputerTurn'
import { useAnnouncements } from '../../audio/useAnnouncements'

/** Reserves room for the last-shot chip so its first appearance (it renders
 * null before the first shot) doesn't shift the scope header's layout. Set to
 * the chip's own rendered height — 18px Space Grotesk bold over 6px
 * top/bottom padding — measured at 39px in the browser. Halved when
 * `compact`, matching the smaller header font that goes with it — measured
 * the same way, in the browser, at 24px. */
const LAST_SHOT_CHIP_MIN_HEIGHT = 39
const LAST_SHOT_CHIP_MIN_HEIGHT_COMPACT = 24

/** The two rows that come and go: the DIVE AGAIN button and, under reduce
 * motion, the announcement bar. Both are fixed-height by their own styles. */
const GAME_OVER_BUTTON_HEIGHT = 96
const ANNOUNCEMENT_BAR_HEIGHT = 80

/**
 * Everything around the scope grid — main's padding and row gaps, the turn
 * bar, the deck strip where there is one, and the scope panel's own
 * header/footer/padding/border/gaps — measured with real viewport emulation
 * rather than summed from the styles below, since line-height and font-metric
 * rounding make the two disagree by a few px. Each number is measured with
 * neither optional row on screen; `optionalRowOverhead` adds those.
 *
 * Measured: landscape 285 at 1024×768, portrait 502 at 768×907, 768×954,
 * 768×1024 and 600×900, phone 540 at 390×844. Each is kept a few px
 * conservative so normal rendering variance — a font swapping in late, a
 * line-height rounding differently — cannot reopen the clip this exists to
 * close; a couple of px of cell size is a much cheaper error than a board with
 * its top row hidden.
 *
 * Two known limits, both deliberate. The numbers assume Little Captain's deck
 * strip (Admiral's is ~13px shorter, and unreachable today), and they assume
 * the scope header fits on one line — below about 380px of width "SCOPE —
 * THEIR SEA" wraps and costs another 32px, which is part of why an iPhone SE
 * cannot show a 6×6 board at the 44px tap floor no matter what this returns
 * (see `scopeSizing`, and the overflow handling below).
 */
function chromeOverhead(layout: LayoutName, compact: boolean): number {
  if (layout === 'landscape') return compact ? 118 : 292
  if (layout === 'portrait') return 506
  return 544
}

/** The row gap in `main`. Read by the overhead maths as well as the style. */
function mainRowGap(layout: LayoutName, compact: boolean): number {
  return compact ? 6 : layout === 'phone' ? 10 : 14
}

/**
 * What the optional rows cost the scope on top of `chromeOverhead`.
 *
 * Charged as height plus one row gap each. That is very slightly pessimistic
 * where the row lands in a template row that `main` already reserves (and
 * already gaps) while empty — but the error is one 14px gap in the direction
 * that cannot clip anything, and the alternative is arithmetic that silently
 * depends on how many rows `gridTemplateRows` below happens to define.
 *
 * The phone layout's announcement bar is always on screen and is therefore
 * already inside `chromeOverhead`, not here.
 */
function optionalRowOverhead(
  layout: LayoutName,
  compact: boolean,
  rows: { announcementBar: boolean; gameOver: boolean },
): number {
  const gap = mainRowGap(layout, compact)
  const bar = rows.announcementBar && layout !== 'phone' ? ANNOUNCEMENT_BAR_HEIGHT + gap : 0
  return bar + (rows.gameOver ? GAME_OVER_BUTTON_HEIGHT + gap : 0)
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
  const reduceMotion = useGameStore((s) => s.reduceMotion)
  const volume = useGameStore((s) => s.volume)
  const speakEveryMove = useGameStore((s) => s.speakEveryMove)
  const voicePack = useGameStore((s) => s.voicePack)
  const fireAt = useGameStore((s) => s.fireAt)
  const restart = useGameStore((s) => s.restart)
  const dismissTakeover = useGameStore((s) => s.dismissTakeover)

  useComputerTurn()
  useAnnouncements({
    lastShot: game.lastShot,
    mode,
    pack: voicePack,
    volume,
    speakEveryMove,
  })

  const myTurn = game.phase === 'playing' && game.turn === 'player'

  // Spec §7 puts the bar on `phone` only, but §6.1 makes it the reduce-motion
  // REPLACEMENT for the takeover — so without this the reduce-motion setting
  // would leave a tablet player with no result feedback at all.
  const announcementBar = layout === 'phone' || reduceMotion
  const gameOverRow = game.phase === 'over'

  // Every layout gets the fit, not just landscape: a real iPad in portrait
  // Safari is ~954px tall, not the spec's 1024, and the spec's 72px cells
  // overflowed it by 10px. The row gap and the two optional rows are part of
  // the same sum — the DIVE AGAIN button clipped 43px off the final board at
  // 1024×768, at the moment that board matters most.
  const availableHeight =
    viewportHeight -
    chromeOverhead(layout, compact) -
    optionalRowOverhead(layout, compact, { announcementBar, gameOver: gameOverRow })
  const scope = scopeSizing(layout, mode, { rows: game.size, availableHeight })
  const deck = deckSizing(layout, mode)

  // `scopeSizing` stops at the 44px tap floor even when that still overflows —
  // a 6×6 board does not fit an iPhone SE's 667px alongside this much chrome.
  // Centring what overflows puts its top rows above the scroll origin, where
  // they are unreachable; top-aligning them keeps every cell reachable by
  // scrolling the panel.
  const scopeOverflows = game.size * scope.cell + (game.size - 1) * scope.gap > availableHeight

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
          <LastShotChip shot={game.computer.shots.at(-1) ?? null} compact={compact} />
        </span>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: scopeOverflows ? 'flex-start' : 'center',
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

  const gameOver = gameOverRow && (
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
          gap: mainRowGap(layout, compact),
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

        {announcementBar && <AnnouncementBar lastShot={game.lastShot} pack={voicePack} />}
        {gameOver}
      </main>

      <TakeoverView takeover={takeover} onDismiss={dismissTakeover} />
    </Bezel>
  )
}
