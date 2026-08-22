# dungeon 素材放置說明

`src/data/assets.js` 已改為使用使用者提供的兩個 CraftPix 素材來源：

- [Free Top-Down Roguelike Game Kit Pixel Art](https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/)：玩家、巨鼠、哥布林、門與奇幻地城內容。
- [Free Roguelike Shoot 'em up Pixel Art Game Kit](https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/)：鋼鐵蜘蛛、機械場景與機械 Boss 內容。

CraftPix 的免費下載端點目前需要帳號登入，因此 repository 不放未取得的原始壓縮檔，也不把預覽 GIF 當成遊戲素材。取得素材後，請將 PNG 或匯出的 spritesheet 依照 manifest 使用的檔名放入：

```text
assets/
├── fantasy/
│   ├── player.png
│   ├── rat.png
│   ├── goblin-bat.png
│   ├── goblin-dagger.png
│   └── goblin-guard.png
└── machine/
    ├── steel-spider.png
    ├── boss.png
    └── floor.png
```

Vite 將 `games/dungeon/assets/` 作為 public directory。缺少任何檔案時，PreloadScene 會保留遊戲流程並改用 `src/systems/texture-factory.js` 的 nearest-neighbor 程序化像素備援；放入 PNG 後不需要修改玩家、怪物、房間生成或 Buff 系統。
