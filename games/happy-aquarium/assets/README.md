# 快樂水族箱素材

素材已依用途分成執行素材、來源母檔、索引、工具與文件。遊戲程式只應載入 `runtime/`，不要直接載入 `source/`。本文件的路徑與維護指令均以 `games/happy-aquarium/assets/` 為工作目錄。

| 目錄／檔案 | 內容 |
| --- | --- |
| `runtime/` | 可直接載入的正式 PNG，含魚類圖集、互動物件與裝飾動畫 strip |
| `source/` | 高解析母表、中間稿、向量原稿與舊版備份 |
| `manifest.json` | 14 種魚的圖集、狀態、FPS 與播放模式 |
| `catalog.json` | 其他素材索引及全部素材的遊戲語意分類 |
| `tools/` | 圖集建置與素材驗證腳本 |
| `docs/` | [完整素材分類](docs/asset-classification.md)與[製作階段](docs/production-phases.md) |

## Runtime 目錄

```text
runtime/
├─ fish/<species-id>/<species-id>-states.png
├─ helpers/<helper-id>/
├─ devices/<device-id>/
├─ objects/
├─ decorations/
└─ ui/
```

所有正式檔名與資料夾 ID 使用英文 kebab-case。

## 魚類狀態圖集

魚類正式檔案固定為 `256×384`、4 欄 × 6 列，每格 `64×64`。欄由左至右為動畫第 0～3 幀；列由上至下為 `swim`、`hungry`、`eat`、`sick`、`death`、`bubble`。`idle` 共用 `swim` 第 0 幀。專案文件沿用「狀態圖集」稱呼，但在 Phaser Loader 中它是固定格位的 `spritesheet`，不需要 texture-atlas JSON。

```js
// BootScene.preload()
this.load.spritesheet("fish:guppy", fishUrl, {
  frameWidth: 64,
  frameHeight: 64
});

// BootScene.create()；實際 frameRate／repeat 由 manifest.json 讀取
const stateRows = { swim: 0, hungry: 1, eat: 2, sick: 3, death: 4, bubble: 5 };
for (const [state, row] of Object.entries(stateRows)) {
  const key = `fish:guppy:${state}`;
  if (this.anims.exists(key)) continue;
  this.anims.create({
    key,
    frames: this.anims.generateFrameNumbers("fish:guppy", {
      start: row * 4,
      end: row * 4 + 3
    }),
    frameRate: manifest.states[state].fps,
    repeat: manifest.states[state].mode === "loop" ? -1 : 0
  });
}
```

完整規格以 `manifest.json` 為準。早期逐狀態分片與根目錄相容檔已歸檔在 `source/legacy-runtime-split/` 和 `source/legacy-root-copies/`；新程式一律使用 `runtime/fish/` 下的狀態圖集。

## 金幣與裝飾動畫

- `runtime/objects/coin-spin.png` 為 `256×64`、4 幀水平 strip。
- `runtime/decorations/<id>-animated.png` 為 `192×64`、3 幀水平 strip；原本 `64×64` 單圖保留作為輸入源。
- `tools/build-animated-assets.py` 會把已核可的金幣圖組正規化為 runtime strip，並從現有裝飾單圖重建三幀水下擺動。

## 維護

重建魚類狀態圖集：

```powershell
./tools/build-fish-state-atlases.ps1 -Force
```

新增或調整素材後驗證：

```powershell
./tools/validate-assets.ps1
```

驗證器會檢查檔案是否齊全、圖片尺寸、RGBA 透明背景、魚類格位邊界，以及語意分類是否重複或遺漏。
