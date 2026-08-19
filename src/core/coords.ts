/** A board cell. `x` is the column (0-based), `y` is the row (0-based). */
export type Coord = { x: number; y: number }

const LETTERS = 'ABCDEFGHIJ'

/** {x:2, y:6} -> "C7". Spoken aloud and shown in the "last shot" chip. */
export function coordLabel(c: Coord): string {
  return `${LETTERS[c.x] ?? '?'}${c.y + 1}`
}

export function inBounds(c: Coord, size: number): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < size && c.y < size
}

export function coordEquals(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y
}

/** Stable string key for Set/Map membership. */
export function coordKey(c: Coord): string {
  return `${c.x},${c.y}`
}

export function orthogonalNeighbors(c: Coord, size: number): Coord[] {
  const candidates: Coord[] = [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ]
  return candidates.filter((n) => inBounds(n, size))
}

export function allCoords(size: number): Coord[] {
  const out: Coord[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) out.push({ x, y })
  }
  return out
}
