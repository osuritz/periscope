import { useEffect, useState } from 'react'

export type LayoutName = 'phone' | 'portrait' | 'landscape'

const PHONE_MAX = 599

function currentLayout(): LayoutName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'portrait'
  if (window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches) return 'phone'
  return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait'
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
