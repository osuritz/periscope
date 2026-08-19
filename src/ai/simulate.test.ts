import { describe, it, expect } from 'vitest'
import { simulateGame, averageShots } from './simulate'
import { strategyFor, STRATEGIES } from './index'
import type { Tier } from './types'

const TIERS: Tier[] = ['rookie', 'sailor', 'admiral']

describe('strategy registry', () => {
  it('exposes exactly the three tiers', () => {
    expect(Object.keys(STRATEGIES).sort()).toEqual(['admiral', 'rookie', 'sailor'])
  })

  it('returns a callable for each tier', () => {
    for (const tier of TIERS) expect(typeof strategyFor(tier)).toBe('function')
  })
})

describe('every tier terminates', () => {
  it('always sinks the fleet within the cell budget', () => {
    // `simulateGame` returns null when it exhausts the cap without sinking the
    // fleet. Asserting non-null is what makes this test load-bearing: the shot
    // count alone is <= cap by construction, so a strategy that re-fired at
    // already-tried cells forever would return exactly cap and pass anyway.
    for (const tier of TIERS) {
      for (const mode of ['little', 'admiral'] as const) {
        const cap = mode === 'little' ? 36 : 100
        for (let seed = 0; seed < 20; seed++) {
          const shots = simulateGame(mode, tier, seed)
          expect(shots).not.toBeNull()
          expect(shots!).toBeLessThanOrEqual(cap)
        }
      }
    }
  })
})

describe('difficulty is genuinely ordered', () => {
  it('ranks admiral stronger than sailor, and sailor stronger than rookie (10x10)', () => {
    const games = 60
    const rookieAvg = averageShots('admiral', 'rookie', games)
    const sailorAvg = averageShots('admiral', 'sailor', games)
    const admiralAvg = averageShots('admiral', 'admiral', games)

    expect(sailorAvg).toBeLessThan(rookieAvg)
    expect(admiralAvg).toBeLessThan(sailorAvg)
  })

  it('keeps the same ordering on the 6x6 board', () => {
    const games = 60
    expect(averageShots('little', 'sailor', games)).toBeLessThan(averageShots('little', 'rookie', games))
    expect(averageShots('little', 'admiral', games)).toBeLessThan(averageShots('little', 'sailor', games))
  })

  it('leaves Rookie weak enough for a child to beat', () => {
    // Rookie is memoryless, so it needs close to the whole board on average.
    expect(averageShots('little', 'rookie', 60)).toBeGreaterThan(24)
  })

  it('keeps Admiral genuinely strong, not merely stronger than Sailor', () => {
    // The ordering assertions above are relative: all three tiers could decay
    // together and still rank correctly. This pins the strong end in absolute
    // terms. Measured on 10x10 over 2000 seeds: mean 45.4, sd 8.8, worst
    // 60-seed window 48.0. Sailor's 10x10 mean is 60.1, so a 55-shot bar
    // cannot be met by Sailor-grade play, and leaves ~19% headroom over
    // Admiral's own 46.3 at this sample size.
    expect(averageShots('admiral', 'admiral', 60)).toBeLessThan(55)
  })

  it('keeps Admiral genuinely strong on the small board too', () => {
    // Measured 18.1 on 6x6 at n=60; Sailor's is 22.4, so this bar likewise
    // separates Admiral from the tier below rather than just from random play.
    expect(averageShots('little', 'admiral', 60)).toBeLessThan(21)
  })
})
