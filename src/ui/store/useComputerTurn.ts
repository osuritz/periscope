import { useEffect } from 'react'
import { useGameStore } from './gameStore'

/**
 * Drives the computer's turn on a timer. The pause is not decoration: without
 * it the computer's shots land instantly and a five-year-old cannot tell what
 * just happened to his fleet.
 *
 * One shot per turn (official rules, `core/game.ts`): the turn always passes
 * after a shot resolves, hit or miss, so the computer fires once per turn
 * here, never a streak. The effect still depends on the `game` object itself,
 * not its individual primitive fields: `set()` produces a fresh `game`
 * reference on every shot, and keying off `game` — rather than selecting
 * `phase` and `turn` as separate primitives, which only re-render on a
 * genuine `Object.is` change — is what previously fixed a freeze where a
 * shot left both primitives unchanged. That exact case can no longer arise
 * now that every shot changes `turn` or `phase`, but the dependency stays on
 * `game` rather than being narrowed back down, since it remains correct and
 * this effect is not a place to be clever twice.
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
