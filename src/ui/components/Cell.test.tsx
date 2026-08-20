import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Cell from './Cell'

describe('Cell', () => {
  it('renders no glyph when unknown', () => {
    render(<Cell state="unknown" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button').textContent).toBe('')
  })

  it('renders a distinct glyph for each resolved state', () => {
    const { rerender } = render(<Cell state="miss" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button').textContent).toBe('○')
    rerender(<Cell state="hit" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button').textContent).toBe('✕')
    rerender(<Cell state="sunk" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button').textContent).toBe('☠')
  })

  it('gives sunk a square silhouette and every other state a round one', () => {
    const { rerender } = render(<Cell state="hit" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button').style.borderRadius).toBe('14px')
    rerender(<Cell state="sunk" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button').style.borderRadius).toBe('4px')
  })

  it('names the cell and its state for a screen reader', () => {
    render(<Cell state="hit" size={72} label="C7" onFire={() => {}} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('C7, hit')
  })

  it('fires when tapped', async () => {
    const onFire = vi.fn()
    render(<Cell state="unknown" size={72} label="C7" onFire={onFire} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onFire).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onFire = vi.fn()
    render(<Cell state="unknown" size={72} label="C7" onFire={onFire} disabled />)
    await userEvent.click(screen.getByRole('button'))
    expect(onFire).not.toHaveBeenCalled()
  })

  it('is not a button at all when it has no handler — the deck readout case', () => {
    const { rerender } = render(<Cell state="hit" size={14} label="C7" />)
    expect(screen.queryByRole('button')).toBeNull()
    // Colour alone must never carry state on the deck either: the glyph has
    // to be there even though nothing is clickable.
    expect(screen.getByRole('img', { name: 'C7, hit' }).textContent).toBe('✕')

    rerender(<Cell state="ship" size={14} label="C7" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('img', { name: 'C7, ship' }).textContent).toBe('■')
  })

  it('applies the requested size to both axes', () => {
    render(<Cell state="unknown" size={52} label="C7" onFire={() => {}} />)
    const el = screen.getByRole('button')
    expect(el.style.width).toBe('52px')
    expect(el.style.height).toBe('52px')
  })
})
