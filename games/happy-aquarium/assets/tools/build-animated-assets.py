#!/usr/bin/env python3
"""Build runtime-sized animation strips from approved source artwork."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parents[1]
DECORATION_DIR = ROOT / "runtime" / "decorations"
OBJECT_DIR = ROOT / "runtime" / "objects"


def transparent_art(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    if rgba.getchannel("A").getextrema() != (255, 255):
        return rgba
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if red < 12 and green < 12 and blue < 12:
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def build_coin_strip(source: Path) -> None:
    image = transparent_art(Image.open(source))
    frame_width = image.width / 4
    strip = Image.new("RGBA", (256, 64))
    for index in range(4):
        left = round(index * frame_width)
        right = round((index + 1) * frame_width)
        frame = image.crop((left, 0, right, image.height))
        bounds = frame.getbbox()
        if bounds:
            frame = frame.crop(bounds)
        frame.thumbnail((54, 54), Image.Resampling.LANCZOS)
        x = index * 64 + (64 - frame.width) // 2
        y = (64 - frame.height) // 2
        strip.alpha_composite(frame, (x, y))
    strip.save(OBJECT_DIR / "coin-spin.png", optimize=True)


def build_food_strip(source: Path) -> None:
    image = transparent_art(Image.open(source))
    frame_width = image.width / 4
    frames = []
    for index in range(4):
        left = round(index * frame_width)
        right = round((index + 1) * frame_width)
        frame = image.crop((left, 0, right, image.height))
        bounds = frame.getchannel("A").point(lambda alpha: 255 if alpha > 12 else 0).getbbox()
        if not bounds:
            raise ValueError(f"Food frame {index} is empty: {source}")
        frames.append(frame.crop(bounds))

    # One shared scale preserves the pellet's apparent mass across rotations.
    scale = min(24 / max(frame.width for frame in frames), 24 / max(frame.height for frame in frames))
    strip = Image.new("RGBA", (256, 64))
    for index, frame in enumerate(frames):
        resized = frame.resize(
            (max(1, round(frame.width * scale)), max(1, round(frame.height * scale))),
            Image.Resampling.LANCZOS,
        )
        x = index * 64 + (64 - resized.width) // 2
        y = (64 - resized.height) // 2
        strip.alpha_composite(resized, (x, y))
    strip.save(OBJECT_DIR / "fish-food-fall.png", optimize=True)


def animated_frame(source: Image.Image, shear: float, brightness: float) -> Image.Image:
    # A tiny bottom-anchored shear gives plants and props an underwater sway
    # while keeping the original silhouette and transparent padding intact.
    shifted = source.transform(
        source.size,
        Image.Transform.AFFINE,
        (1, shear, -shear * 58, 0, 1, 0),
        resample=Image.Resampling.BICUBIC,
    )
    alpha = shifted.getchannel("A")
    color = ImageEnhance.Brightness(shifted.convert("RGB")).enhance(brightness).convert("RGBA")
    color.putalpha(alpha)
    return color


def build_decoration_strips() -> None:
    for source_path in sorted(DECORATION_DIR.glob("*.png")):
        if source_path.name.endswith("-animated.png"):
            continue
        source = Image.open(source_path).convert("RGBA")
        if source.size != (64, 64):
            raise ValueError(f"Expected 64x64 decoration: {source_path}")
        strip = Image.new("RGBA", (192, 64))
        for index, (shear, brightness) in enumerate(((0, 1), (0.028, 1.05), (-0.028, 0.97))):
            strip.alpha_composite(animated_frame(source, shear, brightness), (index * 64, 0))
        strip.save(source_path.with_name(f"{source_path.stem}-animated.png"), optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--coin-source", type=Path)
    parser.add_argument("--food-source", type=Path)
    args = parser.parse_args()
    if args.coin_source:
        build_coin_strip(args.coin_source)
    if args.food_source:
        build_food_strip(args.food_source)
    build_decoration_strips()


if __name__ == "__main__":
    main()
