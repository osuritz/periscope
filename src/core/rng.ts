/** A source of randomness in [0, 1). Injected everywhere so games are reproducible. */
export type Rng = () => number

/**
 * mulberry32 — a small, fast, well-distributed seeded PRNG.
 * Chosen over a hand-rolled LCG because it passes basic randomness tests at
 * this size and needs no dependency.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The only place Math.random is permitted in this codebase. */
export const systemRng: Rng = () => Math.random()

export function randomInt(maxExclusive: number, rng: Rng): number {
  return Math.floor(rng() * maxExclusive)
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pick: empty list')
  const item = items[randomInt(items.length, rng)]
  // noUncheckedIndexedAccess: the index is provably in range above.
  return item as T
}
