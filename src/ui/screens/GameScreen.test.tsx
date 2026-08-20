import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameScreen from './GameScreen'
import { useGameStore } from '../store/gameStore'
import { installMatchMedia } from '../../test/matchMedia'
import { allCoords, coordLabel } from '../../core/coords'
import { cellState } from '../../core/board'

const s = () => useGameStore.getState()

function emptyCellLabel() {
  const g = s().game
  const at = allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
  return coordLabel(at)
}

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    installMatchMedia(768, 1024)
    s().restart('little', 'rookie')
    s().setReduceMotion(true) // takeovers are covered in their own suite
  })
  afterEach(() => vi.useRealTimers())

  it('shows both grids, clearly distinguished', () => {
    render(<GameScreen />)
    expect(screen.getByRole('group', { name: /their sea/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /my deck/i })).toBeInTheDocument()
  })

  it('makes only the enemy grid tappable', () => {
    render(<GameScreen />)
    const theirs = screen.getByRole('group', { name: /their sea/i })
    const mine = screen.getByRole('group', { name: /my deck/i })
    expect(within(theirs).getAllByRole('button').length).toBe(36)
    expect(within(mine).queryAllByRole('button')).toHaveLength(0)
  })

  it('fires when the child taps a scope cell', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<GameScreen />)
    const label = emptyCellLabel()
    const theirs = screen.getByRole('group', { name: /their sea/i })
    await user.click(within(theirs).getByRole('button', { name: `${label}, unknown` }))
    expect(s().game.computer.shots).toHaveLength(1)
  })

  it('lights the bezel on the player turn and drops it on the computer turn', () => {
    const { container } = render(<GameScreen />)
    const bezel = () => container.querySelector('[data-bezel]') as HTMLElement
    expect(bezel().style.boxShadow).toContain('var(--amber)')
    act(() => s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!))
    if (s().game.turn === 'computer') expect(bezel().style.boxShadow).toBe('')
  })

  it('renders the phone layout with an announcement bar', () => {
    installMatchMedia(390, 844)
    render(<GameScreen />)
    expect(screen.getByText(/Tap a square to fire!/)).toBeInTheDocument()
  })

  it('offers a restart once the game is over', async () => {
    act(() => {
      while (s().game.phase === 'playing') {
        if (s().game.turn === 'player') {
          s().fireAt(allCoords(s().game.size).find((c) => s().canFire(c))!)
        } else {
          s().takeComputerTurn()
        }
      }
    })
    render(<GameScreen />)
    expect(screen.getByRole('button', { name: /dive again/i })).toBeInTheDocument()
  })
})
