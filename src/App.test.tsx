import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { allCoords, coordLabel } from './core/coords'
import { cellState } from './core/board'
import { canPlace, type Placement } from './core/placement'
import { installMatchMedia } from './test/matchMedia'
import { useGameStore } from './ui/store/gameStore'

const s = () => useGameStore.getState()
const fixedPlacements: Placement[] = [
  { shipId: 'submarine', origin: { x: 3, y: 0 }, orientation: 'h', length: 3 },
  { shipId: 'patrol', origin: { x: 0, y: 4 }, orientation: 'h', length: 2 },
  { shipId: 'tug', origin: { x: 0, y: 5 }, orientation: 'h', length: 2 },
]

function resetToTitle() {
  s().restart('little', 'rookie')
  s().home()
  s().setReduceMotion(false)
  s().setVolume(true)
  s().setSpeakEveryMove(true)
  s().setVoicePack('captain')
  s().closeSettings()
}

function installFixedPlacement() {
  useGameStore.setState({
    game: {
      ...s().game,
      player: { ...s().game.player, placements: fixedPlacements },
    },
  })
}

describe('App shell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installMatchMedia(768, 1024)
    resetToTitle()
  })

  afterEach(() => vi.useRealTimers())

  it('starts on the picture-first title screen and dives to ship placement', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /admiral sea/i }))
    await user.click(screen.getByRole('button', { name: /sailor opponent/i }))
    await user.click(screen.getByRole('button', { name: /^dive$/i }))

    expect(s().mode).toBe('admiral')
    expect(s().tier).toBe('sailor')
    expect(s().game.phase).toBe('setup')
    expect(screen.getByRole('group', { name: /place my ships/i })).toBeInTheDocument()
  })

  it('makes READY idempotent before the game screen appears', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    act(() => s().dive())
    render(<App />)

    const ready = screen.getByRole('button', { name: /ready/i })
    await user.dblClick(ready)

    expect(s().game.phase).toBe('playing')
    expect(screen.getByRole('group', { name: /their sea/i })).toBeInTheDocument()
  })

  it('moves a ship by dragging one of its cells to an open square', () => {
    act(() => s().dive())
    const original = s().game.player.placements[0]!
    const target = allCoords(s().game.size).find(
      (coord) =>
        (coord.x !== original.origin.x || coord.y !== original.origin.y) &&
        cellState(s().game.player, coord, true) === 'unknown' &&
        canPlace({ ...original, origin: coord }, s().game.size, s().game.player.placements),
    )!
    render(<App />)

    fireEvent.dragStart(screen.getAllByRole('button', { name: /submarine/i })[0]!)
    fireEvent.drop(
      screen.getByRole('button', {
        name: `${coordLabel(target)}, open`,
      }),
    )

    const moved = s().game.player.placements.find((p) => p.shipId === original.shipId)!
    expect(moved.origin).toEqual(target)
  })

  it('moves and rotates ships from the keyboard', () => {
    act(() => {
      s().dive()
      installFixedPlacement()
    })
    render(<App />)

    const origin = screen.getByRole('button', { name: 'A4, submarine' })
    origin.focus()
    fireEvent.keyDown(origin, { key: 'ArrowLeft' })

    const moved = s().game.player.placements.find((p) => p.shipId === 'submarine')!
    expect(moved.origin).toEqual({ x: 2, y: 0 })
    expect(screen.getByRole('button', { name: 'A3, submarine' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('button', { name: 'A3, submarine' }), { key: 'r' })
    const rotated = s().game.player.placements.find((p) => p.shipId === 'submarine')!
    expect(rotated.orientation).toBe('v')
  })

  it('keeps placement tab stops to ship origins', () => {
    act(() => {
      s().dive()
      installFixedPlacement()
    })
    render(<App />)

    expect(screen.getByRole('button', { name: 'A4, submarine' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('button', { name: 'A5, submarine' })).toHaveAttribute('tabIndex', '-1')
    expect(screen.getByRole('button', { name: 'A1, open' })).toHaveAttribute('tabIndex', '-1')
  })

  it('opens parent settings only after the three-second gear hold', () => {
    render(<App />)
    const gear = screen.getByRole('button', { name: /hold for parent settings/i })

    fireEvent.pointerDown(gear)
    act(() => void vi.advanceTimersByTime(2999))
    expect(screen.queryByRole('dialog', { name: /parent settings/i })).toBeNull()

    act(() => void vi.advanceTimersByTime(1))
    expect(screen.getByRole('dialog', { name: /parent settings/i })).toBeInTheDocument()
  })

  it('opens parent settings from a three-second keyboard hold', () => {
    render(<App />)
    const gear = screen.getByRole('button', { name: /hold for parent settings/i })

    gear.focus()
    fireEvent.keyDown(gear, { key: 'Enter' })
    act(() => void vi.advanceTimersByTime(2999))
    expect(screen.queryByRole('dialog', { name: /parent settings/i })).toBeNull()

    act(() => void vi.advanceTimersByTime(1))
    expect(screen.getByRole('dialog', { name: /parent settings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close settings/i })).toHaveFocus()
  })

  it('closes parent settings with Escape and restores focus to the gear', () => {
    render(<App />)
    const gear = screen.getByRole('button', { name: /hold for parent settings/i })

    fireEvent.pointerDown(gear)
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.getByRole('button', { name: /close settings/i })).toHaveFocus()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(screen.queryByRole('dialog', { name: /parent settings/i })).toBeNull()
    expect(gear).toHaveFocus()

    fireEvent.keyDown(gear, { key: ' ' })
    act(() => void vi.advanceTimersByTime(3000))
    expect(screen.getByRole('dialog', { name: /parent settings/i })).toBeInTheDocument()
  })

  it('keeps Tab focus inside parent settings while it is open', () => {
    render(<App />)
    const gear = screen.getByRole('button', { name: /hold for parent settings/i })
    fireEvent.pointerDown(gear)
    act(() => void vi.advanceTimersByTime(3000))

    const close = screen.getByRole('button', { name: /close settings/i })
    const reset = screen.getByRole('button', { name: /reset game/i })
    expect(close).toHaveFocus()

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(reset).toHaveFocus()

    fireEvent.keyDown(reset, { key: 'Tab' })
    expect(close).toHaveFocus()
  })

  it('routes an over game to the surfaced screen', () => {
    act(() => {
      s().restart('little', 'rookie')
      useGameStore.setState({ game: { ...s().game, phase: 'over', winner: 'player' } })
    })

    render(<App />)
    expect(screen.getByText('SURFACED!')).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation')).getByRole('button', { name: /dive again/i }),
    ).toBeInTheDocument()
  })
})
