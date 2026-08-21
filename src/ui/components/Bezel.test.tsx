import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Bezel from './Bezel'

describe('Bezel', () => {
  it('paints an amber frame when active', () => {
    const { container } = render(<Bezel active layout="portrait"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.boxShadow).toBe('inset 0 0 0 12px var(--amber)')
  })

  it('paints nothing when inactive', () => {
    const { container } = render(<Bezel active={false} layout="portrait"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.boxShadow).toBe('')
  })

  it('is 8px on a phone', () => {
    const { container } = render(<Bezel active layout="phone"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.boxShadow).toBe('inset 0 0 0 8px var(--amber)')
  })

  it('renders its children', () => {
    render(<Bezel active layout="portrait"><p>hi</p></Bezel>)
    expect(screen.getByText('hi')).toBeInTheDocument()
  })

  it('does not intercept taps', () => {
    const { container } = render(<Bezel active layout="portrait"><p>hi</p></Bezel>)
    const frame = container.querySelector('[data-bezel]') as HTMLElement
    expect(frame.style.pointerEvents).toBe('none')
  })
})
