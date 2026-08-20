import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnnouncementBar, { announcementText } from './AnnouncementBar'

describe('announcementText', () => {
  it('invites the first shot before anything has happened', () => {
    expect(announcementText(null)).toBe('Tap a square to fire!')
  })

  it('reads a player hit as the coordinate then the result', () => {
    expect(announcementText({ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'sub' })).toBe(
      'C7… HIT!',
    )
  })

  it('reads a player miss', () => {
    expect(announcementText({ by: 'player', at: { x: 4, y: 6 }, result: 'miss' })).toBe('E7… miss.')
  })

  it('names the ship on a sink', () => {
    expect(announcementText({ by: 'player', at: { x: 0, y: 0 }, result: 'sunk', shipId: 'tug' })).toBe(
      'A1… you sank their tug!',
    )
  })

  it('speaks in the second person when the computer fires at you', () => {
    expect(announcementText({ by: 'computer', at: { x: 0, y: 0 }, result: 'hit', shipId: 'tug' })).toBe(
      'A1… they hit your tug!',
    )
  })
})

describe('AnnouncementBar', () => {
  it('shows the current line', () => {
    render(<AnnouncementBar lastShot={{ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'sub' }} />)
    expect(screen.getByText(/C7… HIT!/)).toBeInTheDocument()
  })

  it('announces politely rather than interrupting', () => {
    render(<AnnouncementBar lastShot={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('Tap a square to fire!')
  })
})
