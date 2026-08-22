import type { CSSProperties, KeyboardEventHandler, Ref } from 'react'
import type { CellState } from '../../core/board'

export type CellProps = {
  state: CellState
  size: number
  /** Coordinate label, e.g. "C7". Announced to screen readers. */
  label: string
  onFire?: () => void
  disabled?: boolean
  tabIndex?: number
  buttonRef?: Ref<HTMLButtonElement>
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
}

/**
 * Spec §5.3. States differ by glyph AND border-radius, never by colour alone,
 * so the board stays readable in grayscale and to a colourblind player. Sunk
 * going square is a silhouette change and is required.
 */
const GLYPH: Record<CellState, string> = {
  unknown: '',
  miss: '○',
  hit: '✕',
  sunk: '☠',
  ship: '■',
}

const FILL: Record<CellState, string> = {
  unknown: 'var(--panel)',
  miss: 'var(--hull)',
  hit: 'var(--amber)',
  sunk: 'var(--sunk)',
  ship: 'var(--scope)',
}

const BORDER: Record<CellState, string> = {
  unknown: 'var(--line)',
  miss: 'var(--muted)',
  hit: 'var(--amber-edge)',
  sunk: 'var(--sunk-edge)',
  ship: 'var(--scope)',
}

const INK: Record<CellState, string> = {
  unknown: 'transparent',
  miss: 'var(--ink-2)',
  hit: 'var(--on-amber)',
  sunk: 'var(--on-sunk)',
  ship: 'var(--on-scope)',
}

export default function Cell({ state, size, label, onFire, disabled, tabIndex, buttonRef, onKeyDown }: CellProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: state === 'sunk' ? 4 : 14,
    background: FILL[state],
    border: `3px solid ${BORDER[state]}`,
    color: INK[state],
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.round(size * 0.6),
    fontWeight: 900,
    lineHeight: 1,
    padding: 0,
    // Unlit depth on untouched water (spec §5.3).
    boxShadow: state === 'unknown' ? 'inset 0 0 0 8px rgba(0,0,0,.25)' : undefined,
  }

  // No handler means this is the own-deck readout: inert and not a tab stop,
  // but still perceivable — same glyph and accessible name as the button, so
  // state is never colour-alone here either (spec §5.3).
  if (!onFire) {
    return (
      <div style={style} role="img" aria-label={`${label}, ${state}`}>
        {GLYPH[state]}
      </div>
    )
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      style={{ ...style, appearance: 'none', WebkitAppearance: 'none' }}
      onClick={onFire}
      onKeyDown={onKeyDown}
      disabled={disabled}
      tabIndex={tabIndex}
      aria-label={`${label}, ${state}`}
    >
      {GLYPH[state]}
    </button>
  )
}
