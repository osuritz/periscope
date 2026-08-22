import { AUDIO_LINES, allLineIds, type VoicePack } from '../../src/audio/lines'

const packs: VoicePack[] = ['captain', 'narrator']

const lines = packs.flatMap((pack) =>
  allLineIds(pack).map((lineId) => ({
    pack,
    lineId,
    text: AUDIO_LINES[pack][lineId].audio,
    display: AUDIO_LINES[pack][lineId].display,
  })),
)

process.stdout.write(`${JSON.stringify(lines, null, 2)}\n`)
