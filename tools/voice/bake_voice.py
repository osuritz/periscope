#!/usr/bin/env python3
"""Bake Periscope's production voice assets with Kokoro.

Run from the repo root:

    uv run --project tools/voice python tools/voice/bake_voice.py

The output is committed static audio:

    public/audio/<pack>/<lineId>.wav
    public/audio/manifest.json
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import wave
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "public" / "audio"
PACK_VOICES = {
    "captain": "am_puck",
    "narrator": "bf_emma",
}
SAMPLE_RATE = 48000
SPEED = 0.95


@dataclass(frozen=True)
class AudioLine:
    pack: str
    line_id: str
    text: str
    display: str


@dataclass(frozen=True)
class ManifestEntry:
    pack: str
    line_id: str
    text: str
    display: str
    voice: str
    model: str
    sample_rate: int
    duration: float
    path: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bake static Periscope voice clips.")
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--model", default=None)
    parser.add_argument("--speed", type=float, default=SPEED)
    parser.add_argument("--sample-rate", type=int, choices=[24000, 48000], default=SAMPLE_RATE)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--pack", choices=sorted(PACK_VOICES), action="append")
    return parser.parse_args()


def import_kokoro():
    try:
        from kokoro_mlx import KokoroTTS
    except ImportError as exc:
        raise SystemExit(
            "kokoro-mlx is not installed.\n"
            "Run: uv run --project tools/voice python tools/voice/bake_voice.py"
        ) from exc
    return KokoroTTS


def export_lines() -> list[AudioLine]:
    result = subprocess.run(
        ["./node_modules/.bin/tsx", "tools/voice/export-lines.ts"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    raw: Any = json.loads(result.stdout)
    lines: list[AudioLine] = []
    for item in raw:
        lines.append(
            AudioLine(
                pack=item["pack"],
                line_id=item["lineId"],
                text=item["text"],
                display=item["display"],
            )
        )
    return lines


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wav:
        return wav.getnframes() / float(wav.getframerate())


def main() -> int:
    args = parse_args()
    packs = set(args.pack or PACK_VOICES.keys())
    lines = [line for line in export_lines() if line.pack in packs]
    KokoroTTS = import_kokoro()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    manifest: list[ManifestEntry] = []

    model_label = args.model or "kokoro-mlx default (hexgrad/Kokoro-82M)"
    if args.model is None:
        tts_context = KokoroTTS.from_pretrained()
    else:
        tts_context = KokoroTTS.from_pretrained(args.model)

    with tts_context as tts:
        for index, audio_line in enumerate(lines, start=1):
            voice = PACK_VOICES[audio_line.pack]
            pack_dir = args.out_dir / audio_line.pack
            pack_dir.mkdir(parents=True, exist_ok=True)
            out_path = pack_dir / f"{audio_line.line_id}.wav"
            rel_path = out_path.relative_to(REPO_ROOT)

            if out_path.exists() and not args.overwrite:
                print(f"[{index}/{len(lines)}] skip {rel_path}")
            else:
                print(
                    f"[{index}/{len(lines)}] {audio_line.pack}/{audio_line.line_id}: "
                    f"{audio_line.text}"
                )
                tts.save(
                    audio_line.text,
                    out_path,
                    voice=voice,
                    speed=args.speed,
                    sample_rate=args.sample_rate,
                )

            manifest.append(
                ManifestEntry(
                    pack=audio_line.pack,
                    line_id=audio_line.line_id,
                    text=audio_line.text,
                    display=audio_line.display,
                    voice=voice,
                    model=model_label,
                    sample_rate=args.sample_rate,
                    duration=round(wav_duration(out_path), 3),
                    path=str(rel_path),
                )
            )

    manifest_path = args.out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps([asdict(entry) for entry in manifest], indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {manifest_path.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
