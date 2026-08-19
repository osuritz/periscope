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
    for (const tier of TIERS) {
      for (const mode of ['little', 'admiral'] as const) {
        const cap = mode === 'little' ? 36 : 100
        for (let seed = 0; seed < 20; seed++) {
          expect(simulateGame(mode, tier, seed)).toBeLessThanOrEqual(cap)
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
})
