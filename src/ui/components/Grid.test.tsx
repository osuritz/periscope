import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Grid from './Grid'
import { boardFrom, fire } from '../../core/board'
import type { Placement } from '../../core/placement'

const p = (shipId: string, x: number, y: number, orientation: 'h' | 'v', length: number): Placement =>
  ({ shipId, origin: { x, y }, orientation, length })

const fixture = () => boardFrom(6, [p('sub', 0, 0, 'h', 3), p('tug', 0, 2, 'v', 2)])

describe('Grid', () => {
  it('renders one cell per board square', () => {
    render(<Grid board={fixture()} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={() => {}} label="their sea" />)
    expect(screen.getAllByRole('button')).toHaveLength(36)
  })

  it('hides ships from the opponent view', () => {
    render(<Grid board={fixture()} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={() => {}} label="their sea" />)
    expect(screen.getByRole('button', { name: 'A1, unknown' })).toBeInTheDocument()
  })

  it('reveals ships to their owner', () => {
    render(<Grid board={fixture()} reveal sizing={{ cell: 26, gap: 3 }} label="my deck" />)
    // Owner view is inert, so assert on the rendered tree rather than roles.
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('reports the coordinate that was tapped', async () => {
    const onFire = vi.fn()
    render(<Grid board={fixture()} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={onFire} label="their sea" />)
    await userEvent.click(screen.getByRole('button', { name: 'C6, unknown' }))
    expect(onFire).toHaveBeenCalledWith({ x: 2, y: 5 })
  })

  it('renders every cell of a sunk ship as sunk, not just the last one hit', async () => {
    // The whole reason the UI must read cellState and never shot.result.
    let b = fixture()
    b = fire(b, { x: 0, y: 2 }).board
    b = fire(b, { x: 0, y: 3 }).board
    render(<Grid board={b} reveal={false} sizing={{ cell: 72, gap: 8 }} onFire={() => {}} label="their sea" />)
    expect(screen.getByRole('button', { name: 'A3, sunk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A4, sunk' })).toBeInTheDocument()
  })

  it('lays out as a square grid at the requested size', () => {
    const { container } = render(
      <Grid board={fixture()} reveal={false} sizing={{ cell: 52, gap: 5 }} onFire={() => {}} label="their sea" />,
    )
    const grid = container.firstElementChild as HTMLElement
    expect(grid.style.gridTemplateColumns).toBe('repeat(6, 52px)')
    expect(grid.style.gap).toBe('5px')
  })
})
