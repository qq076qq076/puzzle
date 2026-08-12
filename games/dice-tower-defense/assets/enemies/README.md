# Enemy sprites

These sprites are selected from **Tiny Dungeon 1.0** by Kenney:

- Source: https://kenney.nl/assets/tiny-dungeon
- License: Creative Commons Zero (CC0 1.0)
- License URL: https://creativecommons.org/publicdomain/zero/1.0/
- Attribution is not required. Credit: Kenney / https://kenney.nl

## File mapping

| Game enemy | Local file | Original tile |
| --- | --- | --- |
| Swift Bug | `swift-bat.png` | `tile_0120.png` |
| Armored Bug | `armored-knight.png` | `tile_0096.png` |
| Splitter Bug | `splitter-slime.png` | `tile_0108.png` |
| Split Child | `child-spider.png` | `tile_0122.png` |
| Shadow Bug | `shadow-ghost.png` | `tile_0121.png` |
| Healer Mage | `healer-wizard.png` | `tile_0084.png` |
| Armored King | `boss-demon.png` | `tile_0110.png` |

## Procedural model variants

Special enemies reuse the CC0 body sprites above and add code-drawn Canvas parts. This keeps the build offline-safe while giving each variant a distinct silhouette and casting animation.

| Game enemy | Reused body | Canvas model parts | Ability effect |
| --- | --- | --- | --- |
| Warder Bug | `armored-knight.png` | Rotating cyan hex frame | Expanding hex ward |
| Burrower Bug | `child-spider.png` | Ochre ground ring and orbiting debris | Three expanding dust ellipses |
| Disruptor Bug | `shadow-ghost.png` | Magenta arc and three orbit nodes | Ring with eight timing ticks |
| Healer Mage | `healer-wizard.png` | Violet casting halo and rune nodes | Expanding seal pulse; affected towers show a violet X for one second |
| Regenerator Bug | `splitter-slime.png` | Rotating green leaves and renewal ring | Green healing pulse after 2.5 seconds without damage |
| Berserker Bug | `armored-knight.png` | Red horns and enraged outline | Red burst at half health followed by a speed trail |
| Gold Thief Bug | `child-spider.png` | Three orbiting coins and gold ground ring | Coin scatter and floating gold-loss text on leak |
| Rift Armored King | `boss-demon.png` | Double counter-rotating rings and three violet shards | Ward pulse followed by disrupt pulse |

Future standalone replacements should be transparent 16×16 or 32×32 PNG files, nearest-neighbor friendly, and use no more than 12 main colors. They must preserve the same visual anchors so the health bar, status rings, model parts, and ability effects remain aligned.
