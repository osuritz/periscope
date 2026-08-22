import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cellState, type Board } from '../../core/board'
import { allCoords, coordKey, coordLabel, type Coord } from '../../core/coords'
import type { CellSizing } from '../sizing'
import Cell from './Cell'

export type GridProps = {
  board: Board
  /** True for the board's owner, who sees their own ships. */
  reveal: boolean
  sizing: CellSizing
  onFire?: (at: Coord) => void
  disabled?: boolean
  label: string
}

/**
 * Renders a board. Every cell comes from `cellState`, never from the shot log —
 * `fire` marks only a destroyed ship's final cell 'sunk', so reading the log
 * would draw a sunk ship as half-hit.
 */
export default function Grid({ board, reveal, sizing, onFire, disabled, label }: GridProps) {
  const coords = allCoords(board.size)
  const [activeKey, setActiveKey] = useState(() => coordKey(coords[0]!))
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (!coords.some((at) => coordKey(at) === activeKey)) setActiveKey(coordKey(coords[0]!))
  }, [activeKey, coords])

  const focusCell = (at: Coord) => {
    const key = coordKey(at)
    setActiveKey(key)
    cellRefs.current.get(key)?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, at: Coord) => {
    const delta =
      event.key === 'ArrowUp'
        ? { x: 0, y: -1 }
        : event.key === 'ArrowDown'
          ? { x: 0, y: 1 }
          : event.key === 'ArrowLeft'
            ? { x: -1, y: 0 }
            : event.key === 'ArrowRight'
              ? { x: 1, y: 0 }
              : null
    if (!delta) return
    event.preventDefault()
    focusCell({
      x: Math.max(0, Math.min(board.size - 1, at.x + delta.x)),
      y: Math.max(0, Math.min(board.size - 1, at.y + delta.y)),
    })
  }

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${board.size}, ${sizing.cell}px)`,
        gap: `${sizing.gap}px`,
        justifyContent: 'center',
      }}
    >
      {coords.map((at) => {
        const key = coordKey(at)
        return (
          <Cell
            key={key}
            buttonRef={(node) => {
              if (node) cellRefs.current.set(key, node)
              else cellRefs.current.delete(key)
            }}
            state={cellState(board, at, reveal)}
            size={sizing.cell}
            label={coordLabel(at)}
            onFire={onFire ? () => onFire(at) : undefined}
            disabled={disabled}
            tabIndex={onFire && !disabled ? (key === activeKey ? 0 : -1) : undefined}
            onKeyDown={onFire && !disabled ? (event) => handleKeyDown(event, at) : undefined}
          />
        )
      })}
    </div>
  )
}
