import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LastShotChip from './LastShotChip'

describe('LastShotChip', () => {
  it('renders nothing before the first shot', () => {
    const { container } = render(<LastShotChip lastShot={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the coordinate and marks a hit', () => {
    render(<LastShotChip lastShot={{ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'sub' }} />)
    expect(screen.getByText(/C7/)).toBeInTheDocument()
    expect(screen.getByText(/✕/)).toBeInTheDocument()
  })

  it('marks a miss with the miss glyph', () => {
    render(<LastShotChip lastShot={{ by: 'player', at: { x: 4, y: 6 }, result: 'miss' }} />)
    expect(screen.getByText(/○/)).toBeInTheDocument()
  })

  it('marks a sunk ship with the sunk glyph', () => {
    render(<LastShotChip lastShot={{ by: 'player', at: { x: 0, y: 0 }, result: 'sunk', shipId: 'tug' }} />)
    expect(screen.getByText(/☠/)).toBeInTheDocument()
  })
})
