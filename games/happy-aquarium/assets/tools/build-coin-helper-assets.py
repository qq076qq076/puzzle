#!/usr/bin/env python3
"""Build the coin hermit crab helper strips from the approved ImageGen source."""

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source" / "helpers" / "coin-hermit-crab" / "coin-hermit-crab-source.png"
OUTPUT = ROOT / "runtime" / "helpers" / "coin-hermit-crab"
FRAME = 64


def transparent_checkerboard(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    seen: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def background_candidate(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return min(red, green, blue) >= 225 and max(red, green, blue) - min(red, green, blue) <= 12

    for x in range(width):
        for point in ((x, 0), (x, height - 1)):
            if background_candidate(*point):
                seen.add(point)
                queue.append(point)
    for y in range(height):
        for point in ((0, y), (width - 1, y)):
            if background_candidate(*point) and point not in seen:
                seen.add(point)
                queue.append(point)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            nx, ny = neighbor
            if 0 <= nx < width and 0 <= ny < height and neighbor not in seen and background_candidate(nx, ny):
                seen.add(neighbor)
                queue.append(neighbor)
    return rgba


def fit_frame(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    frame = Image.new("RGBA", (FRAME, FRAME))
    if not bbox:
        return frame
    subject = cell.crop(bbox)
    subject.thumbnail((58, 58), Image.Resampling.LANCZOS)
    x = (FRAME - subject.width) // 2
    y = FRAME - subject.height - 3
    frame.alpha_composite(subject, (x, y))
    return frame


def main() -> None:
    source = transparent_checkerboard(Image.open(SOURCE))
    frames: list[list[Image.Image]] = []
    for row in range(3):
        row_frames = []
        top = round(row * source.height / 3)
        bottom = round((row + 1) * source.height / 3)
        for column in range(4):
            left = round(column * source.width / 4)
            right = round((column + 1) * source.width / 4)
            row_frames.append(fit_frame(source.crop((left, top, right, bottom))))
        frames.append(row_frames)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    frames[0][0].save(OUTPUT / "coin-hermit-crab-idle.png", optimize=True)
    for state, row in (("work", 1), ("hungry", 2)):
        strip = Image.new("RGBA", (FRAME * 4, FRAME))
        for index, frame in enumerate(frames[row]):
            strip.alpha_composite(frame, (index * FRAME, 0))
        strip.save(OUTPUT / f"coin-hermit-crab-{state}.png", optimize=True)
    print("built coin-hermit-crab idle, work and hungry assets")


if __name__ == "__main__":
    main()
