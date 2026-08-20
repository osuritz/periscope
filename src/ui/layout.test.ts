import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCompact, useLayout, useViewportHeight } from './layout'
import { installMatchMedia } from '../test/matchMedia'

describe('useLayout', () => {
  it('reports phone on a narrow viewport', () => {
    installMatchMedia(390, 844)
    expect(renderHook(() => useLayout()).result.current).toBe('phone')
  })

  it('reports portrait on a tall tablet', () => {
    installMatchMedia(768, 1024)
    expect(renderHook(() => useLayout()).result.current).toBe('portrait')
  })

  it('reports landscape on a wide tablet', () => {
    installMatchMedia(1024, 768)
    expect(renderHook(() => useLayout()).result.current).toBe('landscape')
  })

  it('treats a desktop viewport as landscape', () => {
    installMatchMedia(1680, 1050)
    expect(renderHook(() => useLayout()).result.current).toBe('landscape')
  })

  it('stays landscape for a phone held sideways — width still decides the arrangement', () => {
    // 844×390: a phone in landscape. Width alone still routes this to the
    // side-by-side `landscape` structure; `useCompact` (below) is what tells
    // the screen this particular landscape needs trimmed chrome.
    installMatchMedia(844, 390)
    expect(renderHook(() => useLayout()).result.current).toBe('landscape')
  })
})

describe('useCompact', () => {
  it('is false at every other required viewport', () => {
    for (const [w, h] of [
      [1024, 768],
      [768, 1024],
      [1133, 744],
      [390, 844],
    ] as const) {
      installMatchMedia(w, h)
      expect(renderHook(() => useCompact()).result.current).toBe(false)
    }
  })

  it('is true on a phone held sideways (844×390)', () => {
    installMatchMedia(844, 390)
    expect(renderHook(() => useCompact()).result.current).toBe(true)
  })
})

describe('useViewportHeight', () => {
  it('reports the installed viewport height', () => {
    installMatchMedia(844, 390)
    expect(renderHook(() => useViewportHeight()).result.current).toBe(390)
  })
})
