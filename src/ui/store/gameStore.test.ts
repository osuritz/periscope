import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'
import { allCoords } from '../../core/coords'
import { cellState } from '../../core/board'

const s = () => useGameStore.getState()

/** First cell of the computer's fleet — a guaranteed hit. */
function aShipCell() {
  const p = s().game.computer.placements[0]!
  return p.origin
}

/** A cell with no ship on it — a guaranteed miss. */
function anEmptyCell() {
  const g = s().game
  return allCoords(g.size).find((c) => cellState(g.computer, c, true) === 'unknown')!
}

describe('gameStore', () => {
  beforeEach(() => s().restart('little', 'rookie'))

  it('starts a playable game with the player to move', () => {
    expect(s().game.phase).toBe('playing')
    expect(s().game.turn).toBe('player')
    expect(s().game.player.placements).toHaveLength(3)
  })

  it('passes the turn after a hit', () => {
    s().fireAt(aShipCell())
    expect(s().game.lastShot?.result).not.toBe('miss')
    expect(s().game.turn).toBe('computer')
  })

  it('hands the turn over after a miss', () => {
    s().fireAt(anEmptyCell())
    expect(s().game.turn).toBe('computer')
  })

  it('ignores a tap during the computer turn instead of throwing', () => {
    s().fireAt(anEmptyCell())
    expect(s().game.turn).toBe('computer')
    const before = s().game
    expect(() => s().fireAt(anEmptyCell())).not.toThrow()
    expect(s().game).toBe(before)
  })

  it('ignores a repeat tap on an already-fired cell', () => {
    // Force the turn back after the hit, the way the isolation test below
    // does: otherwise the turn guard is what makes the second tap inert and
    // this says nothing about double-tap protection at all.
    const hit = aShipCell()
    s().fireAt(hit)
    useGameStore.setState({ game: { ...s().game, turn: 'player' } })

    // Compared on the whole store, not just `game`: the engine returns the
    // same `game` reference for a repeat shot either way, so `game` alone
    // stays identical even with the guard gone — it is the takeover this
    // would raise a second time that gives the missing guard away.
    const before = useGameStore.getState()
    s().fireAt(hit)
    expect(useGameStore.getState()).toBe(before)
  })

  it('reports canFire false for an already-fired cell, isolated from turn and phase', () => {
    // A hit now passes the turn away, so force it back to 'player' after
    // firing — unlike the miss-based canFire test below, this isolates the
    // alreadyFired guard itself as the reason for the false, rather than the
    // turn guard.
    const hit = aShipCell()
    s().fireAt(hit)
    useGameStore.setState({ game: { ...s().game, turn: 'player' } })
    expect(s().game.turn).toBe('player')
    expect(s().game.phase).toBe('playing')
    expect(s().canFire(hit)).toBe(false)
  })

  it('reports canFire honestly', () => {
    const at = anEmptyCell()
    expect(s().canFire(at)).toBe(true)
    s().fireAt(at)
    expect(s().canFire(at)).toBe(false)
    expect(s().canFire({ x: -1, y: 0 })).toBe(false)
  })

  it('raises a takeover for the player shot and clears it on dismiss', () => {
    s().fireAt(aShipCell())
    expect(s().takeover).not.toBeNull()
    s().dismissTakeover()
    expect(s().takeover).toBeNull()
  })

  it('raises no takeover when reduce motion is on', () => {
    s().setReduceMotion(true)
    s().fireAt(aShipCell())
    expect(s().takeover).toBeNull()
  })

  it('lets the computer take its turn and never throws doing so', () => {
    s().fireAt(anEmptyCell())
    expect(s().game.turn).toBe('computer')
    expect(() => s().takeComputerTurn()).not.toThrow()
    expect(s().game.player.shots.length).toBeGreaterThan(0)
  })

  it('ignores takeComputerTurn when it is not the computer turn', () => {
    const before = s().game
    s().takeComputerTurn()
    expect(s().game).toBe(before)
  })

  it('plays a whole game to a winner without throwing', () => {
    let guard = 0
    while (s().game.phase === 'playing' && guard++ < 500) {
      if (s().game.turn === 'player') {
        const open = allCoords(s().game.size).filter((c) => s().canFire(c))
        s().fireAt(open[0]!)
      } else {
        s().takeComputerTurn()
      }
    }
    expect(s().game.phase).toBe('over')
    expect(s().game.winner).not.toBeNull()
  })

  it('restart produces a fresh game rather than resuming a finished one', () => {
    s().fireAt(anEmptyCell())
    s().restart()
    expect(s().game.phase).toBe('playing')
    expect(s().game.computer.shots).toHaveLength(0)
    expect(s().game.player.shots).toHaveLength(0)
  })
})
