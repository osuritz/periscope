import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TakeoverView from './Takeover'

afterEach(() => vi.useRealTimers())

describe('Takeover', () => {
  it('renders nothing when there is no takeover', () => {
    const { container } = render(<TakeoverView takeover={null} onDismiss={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shouts HIT with the coordinate', () => {
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={() => {}} />)
    expect(screen.getByText('HIT')).toBeInTheDocument()
    expect(screen.getByText(/B4/)).toBeInTheDocument()
  })

  it('shouts MISS', () => {
    render(<TakeoverView takeover={{ result: 'miss', at: { x: 4, y: 6 } }} onDismiss={() => {}} />)
    expect(screen.getByText('MISS')).toBeInTheDocument()
  })

  it('shouts SUNK and names the ship', () => {
    render(<TakeoverView takeover={{ result: 'sunk', at: { x: 0, y: 0 }, shipId: 'tug' }} onDismiss={() => {}} />)
    expect(screen.getByText('SUNK')).toBeInTheDocument()
    expect(screen.getByText(/tug/)).toBeInTheDocument()
  })

  it('auto-advances after 1400ms', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={onDismiss} />)
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(900))
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(500))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('dismisses early when tapped', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('announces the result assertively', () => {
    render(<TakeoverView takeover={{ result: 'hit', at: { x: 1, y: 3 } }} onDismiss={() => {}} />)
    expect(screen.getByRole('alert')).toHaveTextContent('HIT')
  })
})
