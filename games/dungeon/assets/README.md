# dungeon 資產放置說明

目前 dungeon runtime 直接使用 workspace 內已提供的 Kenney Tiny Dungeon PNG，manifest 位於 `src/data/assets.js`，相對路徑指向 `../dice-tower-defense/assets/`。地板、牆、傳送門、陷阱、預警與命中特效則由 `src/systems/texture-factory.js` 以 nearest-neighbor 像素風格產生。CraftPix 頁面只保留在 [ASSET-CREDITS.md](../ASSET-CREDITS.md) 作為原始規格參考，沒有將未取得的檔案放入 runtime。

若日後取得其他素材壓縮檔，請依下列方式整理：

```text
assets/
├── fantasy/   # Free Top-Down Roguelike Game Kit
├── machine/   # Free Roguelike Shoot 'em up Pixel Art Game Kit
├── atlases/   # 匯出的 PNG atlas／spritesheet
└── maps/      # Tiled JSON 房間模板
```

接入真實素材時只修改資產載入與素材 manifest，不修改玩家、怪物、房間生成或 Buff 系統。PSD 不放入生產建置，執行期只載入 PNG／atlas。
