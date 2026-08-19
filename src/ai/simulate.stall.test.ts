import { describe, it, expect, vi } from 'vitest'

/**
 * Isolated in its own file because it replaces the strategy registry wholesale.
 * The stub is the exact pathology `simulateGame`'s `null` return exists to
 * catch: a strategy that keeps returning an already-fired cell. `fire` no-ops,
 * the shot counter still climbs, and the run burns the cap without sinking
 * anything.
 */
vi.mock('./index', () => ({
  strategyFor: () => () => ({ x: 0, y: 0 }),
}))

const { simulateGame, averageShots } = await import('./simulate')

describe('a stalled strategy', () => {
  it('makes simulateGame return null instead of a shot count', () => {
    expect(simulateGame('little', 'rookie', 0)).toBeNull()
  })

  it('makes averageShots throw rather than coerce the null to zero', () => {
    expect(() => averageShots('little', 'rookie', 3)).toThrow(
      'averageShots: rookie failed to sink the little fleet on seed 0',
    )
  })
})
