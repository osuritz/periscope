import { coordLabel } from '../core/coords'
import { fleetFor, type BoardMode, type ShipId } from '../core/fleet'
import type { LastShot } from '../core/game'

export type VoicePack = 'captain' | 'narrator'

export type CoordLineId = `coord.${Lowercase<string>}`
export type ShipLineId = `ship.${ShipId}`
export type ResultLineId =
  | 'result.player.hit'
  | 'result.player.miss'
  | 'result.player.sunk'
  | 'result.computer.hit'
  | 'result.computer.miss'
  | 'result.computer.sunk'
  | 'result.allSunk'
export type TurnLineId = 'turn.yours' | 'turn.mine' | 'turn.thinking'
export type OutcomeLineId = 'game.win' | 'game.lose'
export type EncouragementLineId = `encouragement.${number}`
export type LineId =
  | CoordLineId
  | ShipLineId
  | ResultLineId
  | TurnLineId
  | OutcomeLineId
  | EncouragementLineId

export type Announcement = {
  text: string
  clipIds: LineId[]
}

export type LineText = {
  audio: string
  display: string
}

export const VOICE_PACKS: Record<VoicePack, string> = {
  captain: 'Silly Sea Captain',
  narrator: 'Calm Narrator',
}

export const SHIP_NAMES: Record<ShipId, string> = {
  carrier: 'carrier',
  battleship: 'battleship',
  cruiser: 'cruiser',
  submarine: 'submarine',
  destroyer: 'destroyer',
  patrol: 'patrol boat',
  tug: 'tug',
}

function same(text: string): LineText {
  return { audio: text, display: text }
}

const CAPTAIN_BASE_LINES = {
  'result.player.hit': same('Kaboom! You hit their'),
  'result.player.miss': same('Splash! Water only.'),
  'result.player.sunk': same('Down she goes! You sunk their'),
  'result.computer.hit': same('They found your'),
  'result.computer.miss': same('They missed! Safe waters.'),
  'result.computer.sunk': same('Oh no! They sunk your'),
  'result.allSunk': same('All ships sunk!'),
  'turn.yours': same('Your turn, captain. Pick a square.'),
  'turn.mine': same('The computer is taking aim.'),
  'turn.thinking': same('Periscope is sweeping the sea.'),
  'game.win': same('You did it! The fleet is safe!'),
  'game.lose': same('Good try, captain. Ready to dive again?'),
  'encouragement.1': same('Steady as she goes.'),
  'encouragement.2': same('Sharp eyes, captain.'),
  'encouragement.3': same('The sea is full of secrets.'),
} satisfies Partial<Record<LineId, LineText>>

const NARRATOR_BASE_LINES = {
  'result.player.hit': same('You found their'),
  'result.player.miss': same('Miss.'),
  'result.player.sunk': same('You sunk their'),
  'result.computer.hit': same('They found your'),
  'result.computer.miss': same('They missed.'),
  'result.computer.sunk': same('They sunk your'),
  'result.allSunk': same('All ships are sunk.'),
  'turn.yours': same('Your turn. Choose a square.'),
  'turn.mine': same('The computer is choosing.'),
  'turn.thinking': same('Looking carefully.'),
  'game.win': same('You won.'),
  'game.lose': same('Game over. Try again when you are ready.'),
  'encouragement.1': same('Take your time.'),
  'encouragement.2': same('Good looking.'),
  'encouragement.3': same('Keep searching.'),
} satisfies Partial<Record<LineId, LineText>>

const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function coordText(label: string): LineText {
  const letter = label[0]
  const number = NUMBER_WORDS[Number(label.slice(1)) - 1] ?? label.slice(1)
  return { audio: `${letter}, ${number}.`, display: label }
}

function coordLineIdFromLabel(label: string): CoordLineId {
  return `coord.${label.toLowerCase()}` as CoordLineId
}

function buildLines(base: Partial<Record<LineId, LineText>>): Record<LineId, LineText> {
  const entries: [LineId, LineText][] = []

  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      const label = coordLabel({ x, y })
      entries.push([coordLineIdFromLabel(label), coordText(label)])
    }
  }

  const shipIds = new Set<ShipId>()
  for (const mode of ['little', 'admiral'] satisfies BoardMode[]) {
    for (const ship of fleetFor(mode).ships) shipIds.add(ship.id)
  }
  for (const shipId of shipIds) {
    const ship = SHIP_NAMES[shipId] ?? shipId
    entries.push([`ship.${shipId}`, { audio: `${ship}.`, display: `${ship}.` }])
  }

  for (const [id, text] of Object.entries(base) as [LineId, LineText][]) {
    entries.push([id, text])
  }

  return Object.fromEntries(entries) as Record<LineId, LineText>
}

export const AUDIO_LINES: Record<VoicePack, Record<LineId, LineText>> = {
  captain: buildLines(CAPTAIN_BASE_LINES),
  narrator: buildLines(NARRATOR_BASE_LINES),
}

export function allLineIds(pack: VoicePack): LineId[] {
  return Object.keys(AUDIO_LINES[pack]).sort() as LineId[]
}

export function line(pack: VoicePack, lineId: LineId): string {
  const text = AUDIO_LINES[pack][lineId]?.display
  if (!text) throw new Error(`Missing ${pack} audio line: ${lineId}`)
  return text
}

export function audioLine(pack: VoicePack, lineId: LineId): string {
  const text = AUDIO_LINES[pack][lineId]?.audio
  if (!text) throw new Error(`Missing ${pack} audio line: ${lineId}`)
  return text
}

export function coordLineId(at: LastShot['at']): CoordLineId {
  return coordLineIdFromLabel(coordLabel(at))
}

export function shipLineId(shipId: ShipId): ShipLineId {
  return `ship.${shipId}`
}

export function resultLineId(lastShot: LastShot): ResultLineId {
  if (lastShot.result === 'miss') {
    return lastShot.by === 'player' ? 'result.player.miss' : 'result.computer.miss'
  }
  if (lastShot.result === 'sunk') {
    return lastShot.by === 'player' ? 'result.player.sunk' : 'result.computer.sunk'
  }
  return lastShot.by === 'player' ? 'result.player.hit' : 'result.computer.hit'
}

export function announcementFor(pack: VoicePack, lastShot: LastShot | null): Announcement {
  if (!lastShot) {
    return { text: line(pack, 'turn.yours'), clipIds: ['turn.yours'] }
  }

  const ids: LineId[] = [coordLineId(lastShot.at), resultLineId(lastShot)]
  if (lastShot.shipId) ids.push(shipLineId(lastShot.shipId))

  const text = ids.map((id) => line(pack, id)).join(' ')
  return { text, clipIds: ids }
}

export function audioPath(pack: VoicePack, lineId: LineId): string {
  return `/audio/${pack}/${lineId}.wav`
}

export function preloadLineIdsForMode(mode: BoardMode): LineId[] {
  const ids = new Set<LineId>()
  for (let y = 0; y < fleetFor(mode).size; y += 1) {
    for (let x = 0; x < fleetFor(mode).size; x += 1) ids.add(coordLineId({ x, y }))
  }
  for (const id of allLineIds('captain')) {
    if (!id.startsWith('coord.')) ids.add(id)
  }
  return [...ids].sort()
}
