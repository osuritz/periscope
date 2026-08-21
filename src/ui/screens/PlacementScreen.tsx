import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { allCoords, coordKey, coordLabel, type Coord } from '../../core/coords'
import { canPlace, placementCells, type Placement } from '../../core/placement'
import { useCompact, useLayout } from '../layout'
import { deckSizing, scopeSizing } from '../sizing'
import { useGameStore } from '../store/gameStore'

function shipAt(placements: readonly Placement[], at: Coord): Placement | undefined {
  return placements.find((p) => placementCells(p).some((c) => c.x === at.x && c.y === at.y))
}

function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y
}

export default function PlacementScreen() {
  const layout = useLayout()
  const compact = useCompact()
  const game = useGameStore((s) => s.game)
  const shuffleFleet = useGameStore((s) => s.shuffleFleet)
  const moveShip = useGameStore((s) => s.moveShip)
  const rotateShip = useGameStore((s) => s.rotateShip)
  const ready = useGameStore((s) => s.ready)
  const draggedShip = useRef<string | null>(null)
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const [focusCoord, setFocusCoord] = useState<Coord | null>(null)
  const sizing = layout === 'phone' ? deckSizing(layout, game.mode) : scopeSizing(layout, game.mode)

  useEffect(() => {
    if (!focusCoord) return
    const button = cellRefs.current.get(coordKey(focusCoord))
    button?.focus()
  }, [focusCoord, game.player.placements])

  const moveDraggedShip = (origin: Coord) => {
    const shipId = draggedShip.current
    if (!shipId) return
    const placement = game.player.placements.find((p) => p.shipId === shipId)
    if (!placement) return
    moveShip({ ...placement, origin })
  }

  const moveShipByKeyboard = (placement: Placement, delta: Coord) => {
    const nextOrigin = { x: placement.origin.x + delta.x, y: placement.origin.y + delta.y }
    const next = { ...placement, origin: nextOrigin }
    if (!canPlace(next, game.size, game.player.placements)) return
    moveShip({ ...placement, origin: nextOrigin })
    setFocusCoord(nextOrigin)
  }

  const handleShipKeyDown = (event: KeyboardEvent<HTMLButtonElement>, placement: Placement) => {
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault()
      rotateShip(placement.shipId)
      setFocusCoord(placement.origin)
      return
    }

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
    moveShipByKeyboard(placement, delta)
  }

  return (
    <main
      style={{
        minHeight: '100%',
        boxSizing: 'border-box',
        padding: compact ? 10 : 22,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        gap: compact ? 10 : 18,
        background: 'var(--hull)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 32 : 52,
            color: 'var(--scope)',
          }}
        >
          MY DECK
        </h1>
        <button
          type="button"
          aria-label="shuffle ships"
          onClick={shuffleFleet}
          style={{
            marginLeft: 'auto',
            width: compact ? 92 : 196,
            height: compact ? 72 : 196,
            borderRadius: 8,
            border: 'none',
            background: 'var(--amber)',
            color: 'var(--on-amber)',
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 38 : 86,
            cursor: 'pointer',
          }}
        >
          ⚂
        </button>
      </header>

      <section
        style={{
          minHeight: 0,
          borderRadius: 8,
          border: '5px solid var(--scope)',
          background: 'var(--panel)',
          padding: compact ? 8 : 20,
          display: 'grid',
          alignContent: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        <div
          role="group"
          aria-label="place my ships"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${game.size}, ${sizing.cell}px)`,
            gap: sizing.gap,
          }}
        >
          {allCoords(game.size).map((at) => {
            const ship = shipAt(game.player.placements, at)
            const key = coordKey(at)
            const isShipOrigin = Boolean(ship && sameCoord(ship.origin, at))
            return (
              <button
                key={key}
                ref={(node) => {
                  if (node) cellRefs.current.set(key, node)
                  else cellRefs.current.delete(key)
                }}
                type="button"
                draggable={Boolean(ship)}
                tabIndex={isShipOrigin ? 0 : -1}
                aria-keyshortcuts={isShipOrigin ? 'ArrowUp ArrowDown ArrowLeft ArrowRight Enter Space R' : undefined}
                aria-label={`${coordLabel(at)}, ${ship ? ship.shipId : 'open'}`}
                onDragStart={() => {
                  draggedShip.current = ship?.shipId ?? null
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  moveDraggedShip(at)
                }}
                onClick={() => {
                  if (ship) rotateShip(ship.shipId)
                }}
                onKeyDown={(event) => {
                  if (ship && isShipOrigin) handleShipKeyDown(event, ship)
                }}
                onTouchStart={(event) => {
                  if (ship && event.touches.length >= 2) rotateShip(ship.shipId)
                }}
                style={{
                  width: sizing.cell,
                  height: sizing.cell,
                  borderRadius: ship ? 8 : 14,
                  border: `3px solid ${ship ? 'var(--scope)' : 'var(--line)'}`,
                  background: ship ? 'var(--scope)' : 'var(--hull)',
                  color: ship ? 'var(--on-scope)' : 'var(--ink-2)',
                  boxSizing: 'border-box',
                  boxShadow: ship ? undefined : 'inset 0 0 0 8px rgba(0,0,0,.25)',
                  fontSize: Math.round(sizing.cell * 0.48),
                  fontWeight: 900,
                  lineHeight: 1,
                  cursor: ship ? 'grab' : 'pointer',
                }}
              >
                {ship ? '■' : ''}
              </button>
            )
          })}
        </div>
      </section>

      <footer style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <div
          style={{
            minHeight: 58,
            borderRadius: 8,
            border: '3px dashed var(--muted)',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            fontWeight: 700,
            padding: '0 14px',
            boxSizing: 'border-box',
          }}
        >
          Drag ships. Tap a ship to turn it.
        </div>
        <button
          type="button"
          onClick={ready}
          style={{
            height: 130,
            borderRadius: 8,
            border: 'none',
            background: 'var(--scope)',
            color: 'var(--on-scope)',
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 48 : 72,
            cursor: 'pointer',
          }}
        >
          READY
        </button>
      </footer>
    </main>
  )
}
