import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TurnBar from './TurnBar'

describe('TurnBar', () => {
  it('says YOU FIRE on the player turn', () => {
    render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    expect(screen.getByText('YOU FIRE')).toBeInTheDocument()
  })

  it('says THEIR TURN on the computer turn', () => {
    render(<TurnBar turn="computer" phase="playing" layout="portrait" />)
    expect(screen.getByText('THEIR TURN')).toBeInTheDocument()
  })

  it('goes amber on the player turn and panel-coloured otherwise', () => {
    const { rerender, container } = render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    const bar = () => container.firstElementChild as HTMLElement
    expect(bar().style.background).toBe('var(--amber)')
    rerender(<TurnBar turn="computer" phase="playing" layout="portrait" />)
    expect(bar().style.background).toBe('var(--panel)')
  })

  it('is shorter on a phone', () => {
    const { container, rerender } = render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    const bar = () => container.firstElementChild as HTMLElement
    expect(bar().style.height).toBe('92px')
    rerender(<TurnBar turn="player" phase="playing" layout="phone" />)
    expect(bar().style.height).toBe('74px')
  })

  it('announces the turn politely for assistive tech', () => {
    render(<TurnBar turn="player" phase="playing" layout="portrait" />)
    expect(screen.getByRole('status')).toHaveTextContent('YOU FIRE')
  })

  it('reports the outcome once the game is over', () => {
    render(<TurnBar turn="player" phase="over" layout="portrait" />)
    expect(screen.getByText('GAME OVER')).toBeInTheDocument()
  })
})
