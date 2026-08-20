import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FleetPips from './FleetPips'
import { boardFrom, fire } from '../../core/board'
import type { Placement } from '../../core/placement'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('FleetPips', () => {
  it('renders one pip per ship', () => {
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

  it('sizes each pip in proportion to its ship length', () => {
    render(<FleetPips board={fixture()} tone="own" />)
    const sub = screen.getByLabelText('sub, afloat')
    const tug = screen.getByLabelText('tug, afloat')
    expect(parseInt(sub.style.width)).toBeGreaterThan(parseInt(tug.style.width))
  })
})
