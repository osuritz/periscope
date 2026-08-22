import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnnouncementBar, { announcementText } from './AnnouncementBar'

describe('announcementText', () => {
  it('invites the first shot before anything has happened', () => {
    expect(announcementText(null)).toBe('Your turn, captain. Pick a square.')
  })

  it('reads a player hit as the coordinate then the result, naming the ship (the opponent names it on every hit, not just a sink)', () => {
    expect(announcementText({ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'submarine' })).toBe(
      'G3 Kaboom! You hit their submarine.',
    )
  })

  it('reads a player miss', () => {
    expect(announcementText({ by: 'player', at: { x: 4, y: 6 }, result: 'miss' })).toBe(
      'G5 Splash! Water only.',
    )
  })

  it('names the ship on a sink', () => {
    expect(announcementText({ by: 'player', at: { x: 0, y: 0 }, result: 'sunk', shipId: 'tug' })).toBe(
      'A1 Down she goes! You sunk their tug.',
    )
  })

  it('speaks in the second person when the computer fires at you', () => {
    expect(announcementText({ by: 'computer', at: { x: 0, y: 0 }, result: 'hit', shipId: 'tug' })).toBe(
      'A1 They found your tug.',
    )
  })

  it('names the ship in the second person when the computer sinks it', () => {
    expect(announcementText({ by: 'computer', at: { x: 0, y: 0 }, result: 'sunk', shipId: 'tug' })).toBe(
      'A1 Oh no! They sunk your tug.',
    )
  })

  it('reads a computer miss', () => {
    expect(announcementText({ by: 'computer', at: { x: 4, y: 6 }, result: 'miss' })).toBe(
      'G5 They missed! Safe waters.',
    )
  })

  it('uses narrator wording from the same line IDs', () => {
    expect(announcementText({ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'submarine' }, 'narrator')).toBe(
      'G3 You found their submarine.',
    )
  })
})

describe('AnnouncementBar', () => {
  it('shows the current line', () => {
    render(
      <AnnouncementBar
        lastShot={{ by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'submarine' }}
        pack="captain"
      />,
    )
    expect(screen.getByText(/G3 Kaboom! You hit their submarine\./)).toBeInTheDocument()
  })

  it('announces politely rather than interrupting', () => {
    render(<AnnouncementBar lastShot={null} pack="captain" />)
    expect(screen.getByRole('status')).toHaveTextContent('Your turn, captain. Pick a square.')
  })
})
