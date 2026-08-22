import { create } from 'zustand'
import { alreadyFired, type ShotResult } from '../../core/board'
import { inBounds, type Coord } from '../../core/coords'
import type { BoardMode, ShipId } from '../../core/fleet'
import {
  applyShot,
  movePlayerShip,
  newGame,
  shufflePlayerFleet,
  startPlaying,
  type GameState,
} from '../../core/game'
import { rotated, type Placement } from '../../core/placement'
import { systemRng } from '../../core/rng'
import { computerShot } from '../../ai/index'
import type { Tier } from '../../ai/types'

export type Takeover = { result: ShotResult; at: Coord; shipId?: ShipId } | null
export type ShellScreen = 'title' | 'play'
export type VoicePack = 'captain' | 'narrator'

type GameStore = {
  game: GameState
  screen: ShellScreen
  mode: BoardMode
  tier: Tier
  takeover: Takeover
  reduceMotion: boolean
  volume: boolean
  speakEveryMove: boolean
  voicePack: VoicePack
  settingsOpen: boolean

  chooseMode: (mode: BoardMode) => void
  chooseTier: (tier: Tier) => void
  openSettings: () => void
  closeSettings: () => void
  home: () => void
  dive: () => void
  ready: () => void
  shuffleFleet: () => void
  moveShip: (next: Placement) => void
  rotateShip: (shipId: ShipId) => void
  restart: (mode?: BoardMode, tier?: Tier) => void
  /** True when a tap on `at` would be a legal player shot right now. */
  canFire: (at: Coord) => boolean
  fireAt: (at: Coord) => void
  takeComputerTurn: () => void
  dismissTakeover: () => void
  setReduceMotion: (v: boolean) => void
  setVolume: (v: boolean) => void
  setSpeakEveryMove: (v: boolean) => void
  setVoicePack: (pack: VoicePack) => void
}

function freshGame(mode: BoardMode): GameState {
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
  screen: 'title',
  mode: 'little',
  tier: 'rookie',
  takeover: null,
  reduceMotion: false,
  volume: true,
  speakEveryMove: true,
  voicePack: 'captain',
  settingsOpen: false,

  chooseMode: (mode) => set({ mode }),
  chooseTier: (tier) => set({ tier }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  home: () => set({ screen: 'title', takeover: null }),

  dive: () => {
    const { mode } = get()
    set({ screen: 'play', game: newGame(mode, systemRng), takeover: null })
  },

  ready: () => {
    const { game } = get()
    if (game.phase !== 'setup') return
    set({ game: startPlaying(game), takeover: null })
  },

  shuffleFleet: () => {
    const { game } = get()
    if (game.phase !== 'setup') return
    set({ game: shufflePlayerFleet(game, systemRng), takeover: null })
  },

  moveShip: (next) => {
    const { game } = get()
    if (game.phase !== 'setup') return
    const moved = movePlayerShip(game, next)
    if (moved !== game) set({ game: moved })
  },

  rotateShip: (shipId) => {
    const { game } = get()
    if (game.phase !== 'setup') return
    const placement = game.player.placements.find((p) => p.shipId === shipId)
    if (!placement) return
    const moved = movePlayerShip(game, rotated(placement))
    if (moved !== game) set({ game: moved })
  },

  restart: (mode, tier) => {
    const nextMode = mode ?? get().mode
    set({
      screen: 'play',
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
  setVolume: (v) => set({ volume: v }),
  setSpeakEveryMove: (v) => set({ speakEveryMove: v }),
  setVoicePack: (pack) => set({ voicePack: pack }),
}))
