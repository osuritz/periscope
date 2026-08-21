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
    // The hook now waits for the result takeover to clear before starting its
    // beat, so every test that is not ABOUT that gate turns takeovers off and
    // measures the beat alone. The gate has its own test below.
    s().setReduceMotion(true)
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

  it('fires exactly one shot on its turn, then hands the turn back (or ends the game)', () => {
    // Official rule: one shot per turn, win or lose — a hit no longer keeps
    // the turn (see src/core/game.ts). So a single 300ms beat is always
    // enough for the computer's turn to resolve one way or the other; this
    // loop no longer needs to run more than once in practice, but stays
    // bounded rather than asserting exactly one iteration, since the exact
    // shot count depends on unseeded RNG.
    renderHook(() => useComputerTurn(300))
    act(() => s().fireAt(anEmptyCell()))
    for (let i = 0; i < 40 && s().game.turn === 'computer'; i++) {
      act(() => void vi.advanceTimersByTime(300))
    }
    expect(s().game.turn === 'player' || s().game.phase === 'over').toBe(true)
    expect(s().game.player.shots).toHaveLength(1)
  })

  it('does not fire while the result takeover is up, and fires once it clears', () => {
    // The bug this covers: the takeover runs 1400ms and this beat ran 700ms,
    // so the computer's whole turn happened underneath a full-frame overlay —
    // the bezel went dark and came back, and the shot landed on the child's
    // own deck, all while he was looking at the word HIT. Remove the
    // `if (takeover) return` line and this test fails on the first assertion
    // after the advance.
    s().setReduceMotion(false)
    renderHook(() => useComputerTurn(300))

    act(() => s().fireAt(anEmptyCell()))
    expect(s().takeover).not.toBeNull()
    expect(s().game.turn).toBe('computer')

    act(() => void vi.advanceTimersByTime(3000))
    expect(s().game.player.shots).toHaveLength(0) // still hidden behind the takeover

    act(() => s().dismissTakeover())
    expect(s().game.player.shots).toHaveLength(0) // the beat starts only now
    act(() => void vi.advanceTimersByTime(300))
    expect(s().game.player.shots).toHaveLength(1)
  })

  it('reschedules on each new computer turn, deterministically', () => {
    // Regression coverage for the freeze this fixed, adapted to the
    // one-shot-per-turn rule. The original bug: a hit left `phase` and `turn`
    // both unchanged, so an effect keyed on those primitives never re-ran and
    // the next beat was never scheduled. Under the new rule every actual shot
    // changes `turn` or `phase` (a hit now passes the turn instead of keeping
    // it), so that specific unchanged-primitives case can no longer arise —
    // but the effect must still reliably reschedule turn after turn, not just
    // once. This drives two full player -> computer round trips and checks
    // both computer shots land.
    //
    // What is deterministic here is the RESCHEDULING, which holds whether the
    // computer hits or misses. The shots themselves run on the unseeded
    // `systemRng`, so this test does NOT pin the computer-side turn rule: if
    // `applyShot` regressed to the old "a hit keeps the turn" house rule, this
    // test would only notice on the runs where the RNG happened to land a hit
    // (measured at roughly a coin flip). That rule is covered deterministically
    // in src/core/game.test.ts — 'passes the turn back to the player after a
    // computer hit' — and must stay there.
    renderHook(() => useComputerTurn(300))

    act(() => s().fireAt(anEmptyCell()))
    expect(s().game.turn).toBe('computer')
    act(() => void vi.advanceTimersByTime(300))
    expect(s().game.player.shots).toHaveLength(1)

    if (s().game.phase !== 'playing') return // the computer's first shot won; nothing left to reschedule
    expect(s().game.turn).toBe('player')

    act(() => s().fireAt(anEmptyCell()))
    expect(s().game.turn).toBe('computer')
    act(() => void vi.advanceTimersByTime(300))
    // With the old bug, this second beat would never be scheduled and the
    // shot count below would stay stuck at 1.
    expect(s().game.player.shots).toHaveLength(2)
  })

  it('stops once the game is over', () => {
    renderHook(() => useComputerTurn(300))
    act(() => {
      // Bounded the same way as gameStore.test.ts's 'plays a whole game to a
      // winner' loop: a 6x6 board has 36 cells per side, so a real game ends
      // well under 100 shots. Without this, a regression that stops a shot
      // from consuming the turn (e.g. dropping the alreadyFired check from
      // canFire) spins here forever at 100% CPU — a synchronous loop no
      // Vitest timeout can preempt. The message on the assertion below makes
      // that failure legible: without it, the test would instead fail on the
      // shot-count assertion further down with no hint the game never
      // actually finished.
      let guard = 0
      while (s().game.phase === 'playing' && guard++ < 500) {
        if (s().game.turn === 'player') {
          const open = allCoords(s().game.size).filter((c) => s().canFire(c))
          s().fireAt(open[0]!)
        } else {
          s().takeComputerTurn()
        }
      }
    })
    expect(
      s().game.phase,
      'stops once the game is over: game did not finish within 500 iterations',
    ).toBe('over')
    const shots = s().game.player.shots.length
    act(() => void vi.advanceTimersByTime(5000))
    expect(s().game.player.shots).toHaveLength(shots)
  })
})
