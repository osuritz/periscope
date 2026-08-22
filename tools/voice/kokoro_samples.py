#!/usr/bin/env python3
"""Generate local Kokoro voice samples for Periscope.

Run from the repo root:

    uv run --project tools/voice python tools/voice/kokoro_samples.py

The first run downloads Kokoro/MLX weights from Hugging Face into the normal
local cache. Generated WAVs are intentionally written under
public/audio/samples/kokoro, which is ignored by git.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


DEFAULT_VOICES = ["am_puck", "am_fenrir", "bf_emma", "af_heart"]
DEFAULT_SAMPLE_RATE = 48000
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LINES = Path(__file__).with_name("sample-lines.json")
DEFAULT_OUT_DIR = REPO_ROOT / "public" / "audio" / "samples" / "kokoro"


@dataclass(frozen=True)
class SampleLine:
    line_id: str
    text: str


@dataclass(frozen=True)
class GeneratedSample:
    line_id: str
    text: str
    voice: str
    speed: float
    sample_rate: int
    duration: float | None
    path: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Kokoro WAV samples for Periscope voice auditioning."
    )
    parser.add_argument(
        "--lines",
        type=Path,
        default=DEFAULT_LINES,
        help=f"JSON line list to synthesize. Default: {DEFAULT_LINES}",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help=f"Directory for generated WAVs. Default: {DEFAULT_OUT_DIR}",
    )
    parser.add_argument(
        "--voices",
        nargs="+",
        default=DEFAULT_VOICES,
        help="Kokoro voice names to audition.",
    )
    parser.add_argument(
        "--speed",
        type=float,
        default=0.95,
        help="Speaking speed multiplier. Default: 0.95",
    )
    parser.add_argument(
        "--sample-rate",
        type=int,
        choices=[24000, 48000],
        default=DEFAULT_SAMPLE_RATE,
        help="Output sample rate. Default: 48000",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Optional Hugging Face model id or local model path.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Regenerate files that already exist.",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="Print voices available to kokoro-mlx and exit.",
    )
    return parser.parse_args()


def load_lines(path: Path) -> list[SampleLine]:
    data: Any = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a JSON array")

    lines: list[SampleLine] = []
    seen: set[str] = set()
    for raw in data:
        if not isinstance(raw, dict):
            raise ValueError(f"{path} contains a non-object entry")
        line_id = raw.get("lineId")
        text = raw.get("text")
        if not isinstance(line_id, str) or not line_id:
            raise ValueError(f"{path} contains an entry without a lineId")
        if not isinstance(text, str) or not text:
            raise ValueError(f"{line_id} is missing text")
        if line_id in seen:
            raise ValueError(f"duplicate lineId: {line_id}")
        seen.add(line_id)
        lines.append(SampleLine(line_id=line_id, text=text))
    return lines


def slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-").lower()


def import_kokoro():
    try:
        from kokoro_mlx import KokoroTTS
    except ImportError as exc:
        raise SystemExit(
            "kokoro-mlx is not installed in this Python environment.\n"
            "Run: uv run --project tools/voice python tools/voice/kokoro_samples.py"
        ) from exc
    return KokoroTTS


def main() -> int:
    args = parse_args()
    lines = load_lines(args.lines)
    KokoroTTS = import_kokoro()

    if args.model is None:
        tts_context = KokoroTTS.from_pretrained()
    else:
        tts_context = KokoroTTS.from_pretrained(args.model)

    with tts_context as tts:
        if args.list_voices:
            print("\n".join(tts.list_voices()))
            return 0

        available = set(tts.list_voices())
        unknown = [voice for voice in args.voices if voice not in available]
        if unknown:
            raise SystemExit(
                "Unknown voice(s): "
                + ", ".join(unknown)
                + "\nUse --list-voices to see options."
            )

        args.out_dir.mkdir(parents=True, exist_ok=True)
        generated: list[GeneratedSample] = []
        total = len(args.voices) * len(lines)
        current = 0

        for voice in args.voices:
            voice_dir = args.out_dir / voice
            voice_dir.mkdir(parents=True, exist_ok=True)
            for line in lines:
                current += 1
                out_path = voice_dir / f"{slug(line.line_id)}.wav"
                rel_path = out_path.relative_to(REPO_ROOT)
                if out_path.exists() and not args.overwrite:
                    print(f"[{current}/{total}] skip {rel_path}")
                    generated.append(
                        GeneratedSample(
                            line_id=line.line_id,
                            text=line.text,
                            voice=voice,
                            speed=args.speed,
                            sample_rate=args.sample_rate,
                            duration=None,
                            path=str(rel_path),
                        )
                    )
                    continue

                print(f"[{current}/{total}] {voice} {line.line_id}: {line.text}")
                result = tts.save(
                    line.text,
                    out_path,
                    voice=voice,
                    speed=args.speed,
                    sample_rate=args.sample_rate,
                )
                generated.append(
                    GeneratedSample(
                        line_id=line.line_id,
                        text=line.text,
                        voice=voice,
                        speed=args.speed,
                        sample_rate=result.sample_rate,
                        duration=result.duration,
                        path=str(rel_path),
                    )
                )

    manifest_path = args.out_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps([asdict(sample) for sample in generated], indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {manifest_path.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
