import { afterEach, describe, expect, it, vi } from 'vitest'
import { playAnnouncement, preloadAudio, stopAnnouncements } from './player'

const sources: string[] = []
const preloads: string[] = []

class FakeAudio extends EventTarget {
  private srcValue: string
  private preloadValue = ''

  constructor(src: string) {
    super()
    this.srcValue = src
    sources.push(src)
  }

  set preload(value: string) {
    this.preloadValue = value
    if (value) preloads.push(this.srcValue)
  }

  get preload(): string {
    return this.preloadValue
  }

  play(): Promise<void> {
    this.dispatchEvent(new Event('ended'))
    return Promise.resolve()
  }
}

describe('audio player', () => {
  afterEach(() => {
    stopAnnouncements()
    sources.length = 0
    preloads.length = 0
    vi.unstubAllGlobals()
  })

  it('plays coordinate, result, and ship clips in order', async () => {
    vi.stubGlobal('Audio', FakeAudio)

    await playAnnouncement({
      pack: 'captain',
      clipIds: ['coord.g3', 'result.player.hit', 'ship.cruiser'],
      volume: true,
      speakEveryMove: true,
      gapMs: 0,
    })

    expect(sources).toEqual([
      '/audio/captain/coord.g3.wav',
      '/audio/captain/result.player.hit.wav',
      '/audio/captain/ship.cruiser.wav',
    ])
  })

  it('drops coordinate clips when speak every move is off but keeps result clips', async () => {
    vi.stubGlobal('Audio', FakeAudio)

    await playAnnouncement({
      pack: 'captain',
      clipIds: ['coord.g3', 'result.player.hit', 'ship.cruiser'],
      volume: true,
      speakEveryMove: false,
      gapMs: 0,
    })

    expect(sources).toEqual(['/audio/captain/result.player.hit.wav', '/audio/captain/ship.cruiser.wav'])
  })

  it('does not create audio elements when volume is off', async () => {
    vi.stubGlobal('Audio', FakeAudio)

    await playAnnouncement({
      pack: 'captain',
      clipIds: ['coord.g3', 'result.player.hit'],
      volume: false,
      speakEveryMove: true,
    })

    expect(sources).toEqual([])
  })

  it('preloads requested clips', () => {
    vi.stubGlobal('Audio', FakeAudio)

    preloadAudio('narrator', ['coord.a1', 'result.player.miss'])

    expect(preloads).toEqual(['/audio/narrator/coord.a1.wav', '/audio/narrator/result.player.miss.wav'])
  })
})
