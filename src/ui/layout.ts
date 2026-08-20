import { useEffect, useState } from 'react'

export type LayoutName = 'phone' | 'portrait' | 'landscape'

const PHONE_MAX = 599

/**
 * Below this viewport height, a phone held sideways (e.g. 844×390) genuinely
 * has no room for full-size chrome, regardless of how wide it is. `landscape`
 * width-wise still stacks the scope/deck side by side — that arrangement is
 * still the right one for a wide-short viewport — but `compact` tells the
 * screen to trim its chrome and shrink the scope's cells so the whole board
 * and its fleet footer fit without clipping or scrolling.
 */
const COMPACT_MAX_HEIGHT = 560

function currentLayout(): LayoutName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'portrait'
  if (window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches) return 'phone'
  return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait'
}

function currentlyCompact(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(`(max-height: ${COMPACT_MAX_HEIGHT}px)`).matches
}

/**
 * Which of the three layouts to render. Phone wins on width alone; above that,
 * orientation decides. The scope/deck asymmetry is identical in all three —
 * only the axis they stack on changes.
 */
export function useLayout(): LayoutName {
  const [layout, setLayout] = useState<LayoutName>(currentLayout)

  useEffect(() => {
    const update = () => setLayout(currentLayout())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return layout
}

/**
 * True on a short viewport (see `COMPACT_MAX_HEIGHT`) — orthogonal to
 * `layout`, since a landscape tablet and a landscape phone want the same
 * side-by-side structure but very different chrome and cell sizes.
 */
export function useCompact(): boolean {
  const [compact, setCompact] = useState<boolean>(currentlyCompact)

  useEffect(() => {
    const update = () => setCompact(currentlyCompact())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return compact
}

function currentViewportHeight(): number {
  return typeof window === 'undefined' ? 0 : window.innerHeight
}

/**
 * The raw viewport height in px, live-updated. Used only to size the scope
 * grid's cells to the room actually available for them (see `scopeSizing`'s
 * `fit` argument) — `useCompact` answers "is this short," this answers "how
 * short, exactly."
 */
export function useViewportHeight(): number {
  const [height, setHeight] = useState<number>(currentViewportHeight)

  useEffect(() => {
    const update = () => setHeight(currentViewportHeight())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return height
}
