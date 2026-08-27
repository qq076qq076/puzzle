# 快樂水族箱素材

## 正式目錄

| 目錄 | 內容 |
| --- | --- |
| `fish/<species-id>/` | 14 種魚；每種一張固定 4×6 狀態圖集 |
| `helpers/<helper-id>/` | 蘋果螺、清潔蝦、清道夫魚的 idle／work／hungry |
| `devices/<device-id>/` | 餵食器、過濾器、UV、氣泡石、暖燈的狀態動畫 |
| `objects/` | 孵化、餵食、藥水、寶箱、漂流瓶等互動動畫 |
| `decorations/` | 30 種 `64×64` 靜態裝飾 |
| `ui/` | 16 種 `64×64` 資源與操作圖示 |
| `source/` | 高解析生成母表與提示詞紀錄，不供 runtime 直接載入 |

魚種與播放規格見 `manifest.json`；其他素材索引見 `catalog.json`。
所有正式檔名與資料夾 ID 一律使用英文 kebab-case。

魚類正式執行期檔案：

```text
fish/<id>/<id>-states.png     # 256×384，4 欄 × 6 列，每格 64×64
```

欄由左至右為動畫第 0～3 幀；列由上至下固定為 `swim`、`hungry`、
`eat`、`sick`、`death`、`bubble`。`idle` 共用 `swim` 第 0 幀。
每種魚只需載入一次；實際列號、FPS 與播放模式以 `manifest.json` 為準。

舊的分狀態檔已移至 `source/legacy-runtime-split/<id>/`，只供比對與回溯，
不得由遊戲載入。根目錄的 `clownfish*.png` 仍是舊程式相容副本；新程式請載入
`fish/clownfish/clownfish-states.png`。

## 小丑魚舊路徑說明

### `clownfish.png`

- 小丑魚單幀 sprite，魚頭朝右。
- PNG、RGBA 透明背景，尺寸 `64×64`。
- 適合商店預覽、待機狀態或動畫降級顯示。

### `clownfish-swim.png`

- 小丑魚游泳循環 spritesheet，魚頭朝右。
- PNG、RGBA 透明背景，尺寸 `256×64`。
- 水平排列 4 幀；每格 `64×64`，播放順序為左至右。
- 建議以 8～10 FPS 循環播放；向左游時水平翻轉。

### 狀態動畫

以下檔案皆為 PNG、RGBA 真透明背景，尺寸 `256×64`；水平排列 4 幀，
每格固定 `64×64`，魚頭預設朝右。

| 檔案 | 狀態與播放方式 | 建議速度 |
| --- | --- | --- |
| `clownfish-hungry.png` | 飢餓慢游與魚糧思考泡泡；循環播放 | 5～6 FPS |
| `clownfish-eat.png` | 魚糧接近、張嘴、吞食；單次播放後回到游泳 | 8～10 FPS |
| `clownfish-sick.png` | 灰橘色、半閉眼、緩慢翻覆；循環播放 | 4～5 FPS |
| `clownfish-death.png` | 虛弱到翻肚的死亡過渡；單次播放並停在最後一幀 | 4～6 FPS |
| `clownfish-bubble.png` | 訓練後的吐泡泡表演；單次播放或短循環 | 8 FPS |

狀態切換建議：

- `satiety < 25` 時使用 `clownfish-hungry.png`。
- 吃到魚糧時播放一次 `clownfish-eat.png`。
- 生病時使用 `clownfish-sick.png`；死亡時播放 `clownfish-death.png`。
- 已學會吐泡泡表演的成魚被點擊時，播放 `clownfish-bubble.png`。
- 所有左右方向均共用同一張圖，朝左時在 Canvas 或 CSS 水平翻轉。

### 生成來源

- `source/clownfish-idle-generated.png`：單幀高解析生成來源。
- `source/clownfish-swim-generated.png`：4 幀游泳高解析生成來源。
- `source/clownfish-*-transparent.png`：各狀態的真透明高解析來源。
- `source/fish/<species-id>/`：各魚種高解析狀態母表。
- `source/fish/goby/goby-idle-generated.png`：第一階段小蝦虎單幀母圖。
- `source/fish/guppy/guppy-idle-transparent.png`：第一階段孔雀魚單幀母圖。
- `source/phase-01-prompts.md`：第一階段完整提示詞、輸出與透明度驗證紀錄。
- `source/GENERATION-PROMPTS.md`：完整批次提示詞與物種設計差異。
- 各來源資料夾的 `raw-checkerboard/`：背景抽離前中間稿，不可作 runtime。
- Runtime PNG 已移除外圍半透明暈光，並以最近鄰縮放保留清晰像素邊緣。

後續素材的分階段製作順序與共同驗收基準見 `PHASES.md`。

Canvas 狀態圖集載入範例：

```js
const frameSize = 64;
const frame = Math.floor(elapsedMs / 100) % 4;
const stateRows = { swim: 0, hungry: 1, eat: 2, sick: 3, death: 4, bubble: 5 };
const row = stateRows[state];
ctx.drawImage(
  clownfishStates,
  frame * frameSize,
  row * frameSize,
  frameSize,
  frameSize,
  x,
  y,
  frameSize * scale,
  frameSize * scale,
);
```

## clownfish.svg（小丑魚）

- 對應魚種表的小丑魚（等級 10 解鎖，人氣王）。
- 原創手繪向量素材（本專案自製，非第三方素材，無授權標註需求）。
- 透明背景，viewBox `0 0 240 160`，魚頭朝**右**。

### 使用方式

- 魚頭朝左時，在 Canvas 以 `ctx.scale(-1, 1)` 水平翻轉，或 CSS `transform: scaleX(-1)`。
- 依 §5.2 成長階段，幼魚／亞成魚／成魚共用此圖，以 40%／70%／100% 縮放呈現。
- Canvas 載入範例：

```js
const img = new Image();
img.src = "assets/clownfish.svg";
// ctx.drawImage(img, x, y, 240 * scale, 160 * scale);
```

### 後續素材慣例

- 全素材比照此風格：粗深棕描邊（`#7a3208`）、清楚塊面明暗與高辨識輪廓。
- 魚種 ID、狀態順序、FPS 與播放模式一律以 `manifest.json` 為準。
- 重建正式魚類圖集時執行 `./tools/build-fish-state-atlases.ps1 -Force`；工具會按透明像素辨識完整物件後置入固定格位，避免直接等分母表造成跨列裁切。
- 新增非魚類素材時同步更新 `catalog.json`，並執行：

```powershell
./tools/validate-assets.ps1
```
