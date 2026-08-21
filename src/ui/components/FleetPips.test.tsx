import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FleetPips from './FleetPips'
import { boardFrom, fire } from '../../core/board'
import type { Placement } from '../../core/placement'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('FleetPips', () => {
  it('renders one pip group per ship', () => {
    render(<FleetPips board={fixture()} tone="enemy" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('marks a sunk ship and leaves the survivor unmarked', () => {
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    render(<FleetPips board={b} tone="enemy" />)
    expect(screen.getByLabelText('tug, sunk')).toHaveTextContent('☠')
    expect(screen.getByLabelText('sub, afloat').textContent).toBe('')
  })

  it('renders one segment per cell of a ship, so longer ships show more segments', () => {
    render(<FleetPips board={fixture()} tone="own" />)
    // sub is length 3, tug is length 2 — the segment count is what makes a
    // longer ship visibly longer now that pips are no longer a single bar.
    expect(screen.getByLabelText('sub, afloat').children).toHaveLength(3)
    expect(screen.getByLabelText('tug, afloat').children).toHaveLength(2)
  })

  it('fills each segment from that cell\'s own state, so a partially-damaged ship shows exactly which cells are hit', () => {
    let b = fixture()
    // Hit the first two of the sub's three cells. Two hits on a length-3 ship
    // does not sink it, so this exercises the 'hit' vs 'ship' split, not sunk.
    b = fire(b, { x: 0, y: 0 }).board
    b = fire(b, { x: 1, y: 0 }).board
    render(<FleetPips board={b} tone="own" />)
    const segments = Array.from(screen.getByLabelText('sub, afloat').children) as HTMLElement[]
    expect(segments).toHaveLength(3)
    // This is the assertion the user's feedback was about: he needs to see
    // exactly 2 damaged segments and 1 healthy one, not a bar sized off length 3.
    expect(segments.map((s) => s.textContent)).toEqual(['✕', '✕', ''])
    expect(segments[0]!.style.background).toBe('var(--amber)')
    expect(segments[1]!.style.background).toBe('var(--amber)')
    expect(segments[2]!.style.background).toBe('var(--scope)')
  })

  it('hides un-fired enemy cells as unknown even on a partially-hit ship, never leaking ship position', () => {
    let b = fixture()
    // One hit on the sub's first cell; the other two cells were never fired at.
    b = fire(b, { x: 0, y: 0 }).board
    render(<FleetPips board={b} tone="enemy" />)
    const segments = Array.from(screen.getByLabelText('sub, afloat').children) as HTMLElement[]
    expect(segments).toHaveLength(3)
    expect(segments[0]!.textContent).toBe('✕')
    expect(segments[0]!.style.background).toBe('var(--amber)')
    // The un-fired cells must render as 'unknown', not 'ship' — reading
    // board.placements directly here would leak the enemy's ship position.
    expect(segments[1]!.textContent).toBe('')
    expect(segments[1]!.style.background).toBe('var(--panel)')
    expect(segments[2]!.textContent).toBe('')
    expect(segments[2]!.style.background).toBe('var(--panel)')
  })
})
