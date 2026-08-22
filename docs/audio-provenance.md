# Audio provenance

Periscope's voice clips are generated at build/development time and committed as
static assets. The game makes no runtime TTS calls.

## Current bake

- Date: 2026-08-22
- Tooling: `tools/voice/bake_voice.py`
- Python environment: `uv`, `tools/voice/pyproject.toml`
- TTS package: `kokoro-mlx==0.1.2`
- Model: `kokoro-mlx` default Kokoro model (`hexgrad/Kokoro-82M`)
- License basis: Kokoro-82M model card lists Apache-2.0; `kokoro-mlx` is an
  Apple Silicon runner and does not bundle the model weights.
- Sample rate: 48 kHz
- Speed: 0.95
- Output format: WAV

## Voice choices

| Pack | Voice | Role |
|---|---|---|
| Silly Sea Captain | `am_puck` | Warmer, more animated default voice |
| Calm Narrator | `bf_emma` | Gentler alternate voice |

## Regenerating

From the repo root:

```bash
uv run --project tools/voice python tools/voice/bake_voice.py --overwrite
```

The script exports line IDs and text from `src/audio/lines.ts`, then writes:

```text
public/audio/<pack>/<lineId>.wav
public/audio/manifest.json
```

## Notes

- The design originally named MP3 outputs. This bake commits WAV files because
  the current development machine does not have `ffmpeg`, `sox`, or `lame`
  installed, and Kokoro produced WAV directly. The committed set is about 47 MB.
- Coordinates use separate audio/display text from the same line table:
  `coord.g3` speaks as `G, three.` and displays as `G3`.
- Hit and sunk announcements are assembled from reusable clips:
  coordinate -> result -> ship. This names the ship on every hit while avoiding
  a combinatorial explosion of baked phrases.
