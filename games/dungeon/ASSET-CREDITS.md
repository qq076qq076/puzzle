# dungeon 素材來源與授權備註

## 使用素材

1. [Free Roguelike Shoot 'em up Pixel Art Game Kit](https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/)
2. [Free Top-Down Roguelike Game Kit Pixel Art](https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/)

兩個素材頁面都標示為 2D Pixel Art，並提供 PNG 與 PSD。Top-Down Roguelike 套件負責奇幻俯視角內容；Shoot 'em up 套件負責機械俯視角內容。

## Freebie 授權備註

依 CraftPix 的 [File Licenses](https://craftpix.net/file-licenses/) 頁面，Freebie 素材可用於個人與商業專案，可修改並隨遊戲發行；不可把原始 PNG、PSD 或素材包本身單獨重新販售或以可抽取素材的形式重新分發。發佈版本前仍應再次查閱來源頁與授權頁的最新條款。

## 實際採用檔案

| dungeon 用途 | 本地來源 | Runtime key |
| --- | --- | --- |
| 玩家 | `roguelike-game-kit-pixel-art/1 Characters/2/` | `provided-player*` |
| 巨鼠 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/1/` | `provided-rat*` |
| 哥布林蝙蝠 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/2/` | `provided-goblin-bat*` |
| 哥布林匕首手 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/3/` | `provided-goblin-dagger*` |
| 哥布林守衛 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/4/` | `provided-spider-guard*` |
| 奇幻地板、牆、門、獎勵 | `roguelike-game-kit-pixel-art/2 Dungeon Tileset/` | `room-floor-fantasy`、`wall-fantasy`、`door-closed`、`reward-chest` |
| 鋼鐵蜘蛛 | `shoot/1 Main Character/1 Character/Walk1..3.png` | `provided-steel-spider*` |
| 魔王 | `shoot/3 Enemies/6/RunSD.png`、`RunSU.png` | `provided-boss*` |
| 機械地板、牆 | `shoot/2 Location/1 Tiles/Tile_28.png`、`Tile_19.png` | `room-floor-machine`、`wall-machine` |
| 傳送門、獎勵祭壇 | `shoot/2 Location/3 Animated objects/Portal1_Idle.png`、`Altar_Idle.png` | `portal`、`reward-console` |

完整路徑、frame 尺寸與動畫速度以 `src/data/assets.js` 為唯一 runtime manifest。

## 專案內的使用規則

- 素材只作為《dungeon》遊戲的一部分，不提供素材檔案匯出或單獨下載功能。
- 遊戲執行時只 preload 已列入 manifest 的 PNG，不載入 PSD 或未採用內容。
- 若日後加入第三方音效、字型或額外素材，必須在本檔案追加來源與授權。
- 發佈前再次確認 CraftPix 素材頁與授權頁的最新版本。
