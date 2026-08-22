import { useEffect, useMemo } from 'react'
import { announcementFor, preloadLineIdsForMode } from './lines'
import { playAnnouncement, preloadAudio, stopAnnouncements } from './player'
import type { BoardMode } from '../core/fleet'
import type { LastShot } from '../core/game'
import type { VoicePack } from './lines'

export type UseAnnouncementsOptions = {
  lastShot: LastShot | null
  mode: BoardMode
  pack: VoicePack
  volume: boolean
  speakEveryMove: boolean
}

export function useAnnouncements({
  lastShot,
  mode,
  pack,
  volume,
  speakEveryMove,
}: UseAnnouncementsOptions): void {
  const preloadIds = useMemo(() => preloadLineIdsForMode(mode), [mode])

  useEffect(() => {
    preloadAudio(pack, preloadIds)
  }, [pack, preloadIds])

  useEffect(() => {
    if (!lastShot) return
    const announcement = announcementFor(pack, lastShot)
    void playAnnouncement({
      pack,
      clipIds: announcement.clipIds,
      volume,
      speakEveryMove,
    })
    return stopAnnouncements
  }, [lastShot, pack, volume, speakEveryMove])
}
