import { describe, it, expect } from 'vitest'
import { seededRng, randomInt, pick } from './rng'

describe('seededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = seededRng(42)
    const b = seededRng(42)
    const seqA = [a(), a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = seededRng(1)
    const b = seededRng(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })

  it('stays within [0, 1)', () => {
    const r = seededRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('stays within [0, maxExclusive)', () => {
    const r = seededRng(3)
    for (let i = 0; i < 1000; i++) {
      const v = randomInt(6, r)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('eventually produces every value in range', () => {
    const r = seededRng(9)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) seen.add(randomInt(6, r))
    expect(seen.size).toBe(6)
  })
})

describe('pick', () => {
  it('returns an element of the input', () => {
    const r = seededRng(11)
    const items = ['a', 'b', 'c'] as const
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(pick(items, r))
    }
  })

  it('throws on an empty list', () => {
    expect(() => pick([], seededRng(1))).toThrow('pick: empty list')
  })
})
