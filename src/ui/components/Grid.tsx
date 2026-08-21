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
      {allCoords(board.size).map((at) => (
        <Cell
          key={coordKey(at)}
          state={cellState(board, at, reveal)}
          size={sizing.cell}
          label={coordLabel(at)}
          onFire={onFire ? () => onFire(at) : undefined}
          disabled={disabled}
        />
      ))}
    </div>
  )
}
