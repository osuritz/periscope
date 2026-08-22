import { audioPath, type LineId, type VoicePack } from './lines'

export type PlayAnnouncementOptions = {
  pack: VoicePack
  clipIds: LineId[]
  volume: boolean
  speakEveryMove: boolean
  gapMs?: number
}

const DEFAULT_GAP_MS = 120

let runId = 0

function canPlayAudio(): boolean {
  return typeof Audio !== 'undefined'
}

function playClip(src: string, token: number): Promise<void> {
  if (!canPlayAudio() || token !== runId) return Promise.resolve()

  return new Promise((resolve) => {
    const audio = new Audio(src)
    audio.addEventListener('ended', () => resolve(), { once: true })
    audio.addEventListener('error', () => resolve(), { once: true })
    const played = audio.play()
    if (played && 'catch' in played) void played.catch(resolve)
  })
}

function wait(ms: number, token: number): Promise<void> {
  if (ms <= 0 || token !== runId) return Promise.resolve()
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function playAnnouncement({
  pack,
  clipIds,
  volume,
  speakEveryMove,
  gapMs = DEFAULT_GAP_MS,
}: PlayAnnouncementOptions): Promise<void> {
  const token = ++runId
  if (!volume || clipIds.length === 0 || !canPlayAudio()) return

  const audibleIds = speakEveryMove ? clipIds : clipIds.filter((id) => !id.startsWith('coord.'))
  for (const [index, id] of audibleIds.entries()) {
    if (token !== runId) return
    if (index > 0) await wait(gapMs, token)
    await playClip(audioPath(pack, id), token)
  }
}

export function stopAnnouncements(): void {
  runId += 1
}

export function preloadAudio(pack: VoicePack, lineIds: LineId[]): void {
  if (!canPlayAudio()) return
  for (const lineId of lineIds) {
    const audio = new Audio(audioPath(pack, lineId))
    audio.preload = 'auto'
  }
}
