import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameScreen from './GameScreen'
import { useGameStore } from '../store/gameStore'
import { installMatchMedia } from '../../test/matchMedia'
import { allCoords, coordLabel } from '../../core/coords'
import { boardFrom, cellState, fire } from '../../core/board'
import { applyShot } from '../../core/game'
import type { Placement } from '../../core/placement'

const s = () => useGameStore.getState()

function emptyCellLabel() {
  const g = s().game
  const at = allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
  return coordLabel(at)
}

function playToTheEnd() {
  act(() => {
    // Bounded the same way as gameStore.test.ts's 'plays a whole game to a
    // winner' loop: a 6x6 board has 36 cells per side, so a real game ends
    // well under 100 shots. Without this, a regression that stops a shot from
    // consuming the turn (e.g. dropping the alreadyFired check from canFire)
    // spins here forever at 100% CPU — a synchronous loop no Vitest timeout
    // can preempt. The message on the assertion below is what makes that
    // failure legible: without it, callers would instead see a confusing
    // failure from whatever they assert next (e.g. a missing "dive again"
    // button), with no hint that the game never actually finished.
    let guard = 0
    while (s().game.phase === 'playing' && guard++ < 500) {
      if (s().game.turn === 'player') {
        s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!)
      } else {
        s().takeComputerTurn()
      }
    }
    expect(
      s().game.phase,
      'playToTheEnd: game did not finish within 500 iterations',
    ).toBe('over')
    s().dismissTakeover()
  })
}

const scopeGrid = () => screen.getByRole('group', { name: /their sea/i })
const deckGrid = () => screen.getByRole('group', { name: /my deck/i })

function scopeCell(): number {
  return parseInt(within(scopeGrid()).getAllByRole('button')[0]!.style.width)
}

/** The height the scope grid actually asks for — what `scopeSizing` fits. */
function scopeContentHeight(): number {
  const grid = scopeGrid()
  const cell = parseInt(within(grid).getAllByRole('button')[0]!.style.width)
  const gap = parseInt(grid.style.gap)
  return 6 * cell + 5 * gap
}

const place = (
  shipId: string,
  x: number,
  y: number,
  orientation: 'h' | 'v',
  length: number,
): Placement => ({ shipId, origin: { x, y }, orientation, length })

/**
 * A fully known board on each side, installed straight into the store.
 *
 * The enemy gets a `sub` at A1–A3 plus one player shot on it (a miss at F6);
 * the player gets a `tug` at E2–E3 plus one computer shot on it (a miss at
 * F1). Every one of those four facts distinguishes the two boards, the two
 * `reveal` flags and the two fleet-pip tones — which is what a screen-level
 * wiring test needs, since each component's own suite passes `board` and
 * `reveal` explicitly and therefore cannot see a mis-wire here.
 */
function rigKnownBoards() {
  const computer = fire(boardFrom(6, [place('sub', 0, 0, 'h', 3)]), { x: 5, y: 5 }).board
  const player = fire(boardFrom(6, [place('tug', 1, 4, 'h', 2)]), { x: 0, y: 5 }).board
  act(() => useGameStore.setState({ game: { ...s().game, computer, player } }))
}

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installMatchMedia(768, 1024)
    s().restart('little', 'rookie')
    // Reduce motion is off by default here, and deliberately: it now decides
    // whether the announcement bar renders on a tablet (spec §6.1), which adds
    // a row and changes how much height the scope has. Tests that want it on
    // say so.
    s().setReduceMotion(false)
  })
  afterEach(() => vi.useRealTimers())

  it('shows both grids, clearly distinguished', () => {
    render(<GameScreen />)
    expect(scopeGrid()).toBeInTheDocument()
    expect(deckGrid()).toBeInTheDocument()
  })

  it('makes only the enemy grid tappable', () => {
    render(<GameScreen />)
    expect(within(scopeGrid()).getAllByRole('button').length).toBe(36)
    expect(within(deckGrid()).queryAllByRole('button')).toHaveLength(0)
  })

  it('shoots into the hidden enemy board and reads out his own, never the reverse', () => {
    // The UI-side twin of the OpponentView anti-cheating guarantee. Each of
    // these four assertions dies under a one-token mis-wire in the screen:
    // scope reveal -> true, scope board -> game.player, deck board ->
    // game.computer, deck reveal -> false.
    rigKnownBoards()
    render(<GameScreen />)
    const theirs = scopeGrid()
    const mine = deckGrid()

    // A1 sits on their submarine and must still read as unfired water.
    expect(within(theirs).getByRole('button', { name: 'A1, unknown' })).toBeInTheDocument()
    // The scope shows HIS shots at THEIR sea: his miss at F6 is there...
    expect(within(theirs).getByRole('button', { name: 'F6, miss' })).toBeInTheDocument()
    // ...and the computer's miss at F1, which landed on his own fleet, is not.
    expect(within(theirs).getByRole('button', { name: 'F1, unknown' })).toBeInTheDocument()

    // The deck is his own board, revealed: his tug shows, the enemy's sub does
    // not, and the shot he has taken is the one the computer fired at him.
    expect(within(mine).getByRole('img', { name: 'E2, ship' })).toBeInTheDocument()
    expect(within(mine).getByRole('img', { name: 'E3, ship' })).toBeInTheDocument()
    expect(within(mine).getByRole('img', { name: 'A1, unknown' })).toBeInTheDocument()
    expect(within(mine).getByRole('img', { name: 'F1, miss' })).toBeInTheDocument()
  })

  it('keeps the enemy fleet pips blank while his own fleet reads as ships', () => {
    // The same leak one level down: `tone="own"` on the enemy pips reveals
    // exactly where their ships are, in a row of squares under the scope.
    rigKnownBoards()
    render(<GameScreen />)
    const theirs = screen.getByRole('list', { name: 'their fleet' })
    const mine = screen.getByRole('list', { name: 'my fleet' })

    const segments = (list: HTMLElement) =>
      [...list.querySelectorAll('span')].map((el) => el.style.background)

    expect(segments(theirs)).toEqual(['var(--panel)', 'var(--panel)', 'var(--panel)'])
    expect(segments(mine)).toEqual(['var(--scope)', 'var(--scope)'])
  })

  it('fires when the child taps a scope cell', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<GameScreen />)
    const label = emptyCellLabel()
    await user.click(within(scopeGrid()).getByRole('button', { name: `${label}, unknown` }))
    expect(s().game.computer.shots).toHaveLength(1)
  })

  it('reports the last shot HE fired at their sea, not whichever side fired last', () => {
    // The chip sits under the heading SCOPE — THEIR SEA, so it must read the
    // enemy board's shot log. Fed `game.lastShot` it showed the computer's
    // shot at the child's own fleet — a coordinate from the wrong board, with
    // a skull on it at the moment one of his own ships went down.
    render(<GameScreen />)
    act(() => s().fireAt({ x: 0, y: 0 })) // his shot: A1, on their sea
    act(() =>
      useGameStore.setState({ game: applyShot(s().game, 'computer', { x: 5, y: 5 }) }),
    ) // theirs: F6, on his deck

    expect(s().game.lastShot?.by).toBe('computer') // the store's lastShot HAS flipped
    expect(screen.getByText(/^last: A1 /)).toBeInTheDocument()
    expect(screen.queryByText(/^last: F6 /)).toBeNull()
  })

  it('lights the bezel on the player turn and drops it on the computer turn', () => {
    const { container } = render(<GameScreen />)
    const bezel = () => container.querySelector('[data-bezel]') as HTMLElement
    expect(bezel().style.boxShadow).toContain('var(--amber)')
    act(() => s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!))
    // One shot per turn, always: after his shot it is the computer's turn.
    expect(s().game.turn).toBe('computer')
    expect(bezel().style.boxShadow).toBe('')
  })

  it('holds the computer turn until the takeover clears, then plays it in the open', () => {
    // Composed timing, not just the hook's: the takeover runs 1400ms and the
    // computer's beat 700ms, so before the gate the whole enemy turn — bezel
    // dark, shot landing on his own deck, bezel amber again — happened behind
    // a full-frame overlay and he saw only its aftermath.
    render(<GameScreen />)
    act(() => s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!))
    expect(s().takeover).not.toBeNull()

    act(() => void vi.advanceTimersByTime(700)) // the beat, if it were running
    expect(s().game.player.shots).toHaveLength(0)

    act(() => void vi.advanceTimersByTime(700)) // 1400ms: the takeover auto-advances
    expect(s().takeover).toBeNull()
    expect(s().game.player.shots).toHaveLength(0)

    act(() => void vi.advanceTimersByTime(700)) // now the beat runs, in the open
    expect(s().game.player.shots).toHaveLength(1)
  })

  it('renders the phone layout with an announcement bar', () => {
    // Reduce motion is off (see beforeEach), so this is the phone rule alone.
    installMatchMedia(390, 844)
    render(<GameScreen />)
    expect(screen.getByText(/Tap a square to fire!/)).toBeInTheDocument()
  })

  it('gives a tablet the announcement bar under reduce motion, and only then', () => {
    // Spec §6.1 makes the bar the REPLACEMENT for the suppressed takeover, and
    // spec §7 only puts it on the phone — so on a tablet with reduce motion on
    // there was no result feedback of any kind.
    const { unmount } = render(<GameScreen />)
    expect(screen.queryByText(/Tap a square to fire!/)).toBeNull()
    unmount()

    act(() => s().setReduceMotion(true))
    render(<GameScreen />)
    expect(screen.getByText(/Tap a square to fire!/)).toBeInTheDocument()
  })

  it('shrinks the scope cells to the 44px tap floor for a phone held sideways', () => {
    // Regression for the Task 10 review's Critical finding: at 844×390 the
    // scope grid was silently clipped (307px of it, plus the whole THEIR
    // FLEET footer) because the wrapper had no way to shrink the grid to fit.
    // jsdom has no real layout engine, so the clip itself can't be asserted
    // here — this instead asserts the thing that actually drives the fix:
    // the landscape structure is kept (side by side, not stacked, so nothing
    // else competes with the scope for height) and the cell size this short
    // a viewport forces the scope down to. Real-device confirmation that the
    // grid and its footer are fully visible without scrolling is in
    // task-10-report.md.
    installMatchMedia(844, 390)
    render(<GameScreen />)
    const cells = within(scopeGrid()).getAllByRole('button')
    expect(cells).toHaveLength(36)
    for (const cell of cells) {
      expect(cell.style.width).toBe('44px')
    }
    // The asymmetry survives even at the floor: the scope is still visibly
    // larger than the passive deck readout.
    const deckCells = within(deckGrid()).getAllByRole('img')
    expect(parseInt(deckCells[0]!.style.width)).toBeLessThan(44)
  })

  it('keeps the spec cell size for a merely tall-enough landscape viewport (1133×744)', () => {
    // The milder half of the same defect: 18px short of the spec table's
    // 472px content height, which should shrink the gap, not the cell.
    installMatchMedia(1133, 744)
    render(<GameScreen />)
    expect(scopeCell()).toBe(72)
  })

  it('fits the scope to a real iPad portrait viewport, Safari chrome and all', () => {
    // 768×1024 is the spec's portrait tablet; a real iPad in portrait Safari
    // is about 768×954, and at 954 the spec's 72px cells overflowed the panel
    // by 10px. Portrait received no `fit` at all, so nothing could give.
    // 502px of that viewport is chrome (measured at 907, 954 and 1024, and at
    // 600×900 — it does not move with height), and the constant carries a few
    // px of slack on top.
    installMatchMedia(768, 954)
    render(<GameScreen />)
    expect(scopeContentHeight()).toBeLessThanOrEqual(954 - 506)
    expect(scopeCell()).toBeGreaterThanOrEqual(44)
  })

  it('does not shrink a portrait viewport that already fits the spec size', () => {
    // The other half of the same fix: fitting must not cost cell size where
    // there was never a shortfall.
    installMatchMedia(768, 1024)
    render(<GameScreen />)
    expect(scopeCell()).toBe(72)
  })

  it('offers a restart once the game is over', () => {
    playToTheEnd()
    render(<GameScreen />)
    expect(screen.getByRole('button', { name: /dive again/i })).toBeInTheDocument()
  })

  it('leaves room for the DIVE AGAIN row so the last board of all is not clipped', () => {
    // 1024×768 is the primary target viewport, and game over is the moment the
    // board matters most. The button is a third row — 96px plus a 14px gap —
    // and the scope had no idea it was there: the grid overflowed its panel
    // and put a scrollbar inside the teal frame.
    installMatchMedia(1024, 768)
    const playing = render(<GameScreen />)
    expect(scopeCell()).toBe(72) // nothing given up while the game is on
    playing.unmount()

    playToTheEnd()
    render(<GameScreen />)
    expect(screen.getByRole('button', { name: /dive again/i })).toBeInTheDocument()
    expect(scopeContentHeight()).toBeLessThanOrEqual(768 - 292 - (96 + 14))
    expect(scopeCell()).toBeGreaterThanOrEqual(44)
  })
})
