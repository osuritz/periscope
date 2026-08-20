import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useComputerTurn } from './useComputerTurn'
import { useGameStore } from './gameStore'
import { allCoords } from '../../core/coords'
import { cellState } from '../../core/board'

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
