import { create } from 'zustand'
import { alreadyFired, type ShotResult } from '../../core/board'
import { inBounds, type Coord } from '../../core/coords'
import type { BoardMode, ShipId } from '../../core/fleet'
import { applyShot, newGame, startPlaying, type GameState } from '../../core/game'
import { systemRng } from '../../core/rng'
import { computerShot } from '../../ai/index'
import type { Tier } from '../../ai/types'

export type Takeover = { result: ShotResult; at: Coord; shipId?: ShipId } | null

type GameStore = {
  game: GameState
  mode: BoardMode
  tier: Tier
  takeover: Takeover
  reduceMotion: boolean

  restart: (mode?: BoardMode, tier?: Tier) => void
  /** True when a tap on `at` would be a legal player shot right now. */
  canFire: (at: Coord) => boolean
  fireAt: (at: Coord) => void
  takeComputerTurn: () => void
  dismissTakeover: () => void
  setReduceMotion: (v: boolean) => void
}

function freshGame(mode: BoardMode): GameState {
  // Ships are auto-placed. Plan 3 adds the placement screen.
  return startPlaying(newGame(mode, systemRng))
}

/**
 * The only module in the UI that talks to the engine.
 *
 * Every engine call the engine can throw on is guarded here instead, because
 * the caller is a five-year-old: a tap during the computer's turn, a second tap
 * on the same square, or a tap after the game ends must all be quietly inert,
 * never an exception that white-screens the app.
 */
export const useGameStore = create<GameStore>((set, get) => ({
  game: freshGame('little'),
  mode: 'little',
  tier: 'rookie',
  takeover: null,
  reduceMotion: false,

  restart: (mode, tier) => {
    const nextMode = mode ?? get().mode
    set({
      mode: nextMode,
      tier: tier ?? get().tier,
      game: freshGame(nextMode),
      takeover: null,
    })
  },

  canFire: (at) => {
    const { game } = get()
    if (game.phase !== 'playing' || game.turn !== 'player') return false
    if (!inBounds(at, game.size)) return false
    return !alreadyFired(game.computer, at)
  },

  fireAt: (at) => {
    if (!get().canFire(at)) return
    const next = applyShot(get().game, 'player', at)
    const shot = next.lastShot
    set({
      game: next,
      takeover:
        get().reduceMotion || !shot
          ? null
          : { result: shot.result, at: shot.at, shipId: shot.shipId },
    })
  },

  takeComputerTurn: () => {
    const { game, tier } = get()
    if (game.phase !== 'playing' || game.turn !== 'computer') return
    set({ game: computerShot(game, tier, systemRng) })
  },

  dismissTakeover: () => set({ takeover: null }),

  setReduceMotion: (v) => set({ reduceMotion: v }),
}))
