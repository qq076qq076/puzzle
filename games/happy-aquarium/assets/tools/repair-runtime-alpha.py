#!/usr/bin/env python3
"""Remove atlas bleed and hidden matte pixels without redrawing approved art."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"
FRAME = 64
ALPHA_THRESHOLD = 8

CLEAR_BANDS = {
    "helpers/cleaner-shrimp/cleaner-shrimp-hungry.png": (24, 0),
    "helpers/pleco/pleco-idle.png": (24, 0),
    "helpers/pleco/pleco-work.png": (24, 0),
    "devices/basic-feeder/basic-feeder-active.png": (7, 0),
    "devices/basic-feeder/basic-feeder-empty.png": (7, 0),
    "devices/advanced-feeder/advanced-feeder-active.png": (7, 4),
    "devices/advanced-feeder/advanced-feeder-empty.png": (7, 4),
    "devices/hang-on-filter/hang-on-filter-active.png": (7, 0),
    "devices/hang-on-filter/hang-on-filter-expired.png": (7, 0),
    "devices/warm-lamp/warm-lamp-active.png": (0, 5),
    "devices/warm-lamp/warm-lamp-off.png": (0, 5),
    "objects/algae-wafer-fall.png": (8, 0),
}


def components(frame: Image.Image) -> list[dict]:
    alpha = frame.getchannel("A")
    occupied = {(x, y) for y in range(FRAME) for x in range(FRAME) if alpha.getpixel((x, y)) > ALPHA_THRESHOLD}
    found = []
    while occupied:
        start = occupied.pop()
        queue = deque([start])
        pixels = {start}
        while queue:
            x, y = queue.popleft()
            for nx in range(max(0, x - 1), min(FRAME, x + 2)):
                for ny in range(max(0, y - 1), min(FRAME, y + 2)):
                    point = (nx, ny)
                    if point in occupied:
                        occupied.remove(point)
                        pixels.add(point)
                        queue.append(point)
        xs = [point[0] for point in pixels]
        ys = [point[1] for point in pixels]
        found.append({"pixels": pixels, "size": len(pixels), "bbox": (min(xs), min(ys), max(xs) + 1, max(ys) + 1)})
    return sorted(found, key=lambda item: item["size"], reverse=True)


def bbox_distance(left: tuple[int, int, int, int], right: tuple[int, int, int, int]) -> int:
    horizontal = max(0, left[0] - right[2], right[0] - left[2])
    vertical = max(0, left[1] - right[3], right[1] - left[3])
    return max(horizontal, vertical)


def remove_isolated_fragments(frame: Image.Image) -> Image.Image:
    found = components(frame)
    if len(found) < 2:
        return frame
    main = found[0]
    keep = set(main["pixels"])
    for component in found[1:]:
        distance = bbox_distance(component["bbox"], main["bbox"])
        if distance <= 5 or component["size"] >= max(20, main["size"] * 0.18):
            keep.update(component["pixels"])
    pixels = frame.load()
    for y in range(FRAME):
        for x in range(FRAME):
            if pixels[x, y][3] > ALPHA_THRESHOLD and (x, y) not in keep:
                pixels[x, y] = (0, 0, 0, 0)
    return frame


def clear_hidden_rgb(image: Image.Image) -> None:
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 and (red or green or blue):
                pixels[x, y] = (0, 0, 0, 0)


def repair(path: Path) -> bool:
    relative = path.relative_to(RUNTIME).as_posix()
    image = Image.open(path).convert("RGBA")
    before = image.tobytes()
    top, bottom = CLEAR_BANDS.get(relative, (0, 0))
    if top or bottom:
        pixels = image.load()
        for frame_x in range(0, image.width, FRAME):
            for frame_y in range(0, image.height, FRAME):
                for y in list(range(frame_y, frame_y + top)) + list(range(frame_y + FRAME - bottom, frame_y + FRAME)):
                    for x in range(frame_x, frame_x + FRAME):
                        pixels[x, y] = (0, 0, 0, 0)
    clean_components = relative.startswith(("fish/", "decorations/", "ui/"))
    if clean_components:
        for frame_y in range(0, image.height, FRAME):
            for frame_x in range(0, image.width, FRAME):
                # Bubble is a deliberate multi-component fish animation.
                if relative.startswith("fish/") and frame_y // FRAME == 5:
                    continue
                frame = image.crop((frame_x, frame_y, frame_x + FRAME, frame_y + FRAME))
                frame = remove_isolated_fragments(frame)
                image.paste(frame, (frame_x, frame_y))
    clear_hidden_rgb(image)
    changed = before != image.tobytes()
    if changed:
        image.save(path, optimize=True)
    return changed


def main() -> None:
    paths = sorted(path for path in RUNTIME.rglob("*.png") if not path.name.endswith("-animated.png"))
    changed = [path.relative_to(RUNTIME).as_posix() for path in paths if repair(path)]
    print(f"repaired {len(changed)} assets")
    for path in changed:
        print(path)


if __name__ == "__main__":
    main()
