# dungeon 素材配置

兩套 CraftPix 素材已解壓並納入專案：

- [Free Top-Down Roguelike Game Kit Pixel Art](https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/)：玩家、一般怪物、奇幻地板、牆、門與房間獎勵物件。
- [Free Roguelike Shoot 'em up Pixel Art Game Kit](https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/)：鋼鐵蜘蛛、魔王、機械地板、牆、傳送門與祭壇。

## 原始素材目錄

```text
assets/
├── roguelike-game-kit-pixel-art/
└── shoot/
```

Vite 將 `games/dungeon/assets/` 作為 public directory，`src/data/assets.js` 直接記錄實際 PNG 路徑；不需要環境變數即可在開發與正式建置中使用。

## Runtime 採用項目

| 遊戲用途 | 素材檔案 |
| --- | --- |
| 白甲近戰玩家 | `roguelike-game-kit-pixel-art/1 Characters/2/{D,S,U}_{Idle,Walk,Attack}.png` |
| 巨鼠與三種哥布林 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/1..4/` |
| 奇幻地板／牆 | `2 Dungeon Tileset/1 Tiles/Tile_20.png`、`Tile_16.png` |
| 關閉的門／房間獎勵 | `2 Dungeon Tileset/2 Objects/Doors/4.png`、`Boxes/12.png` |
| 鋼鐵蜘蛛 | `shoot/1 Main Character/1 Character/Walk1..3.png` |
| 機械魔王 | `shoot/3 Enemies/6/RunSD.png`、`RunSU.png` |
| 機械地板／牆 | `shoot/2 Location/1 Tiles/Tile_28.png`、`Tile_19.png` |
| 傳送門／獎勵祭壇 | `shoot/2 Location/3 Animated objects/Portal1_Idle.png`、`Altar_Idle.png` |

原始包內的 PSD、示範檔與未採用圖片會保留作為來源，但遊戲的 preload manifest 只請求上表列出的 PNG。`test/assets.test.mjs` 會檢查所有 runtime 檔案存在，並驗證 spritesheet 的格數與尺寸。
