# dungeon 資產放置說明

目前 CraftPix 下載頁需要登入，因此此工作區先使用 `src/systems/texture-factory.js` 產生的像素原型素材完成遊戲邏輯。取得素材壓縮檔後，請依下列方式整理：

```text
assets/
├── fantasy/   # Free Top-Down Roguelike Game Kit
├── machine/   # Free Roguelike Shoot 'em up Pixel Art Game Kit
├── atlases/   # 匯出的 PNG atlas／spritesheet
└── maps/      # Tiled JSON 房間模板
```

接入真實素材時只修改資產載入與素材 manifest，不修改玩家、怪物、房間生成或 Buff 系統。PSD 不放入生產建置，執行期只載入 PNG／atlas。
