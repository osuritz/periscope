import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

/**
 * Lets `userEvent` coexist with `vi.useFakeTimers()`.
 *
 * `@testing-library/react`'s `asyncWrapper` drains the microtask queue after
 * every `userEvent` call by racing a `setTimeout(…, 0)` against an
 * auto-advance, but it only recognizes Jest's fake timers (it checks for a
 * global `jest` and a `.clock` marker on `setTimeout`) — under Vitest's fake
 * timers that check is false, the `setTimeout` it scheduled is itself faked,
 * and nothing ever advances it, so any `await user.click(...)` etc. hangs
 * forever. Vitest's faked `setTimeout` still carries that `.clock` marker for
 * exactly this kind of sinon-style compatibility check, so a minimal `jest`
 * shim is enough to make the existing check pass and call through to Vitest's
 * own timer advance.
 */
;(globalThis as { jest?: { advanceTimersByTime: (ms: number) => void } }).jest = {
  advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms),
}

Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn(() => Promise.resolve()),
})
