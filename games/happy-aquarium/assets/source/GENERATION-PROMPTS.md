# 素材生成提示詞規格

執行方式：Codex 內建 imagegen。所有輸出先保存高解析母表，再由
`tools/build-fish-atlas.ps1` 做邊界 flood-fill 去除假透明格紋、最近鄰縮放與切片。

## 魚類共同提示詞

```text
Use case: stylized-concept
Asset type: production sprite storyboard atlas for a 2D aquarium game
Input images: the clownfish images are STYLE and MOTION references only for the established Happy Aquarium pixel-art family.
Primary request: draw one coherent 4-column × 6-row atlas of the same <species>, exactly 24 frames.
Rows top-to-bottom:
1 swim loop with four fin/tail beats;
2 hungry slower swim with half-lidded eye and a food thought bubble;
3 pellet approaches, mouth opens, pellet is swallowed, satisfied return;
4 sick muted body with half-closed eye and progressive tilt;
5 death progressive belly-up roll ending upside down with pale belly and closed eye;
6 bubble performance from none to one to several blue bubbles drifting away.
Invariants: exact same species identity, markings, fins, proportions and scale in every frame; head right except natural sick/death rotation.
Style: crisp chunky pixel art, hard square pixels, thick dark warm-brown outline, two-to-three-step block shading, no smoothing.
Composition: portrait 4 equal columns × 6 equal rows, one centered full fish per cell, generous padding, no grid or labels.
Constraints: genuine transparent alpha; no backdrop, checkerboard, glow, shadow, text, UI, scenery, watermark, extra fish or extra frames. Only the specified pellet, thought bubble and blue bubbles.
```

### 物種設計差異

| ID | 主要設計描述 |
| --- | --- |
| `goby` | 沙金色細長身體、暖棕斑點、寬胸鰭、圓尾 |
| `guppy` | 藍綠細身、金色頭部、鈷藍與珊瑚色大扇尾 |
| `anglerfish` | 午夜藍圓身、紫鰭、黃色發光燈泡、小牙齒 |
| `golden-koi` | 金黃大鱗、白色鱗斑、口鬚、飄動長鰭 |
| `zebrafish` | 銀藍細身、五條深藍水平紋、青色鰭 |
| `blue-devil` | 飽和鈷藍圓身、深藍面罩、黃色尾緣 |
| `angelfish` | 珍珠銀菱形高身、三條黑紋、長三角鰭與腹絲 |
| `lionfish` | 珊瑚紅白條紋、扇形胸鰭、分離背刺 |
| `moonfish` | 銀藍圓盤、淡青新月斑、星點、靛藍鰭緣 |
| `arowana` | 紅金長身大鱗、上翹嘴與雙鬚、長背腹鰭 |
| `electric-eel` | 深青橄欖 S 形長身、黃綠腹、青色鋸齒電紋 |
| `stingray` | 略俯視的藍灰菱形翼盤、靛藍斑點、細長尾 |
| `rainbow-mermaid` | 珍珠紫魚身、彩虹鱗、長雙葉尾裙；完全非人形 |

## 清潔幫手母表

4×6：蘋果螺 work／hungry、清潔蝦 work／hungry、清道夫魚 work／hungry。
工作列呈現刮藻或撿食；飢餓列呈現放慢、趴底與逐幀 `Zzz`。

## 互動物件母表

4×6：魚卵孵化、魚糧下沉、藻錠下沉、藥水使用、寶箱開啟、漂流瓶漂動。

## 設備母表

- 餵食與過濾 4×6：基礎餵食器 active／empty、進階餵食器 active／empty、外掛過濾器 active／expired。
- 燈光與氣泡 4×6：UV active／off、氣泡石 active／off、暖燈 active／off。

## 裝飾與 UI

- 裝飾：5×6、共 30 格，順序與檔名見 `../../catalog.json`。
- UI：4×4、共 16 格，順序與檔名見 `../../catalog.json`。
- 每格單一主體、透明背景、無格線與標籤，輸出為 `64×64`。
