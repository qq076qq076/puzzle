# 快樂水族箱素材

## Runtime PNG（比照 Dungeon 素材格式）

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
- `source/raw-checkerboard/`：背景抽離前的生成中間稿，不可作為 runtime 素材。
- Runtime PNG 已移除外圍半透明暈光，並以最近鄰縮放保留清晰像素邊緣。

Canvas spritesheet 載入範例：

```js
const frameSize = 64;
const frame = Math.floor(elapsedMs / 100) % 4;
ctx.drawImage(
  clownfishSwim,
  frame * frameSize,
  0,
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

- 其餘魚種比照此風格：粗深棕描邊（`#7a3208`）、橘系漸層、白紋帶細黑邊。
- 檔名以魚種 id 命名（見 `遊戲機制.md` §6），例如 `clownfish.svg`、`blueTang.svg`。
