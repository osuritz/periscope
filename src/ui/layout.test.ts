import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLayout } from './layout'
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
})
