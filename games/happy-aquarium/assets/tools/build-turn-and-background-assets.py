#!/usr/bin/env python3
"""Build 64 px fish turn strips and the aquarium background from approved sources."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TURN_SOURCE = ROOT / "source" / "generated-turns"
BACKGROUND_SOURCE = ROOT / "source" / "backgrounds" / "aquarium-background-source.png"
RUNTIME = ROOT / "runtime"
FRAME_SIZE = 64
FRAME_PADDING = 4


def visible_bbox(image: Image.Image):
    return image.getchannel("A").point(lambda alpha: 255 if alpha > 12 else 0).getbbox()


def build_turn_strip(source: Path, destination: Path) -> None:
    with Image.open(source) as loaded:
        image = loaded.convert("RGBA")
    cells = []
    for index in range(4):
        left = round(index * image.width / 4)
        right = round((index + 1) * image.width / 4)
        cell = image.crop((left, 0, right, image.height))
        bbox = visible_bbox(cell)
        if bbox is None:
            raise ValueError(f"empty turn frame {index}: {source}")
        cells.append(cell.crop(bbox))

    max_width = max(cell.width for cell in cells)
    max_height = max(cell.height for cell in cells)
    available = FRAME_SIZE - FRAME_PADDING * 2
    scale = min(available / max_width, available / max_height)
    strip = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE), (0, 0, 0, 0))
    for index, cell in enumerate(cells):
        size = (max(1, round(cell.width * scale)), max(1, round(cell.height * scale)))
        resized = cell.resize(size, Image.Resampling.LANCZOS)
        x = index * FRAME_SIZE + (FRAME_SIZE - resized.width) // 2
        y = (FRAME_SIZE - resized.height) // 2
        strip.alpha_composite(resized, (x, y))
    destination.parent.mkdir(parents=True, exist_ok=True)
    strip.save(destination, optimize=True)


def build_background() -> None:
    with Image.open(BACKGROUND_SOURCE) as loaded:
        image = loaded.convert("RGB")
    target_ratio = 5 / 3
    if image.width / image.height > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    else:
        crop_height = round(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    image.resize((1000, 600), Image.Resampling.LANCZOS).save(
        RUNTIME / "backgrounds" / "aquarium-background.png",
        optimize=True,
    )


def main() -> None:
    sources = sorted(TURN_SOURCE.glob("*-turn-source.png"))
    if len(sources) != 14:
        raise ValueError(f"expected 14 turn sources, found {len(sources)}")
    for source in sources:
        species_id = source.name.removesuffix("-turn-source.png")
        build_turn_strip(source, RUNTIME / "fish" / species_id / f"{species_id}-turn.png")
    build_background()
    print(f"built {len(sources)} turn strips and 1 background")


if __name__ == "__main__":
    main()
