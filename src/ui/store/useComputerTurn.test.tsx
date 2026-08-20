import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComputerTurn } from './useComputerTurn'
import { useGameStore } from './gameStore'
import { allCoords, coordKey } from '../../core/coords'
import { cellState } from '../../core/board'
import { placementCells } from '../../core/placement'

const s = () => useGameStore.getState()

function anEmptyCell() {
  const g = s().game
  return allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
}

describe('useComputerTurn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    s().restart('little', 'rookie')
  })
  afterEach(() => vi.useRealTimers())

  it('does nothing while it is the player turn', () => {
    renderHook(() => useComputerTurn(300))
    act(() => void vi.advanceTimersByTime(1000))
    expect(s().game.player.shots).toHaveLength(0)
  })

  it('fires after the delay once the turn passes', () => {
    renderHook(() => useComputerTurn(300))
    act(() => s().fireAt(anEmptyCell()))
    expect(s().game.player.shots).toHaveLength(0)
    act(() => void vi.advanceTimersByTime(300))
    expect(s().game.player.shots).toHaveLength(1)
  })

  it('keeps firing on its own turn until it misses', () => {
    renderHook(() => useComputerTurn(300))
    act(() => s().fireAt(anEmptyCell()))
    for (let i = 0; i < 40 && s().game.turn === 'computer'; i++) {
      act(() => void vi.advanceTimersByTime(300))
    }
    expect(s().game.turn === 'player' || s().game.phase === 'over').toBe(true)
  })

  it('reschedules and fires again after a hit that keeps the turn, deterministically', () => {
    // Regression test for the freeze this fixed: a hit leaves `phase` and
    // `turn` both unchanged, so an effect keyed on those primitives never
    // re-runs and the next beat is never scheduled. Relying on RNG to land a
    // first-shot hit is a coin flip (or worse) depending on tier and mode, so
    // instead we force it via the store's public Zustand `setState`: restrict
    // `game.player.shots` (which `untriedCells` derives from) to already
    // cover every cell except one whole ship. `rookie`'s uniformly-random pick
    // among untried cells then has nowhere to land but that ship — a
    // guaranteed hit, not a lucky one.
    renderHook(() => useComputerTurn(300))

    const game = s().game
    const ship = game.player.placements[0]!
    const shipCells = new Set(placementCells(ship).map(coordKey))
    const restrictedShots = allCoords(game.size)
      .filter((c) => !shipCells.has(coordKey(c)))
      .map((at) => ({ at, result: 'miss' as const }))

    act(() => {
      useGameStore.setState({
        game: {
          ...game,
          phase: 'playing',
          turn: 'computer',
          player: { ...game.player, shots: restrictedShots },
        },
      })
    })

    act(() => void vi.advanceTimersByTime(300))
    // The forced shot can only have landed on the ship: a hit, which keeps
    // the turn with the computer.
    expect(s().game.turn).toBe('computer')
    expect(s().game.player.shots).toHaveLength(restrictedShots.length + 1)

    act(() => void vi.advanceTimersByTime(300))
    // With the bug, this second beat is never scheduled and the assertion
    // below fails because no second shot ever lands.
    expect(s().game.player.shots).toHaveLength(restrictedShots.length + 2)
  })

  it('stops once the game is over', () => {
    renderHook(() => useComputerTurn(300))
    act(() => {
      while (s().game.phase === 'playing') {
        if (s().game.turn === 'player') {
          const open = allCoords(s().game.size).filter((c) => s().canFire(c))
          s().fireAt(open[0]!)
        } else {
          s().takeComputerTurn()
        }
      }
    })
    const shots = s().game.player.shots.length
    act(() => void vi.advanceTimersByTime(5000))
    expect(s().game.player.shots).toHaveLength(shots)
  })
})
