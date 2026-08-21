import type { ReactNode } from 'react'
import type { LayoutName } from '../layout'
import { bezelWidth } from '../sizing'

export type BezelProps = { active: boolean; layout: LayoutName; children: ReactNode }

/**
 * Spec §5.4 — the single most important visual rule in the system. When it is
 * the child's turn the ENTIRE viewport is framed in amber. Not a badge, not a
 * label: a frame readable from across a room.
 */
export default function Bezel({ active, layout, children }: BezelProps) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      <div
        data-bezel
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow: active ? `inset 0 0 0 ${bezelWidth(layout)}px var(--amber)` : undefined,
          transition: 'box-shadow 180ms ease',
        }}
      />
    </div>
  )
}
