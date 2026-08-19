import { fire, isFleetSunk, newBoard, type Board, type ShotResult } from './board'
import type { Coord } from './coords'
import { fleetFor, type BoardMode, type ShipId } from './fleet'
import { randomFleet, withPlacement, type Placement } from './placement'
import type { Rng } from './rng'

export type Phase = 'setup' | 'playing' | 'over'
export type Side = 'player' | 'computer'

export type LastShot = { by: Side; at: Coord; result: ShotResult; shipId?: ShipId }

export type GameState = {
  mode: BoardMode
  size: number
  phase: Phase
  turn: Side
  /** The player's own fleet. Shots recorded here were fired BY the computer. */
  player: Board
  /** The computer's fleet. Shots recorded here were fired BY the player. */
  computer: Board
  winner: Side | null
  lastShot: LastShot | null
}

export function newGame(mode: BoardMode, rng: Rng): GameState {
  return {
    mode,
    size: fleetFor(mode).size,
    phase: 'setup',
    turn: 'player',
    player: newBoard(mode, rng),
    computer: newBoard(mode, rng),
    winner: null,
    lastShot: null,
  }
}

export function shufflePlayerFleet(g: GameState, rng: Rng): GameState {
  if (g.phase !== 'setup') throw new Error('shufflePlayerFleet: not in setup')
  return { ...g, player: { ...g.player, placements: randomFleet(g.mode, rng) } }
}

/** Applies a drag or rotate from the placement screen. Illegal moves are ignored. */
export function movePlayerShip(g: GameState, next: Placement): GameState {
  if (g.phase !== 'setup') throw new Error('movePlayerShip: not in setup')
  const placements = withPlacement(g.player.placements, next, g.size)
  if (!placements) return g
  return { ...g, player: { ...g.player, placements } }
}

/**
 * Leaves setup and begins the game. Guarded: a finished game must not be
 * revived in place. The DIVE AGAIN button on the spec's victory screen must
 * start a NEW game via `newGame` — calling this on an `over` state would
 * otherwise resurrect a fully-fired board with `winner` still set, and the
 * next AI shot would throw out of `untriedCells`.
 */
export function startPlaying(g: GameState): GameState {
  if (g.phase !== 'setup') throw new Error('startPlaying: not in setup')
  return { ...g, phase: 'playing' }
}

/**
 * Applies one shot. A shot lands on the OPPOSING board: the player fires at
 * `computer`, the computer fires at `player`.
 *
 * Turn rule: a hit or sunk keeps the turn, a miss passes it. Firing at an
 * already-fired cell is a no-op that does not consume the turn.
 */
export function applyShot(g: GameState, by: Side, at: Coord): GameState {
  if (g.phase === 'over') throw new Error('applyShot: game is over')
  if (g.phase !== 'playing') throw new Error('applyShot: not playing')
  if (g.turn !== by) throw new Error(`applyShot: not ${by} turn`)

  if (by === 'player') {
    const { board, shot } = fire(g.computer, at)
    if (board === g.computer) return g // already fired here; no turn consumed

    const next: GameState = {
      ...g,
      computer: board,
      lastShot: { by, at, result: shot.result, shipId: shot.shipId },
      turn: shot.result === 'miss' ? 'computer' : 'player',
    }

    if (isFleetSunk(board)) {
      return { ...next, phase: 'over', winner: by, turn: by }
    }
    return next
  }

  const { board, shot } = fire(g.player, at)
  if (board === g.player) return g // already fired here; no turn consumed

  const next: GameState = {
    ...g,
    player: board,
    lastShot: { by, at, result: shot.result, shipId: shot.shipId },
    turn: shot.result === 'miss' ? 'player' : 'computer',
  }

  if (isFleetSunk(board)) {
    return { ...next, phase: 'over', winner: by, turn: by }
  }
  return next
}
