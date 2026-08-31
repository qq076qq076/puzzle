#!/usr/bin/env python3
"""Audit aquarium runtime PNGs and render category contact sheets."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "runtime"
FRAME = 64


def alpha_bbox(image: Image.Image):
    return image.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()


def frame_findings(image: Image.Image) -> list[dict]:
    findings = []
    columns = image.width // FRAME
    rows = image.height // FRAME
    for row in range(rows):
        for column in range(columns):
            frame = image.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME))
            bbox = alpha_bbox(frame)
            if not bbox:
                findings.append({"frame": [column, row], "empty": True})
                continue
            touches = []
            if bbox[0] == 0: touches.append("left")
            if bbox[1] == 0: touches.append("top")
            if bbox[2] == FRAME: touches.append("right")
            if bbox[3] == FRAME: touches.append("bottom")
            if touches:
                findings.append({"frame": [column, row], "bbox": bbox, "touches": touches})
    return findings


def checkerboard_score(image: Image.Image) -> float:
    rgba = image.convert("RGBA")
    pixels = rgba.get_flattened_data() if hasattr(rgba, "get_flattened_data") else rgba.getdata()
    opaque = [(r, g, b) for r, g, b, a in pixels if a > 245]
    if not opaque:
        return 0
    neutral = [pixel for pixel in opaque if max(pixel) - min(pixel) < 5 and 150 <= sum(pixel) / 3 <= 245]
    return len(neutral) / len(opaque)


def audit(path: Path) -> dict:
    with Image.open(path) as loaded:
        image = loaded.convert("RGBA")
        alpha = image.getchannel("A")
        corners = [alpha.getpixel(point) for point in ((0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1))]
        sprite_grid = path.relative_to(RUNTIME).parts[0] != "backgrounds"
        return {
            "path": path.relative_to(ROOT).as_posix(),
            "size": [image.width, image.height],
            "mode": loaded.mode,
            "spriteGrid": sprite_grid,
            "validGrid": not sprite_grid or (image.width % FRAME == 0 and image.height % FRAME == 0),
            "alphaRange": list(alpha.getextrema()),
            "opaqueCorners": sum(value > 8 for value in corners),
            "checkerboardScore": round(checkerboard_score(image), 4),
            "frameFindings": frame_findings(image) if sprite_grid and image.width % FRAME == 0 and image.height % FRAME == 0 else [],
        }


def checkerboard(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGB", size, (218, 228, 232))
    draw = ImageDraw.Draw(image)
    tile = 8
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(184, 200, 207))
    return image


def render_sheet(category: str, paths: list[Path], output: Path) -> None:
    card_width, card_height, columns = 300, 220, 4
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGB", (card_width * columns, card_height * rows), (17, 34, 48))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, path in enumerate(paths):
        x = (index % columns) * card_width
        y = (index // columns) * card_height
        with Image.open(path) as loaded:
            image = loaded.convert("RGBA")
        image.thumbnail((280, 180), Image.Resampling.NEAREST)
        background = checkerboard((280, 180))
        offset = ((280 - image.width) // 2, (180 - image.height) // 2)
        background.paste(image, offset, image)
        sheet.paste(background, (x + 10, y + 26))
        draw.text((x + 10, y + 8), path.relative_to(RUNTIME).as_posix(), fill=(235, 244, 248), font=font)
    sheet.save(output / f"{category}.png", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    paths = sorted(RUNTIME.rglob("*.png"))
    report = [audit(path) for path in paths]
    (args.output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    categories: dict[str, list[Path]] = {}
    for path in paths:
        category = path.relative_to(RUNTIME).parts[0]
        categories.setdefault(category, []).append(path)
    for category, category_paths in categories.items():
        render_sheet(category, category_paths, args.output)
    summary = Counter()
    for item in report:
        summary["files"] += 1
        summary["invalidGrid"] += not item["validGrid"]
        summary["opaqueCorners"] += item["spriteGrid"] and item["opaqueCorners"] > 0
        summary["edgeTouchFiles"] += bool(item["frameFindings"])
        summary["checkerboardSuspects"] += item["checkerboardScore"] > 0.2
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
