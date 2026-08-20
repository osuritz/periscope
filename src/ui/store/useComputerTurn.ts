import { useEffect } from 'react'
import { useGameStore } from './gameStore'

/**
 * Drives the computer's turn on a timer. The pause is not decoration: without
 * it the computer's shots land instantly and a five-year-old cannot tell what
 * just happened to his fleet.
 *
 * A hit keeps the turn, so the computer may fire several times running. The
 * effect depends on the `game` object itself, not its individual primitive
 * fields: `set()` produces a fresh `game` reference on every shot, including
 * a hit that leaves `phase` and `turn` unchanged, so keying off `game` is what
 * makes the effect re-run and reschedule the next beat. Selecting `phase` and
 * `turn` as separate primitives would miss exactly that case, since Zustand's
 * selector hooks only re-render when the *selected* value changes under
 * `Object.is` — a hit-that-keeps-the-turn changes neither, so the effect would
 * never be reconsidered and the computer's turn would stall for good.
 */
export function useComputerTurn(delayMs = 700): void {
  const game = useGameStore((s) => s.game)
  const takeComputerTurn = useGameStore((s) => s.takeComputerTurn)

  useEffect(() => {
    if (game.phase !== 'playing' || game.turn !== 'computer') return
    const id = setTimeout(takeComputerTurn, delayMs)
    return () => clearTimeout(id)
  }, [game, takeComputerTurn, delayMs])
}
