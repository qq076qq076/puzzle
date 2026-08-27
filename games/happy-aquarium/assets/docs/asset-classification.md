# 素材分類表

本文路徑均以 `games/happy-aquarium/assets/` 為基準。

## 第一層：用途

| 類別 | 路徑 | 用途 |
| --- | --- | --- |
| 正式執行素材 | `runtime/` | 遊戲可以直接載入的最佳化 PNG |
| 來源母檔 | `source/` | 高解析母表、中間稿、向量原稿及舊版備份 |
| 索引資料 | `manifest.json`、`catalog.json` | 動畫規格、檔名清單與語意分組 |
| 製作工具 | `tools/` | 重建圖集與驗證素材 |
| 文件 | `docs/` | 分類規則與製作階段紀錄 |

## 第二層：正式執行素材

| 類別 | 數量 | 格式 | 路徑 |
| --- | ---: | --- | --- |
| 魚類 | 14 張狀態圖集 | `256×384`，每張 24 格 | `runtime/fish/<species-id>/` |
| 清潔生物 | 9 張 | idle 單幀、work／hungry 四幀 | `runtime/helpers/<helper-id>/` |
| 水族設備 | 12 張 | 每狀態四幀 | `runtime/devices/<device-id>/` |
| 互動物件 | 6 張 | 每物件四幀 | `runtime/objects/` |
| 裝飾 | 30 張 | `64×64` 單幀 | `runtime/decorations/` |
| UI 圖示 | 16 張 | `64×64` 單幀 | `runtime/ui/` |

總計 87 張正式執行 PNG。完整 ID 與分組由 `manifest.json` 和 `catalog.json` 管理。

## 第三層：遊戲語意

- 魚類：前期、中期、後期／傳說。
- 清潔生物：清潔生物。
- 設備：餵食、水質、環境。
- 互動物件：餵食、照護與成長、獎勵與事件。
- 裝飾：水草、珊瑚與貝類、天然造景、遺跡與沉船、水族道具、主題特殊裝飾。
- UI：貨幣、進度與狀態、照護用品、零件與魚卵、導覽與任務。

每個素材的實際歸屬記錄在 `catalog.json` 的 `classification`，分類不得重複或遺漏；`tools/validate-assets.ps1` 會一併驗證。

## 來源母檔細分

| 路徑 | 內容 | 是否可直接載入 |
| --- | --- | --- |
| `source/fish/` | 各魚種高解析狀態母表與向量原稿 | 否 |
| `source/devices/`、`source/helpers/` 等 | 非魚類高解析母表 | 否 |
| `source/**/raw-checkerboard/` | 去背前中間稿 | 否 |
| `source/legacy-runtime-split/` | 舊版逐狀態 runtime 分片 | 否 |
| `source/legacy-root-copies/` | 早期根目錄相容檔的完整歸檔 | 否 |

## 新增素材規則

1. 執行用圖片放入 `runtime/` 的對應類別；來源母檔放入 `source/`。
2. 檔名與資料夾 ID 使用英文 kebab-case。
3. 魚類同步更新 `manifest.json`；其他素材同步更新 `catalog.json` 與 `classification`。
4. 執行 `./tools/validate-assets.ps1`，確認尺寸、透明度、索引和分類完整。
