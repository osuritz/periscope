import { useEffect } from 'react'
import { useGameStore } from './gameStore'

/**
 * Drives the computer's turn on a timer. The pause is not decoration: without
 * it the computer's shots land instantly and a five-year-old cannot tell what
 * just happened to his fleet.
 *
 * A hit keeps the turn, so the computer may fire several times running. The
 * effect re-runs on every state change, scheduling one shot per beat until the
 * turn passes back or the game ends.
 */
export function useComputerTurn(delayMs = 700): void {
  const phase = useGameStore((s) => s.game.phase)
  const turn = useGameStore((s) => s.game.turn)
  const takeComputerTurn = useGameStore((s) => s.takeComputerTurn)

  useEffect(() => {
    if (phase !== 'playing' || turn !== 'computer') return
    const id = setTimeout(takeComputerTurn, delayMs)
    return () => clearTimeout(id)
  }, [phase, turn, takeComputerTurn, delayMs])
}
