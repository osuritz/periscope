import { useEffect } from 'react'
import { useGameStore } from './gameStore'

/**
 * Drives the computer's turn on a timer. The pause is not decoration: without
 * it the computer's shots land instantly and a five-year-old cannot tell what
 * just happened to his fleet.
 *
 * The timer does not start until the result takeover is down. The takeover is
 * a full-frame overlay lasting 1400ms (§6.1) and this beat is 700ms, so
 * without the gate the computer's entire turn — the bezel going dark, the
 * shot arriving on the child's own deck, the bezel coming back amber —
 * happened *underneath* the overlay. He tapped, saw HIT, and the screen came
 * back with a new mark on his fleet from nowhere and the amber frame still
 * lit: the bezel (spec §5.4, "the single most important visual rule in the
 * system") conveyed nothing, and the pause this hook exists to provide was
 * spent on a screen he could not see through. Gating here rather than
 * shortening either duration keeps both intact and costs ~700ms of turn
 * length, which for this player is the point.
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
  const takeover = useGameStore((s) => s.takeover)
  const takeComputerTurn = useGameStore((s) => s.takeComputerTurn)

  useEffect(() => {
    if (takeover) return
    if (game.phase !== 'playing' || game.turn !== 'computer') return
    const id = setTimeout(takeComputerTurn, delayMs)
    return () => clearTimeout(id)
  }, [game, takeover, takeComputerTurn, delayMs])
}
