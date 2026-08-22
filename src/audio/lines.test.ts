import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  allLineIds,
  announcementFor,
  audioLine,
  audioPath,
  coordLineId,
  line,
  preloadLineIdsForMode,
  type LineId,
  type VoicePack,
} from './lines'

const PACKS: VoicePack[] = ['captain', 'narrator']

type ManifestEntry = {
  pack: VoicePack
  line_id: LineId
  text: string
  display: string
  duration: number
  path: string
}

function manifest(): ManifestEntry[] {
  return JSON.parse(readFileSync(join(process.cwd(), 'public/audio/manifest.json'), 'utf8')) as ManifestEntry[]
}

describe('audio lines', () => {
  it('uses Hasbro row-letter/column-number coordinate keys', () => {
    expect(coordLineId({ x: 2, y: 6 })).toBe('coord.g3')
    expect(line('captain', 'coord.g3')).toBe('G3')
    expect(audioLine('captain', 'coord.g3')).toBe('G, three.')
  })

  it('assembles announcements from line IDs and names ships on every hit', () => {
    expect(announcementFor('captain', { by: 'player', at: { x: 2, y: 6 }, result: 'hit', shipId: 'cruiser' })).toEqual({
      text: 'G3 Kaboom! You hit their cruiser.',
      clipIds: ['coord.g3', 'result.player.hit', 'ship.cruiser'],
    })
  })

  it('preloads only mode coordinates plus shared result clips', () => {
    const little = preloadLineIdsForMode('little').filter((id) => id.startsWith('coord.'))
    expect(little).toHaveLength(36)
    expect(little).toContain('coord.a1')
    expect(little).toContain('coord.f6')
    expect(little).not.toContain('coord.g1')
  })

  it('has committed audio for every line in every pack', () => {
    const entries = manifest()
    for (const pack of PACKS) {
      const manifestIds = new Set(entries.filter((entry) => entry.pack === pack).map((entry) => entry.line_id))
      for (const lineId of allLineIds(pack)) {
        expect(manifestIds.has(lineId), `${pack}/${lineId} missing from manifest`).toBe(true)
        expect(existsSync(join(process.cwd(), 'public', audioPath(pack, lineId))), `${pack}/${lineId} file missing`).toBe(
          true,
        )
      }
    }
  })

  it('keeps manifest text in sync with the source line table', () => {
    for (const entry of manifest()) {
      expect(entry.text).toBe(audioLine(entry.pack, entry.line_id))
      expect(entry.display).toBe(line(entry.pack, entry.line_id))
      expect(entry.duration).toBeGreaterThan(0)
    }
  })
})
