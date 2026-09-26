# 花漾連鎖（Bloomshift）SEO 資訊

> 文件版本：1.0  
> 更新日期：2026-09-26  
> 預定正式網址：`https://qq076qq076.github.io/puzzle/games/bloom-chain/`

## 一、搜尋結果資訊

| 欄位 | 內容 |
| --- | --- |
| 頁面標題 | `花漾連鎖 Bloomshift｜交換花瓣，串出華麗連鎖` |
| Meta description | `遊玩花漾連鎖，交換相鄰花瓣、完成三連消除，在持續上升的盤面中安排華麗連鎖。支援桌面與手機瀏覽器。` |
| 短版名稱 | `花漾連鎖` |
| 英文名稱 | `Bloomshift` |
| 網站名稱 | `Puzzle Club` |
| Canonical URL | `https://qq076qq076.github.io/puzzle/games/bloom-chain/` |
| 語言 | `zh-Hant` |
| Robots | `index, follow` |
| Theme color | `#306A3C` |

### 建議關鍵字

關鍵字應自然出現在頁面標題、介紹與操作說明中，不需另外堆疊隱藏文字：

- 花漾連鎖
- Bloomshift
- 免費網頁遊戲
- 花朵消除遊戲
- 三消遊戲
- 連鎖消除
- 益智遊戲
- 手機網頁遊戲
- 上升方塊遊戲

## 二、Open Graph 圖片

| 欄位 | 內容 |
| --- | --- |
| 檔案 | `og-image.png` |
| 尺寸 | `1200 × 630` |
| 格式 | `image/png` |
| URL | `https://qq076qq076.github.io/puzzle/games/bloom-chain/og-image.png` |
| Alt | `晨光花園中的花瓣方塊盤面，中央正在觸發粉紅、藍色與紫色的華麗連鎖` |

圖片不內嵌標題文字，避免社群平台裁切或縮小後影響辨識；遊戲名稱由 `og:title` 與分享卡文字顯示。重要盤面與連鎖效果集中在中央安全區。

## 三、HTML Head Metadata

建立正式 `index.html` 時，將以下內容放入 `<head>`，並保留 UTF-8、viewport 與 CSS 引用：

```html
<title>花漾連鎖 Bloomshift｜交換花瓣，串出華麗連鎖</title>
<meta
  name="description"
  content="遊玩花漾連鎖，交換相鄰花瓣、完成三連消除，在持續上升的盤面中安排華麗連鎖。支援桌面與手機瀏覽器。"
/>
<meta name="robots" content="index, follow" />
<meta name="theme-color" content="#306A3C" />
<link rel="canonical" href="https://qq076qq076.github.io/puzzle/games/bloom-chain/" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Puzzle Club" />
<meta property="og:locale" content="zh_TW" />
<meta property="og:title" content="花漾連鎖 Bloomshift｜交換花瓣，串出華麗連鎖" />
<meta
  property="og:description"
  content="交換相鄰花瓣、完成三連消除，在持續上升的盤面中安排華麗連鎖。"
/>
<meta property="og:url" content="https://qq076qq076.github.io/puzzle/games/bloom-chain/" />
<meta
  property="og:image"
  content="https://qq076qq076.github.io/puzzle/games/bloom-chain/og-image.png"
/>
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta
  property="og:image:alt"
  content="晨光花園中的花瓣方塊盤面，中央正在觸發粉紅、藍色與紫色的華麗連鎖"
/>

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="花漾連鎖 Bloomshift｜交換花瓣，串出華麗連鎖" />
<meta
  name="twitter:description"
  content="交換花瓣、串起連鎖，在不斷上升的盤面中挑戰最高分。"
/>
<meta
  name="twitter:image"
  content="https://qq076qq076.github.io/puzzle/games/bloom-chain/og-image.png"
/>
<meta
  name="twitter:image:alt"
  content="晨光花園中的花瓣方塊盤面，中央正在觸發粉紅、藍色與紫色的華麗連鎖"
/>
```

## 四、結構化資料

正式遊戲頁可加入以下 JSON-LD。`datePublished` 應在遊戲實際上線時改成正式發布日期；若尚未上線，不要先放入頁面。

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "花漾連鎖",
  "alternateName": "Bloomshift",
  "description": "交換相鄰花瓣、完成三連消除，在持續上升的盤面中安排華麗連鎖。",
  "url": "https://qq076qq076.github.io/puzzle/games/bloom-chain/",
  "image": "https://qq076qq076.github.io/puzzle/games/bloom-chain/og-image.png",
  "inLanguage": "zh-Hant",
  "genre": ["益智", "三消", "動作益智"],
  "gamePlatform": ["Web Browser", "Desktop", "Mobile"],
  "applicationCategory": "GameApplication",
  "operatingSystem": "Any",
  "playMode": "SinglePlayer",
  "isAccessibleForFree": true,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "TWD"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Puzzle Club",
    "url": "https://qq076qq076.github.io/puzzle/"
  }
}
</script>
```

## 五、頁面文案

### 首屏標題

```text
交換花瓣，讓連鎖一路綻放
```

### 首屏介紹

```text
交換左右相鄰的花瓣，讓三個以上相同圖案連成一直線。在不斷上升的盤面中安排下一步，創造愈來愈長的華麗連鎖。
```

### 首頁遊戲卡說明

```text
交換相鄰花瓣、完成三連消除，在持續上升的花園盤面中挑戰華麗連鎖。
```

### 分享文字

```text
我在《花漾連鎖》串出了華麗連鎖！交換花瓣、保持盤面空間，一起挑戰更高分。
```

## 六、圖片生成紀錄

圖片使用 Codex 內建 ImageGen 產生，之後置中裁切並縮放為 `1200 × 630`。生成提示如下：

```text
Use case: ads-marketing
Asset type: Open Graph social sharing image for an original browser puzzle game
Primary request: a polished wide promotional illustration for the original game Bloomshift, where players swap flower petal panels and create chain reactions on a rising puzzle board
Scene/backdrop: enchanted botanical greenhouse at dawn, soft garden arches and luminous foliage framing the scene
Subject: a centered tall 6-column puzzle board filled with five clearly different flower-themed square panels in rose pink, golden yellow, leaf green, lake blue, and violet; several panels are rising from the bottom while a vivid multi-step chain reaction blossoms near the center with petals, sparkles, and light trails
Style/medium: premium stylized 3D game key art, friendly and magical, clean mobile puzzle game presentation, original visual identity
Composition/framing: 1.91:1 landscape social card, game board large and centered, important action kept inside the central 80 percent safe area, clear silhouette at thumbnail size, balanced framing
Lighting/mood: warm morning light, joyful, energetic, inviting, crisp contrast
Color palette: fresh botanical greens with rose, gold, blue, and violet accents
Materials/textures: glossy dimensional tiles, soft petals, subtle glass greenhouse surfaces
Constraints: no text, no letters, no numbers, no logos, no watermark, no existing copyrighted characters, no UI buttons, exactly five tile families, keep the board readable and grid aligned
Avoid: photorealistic humans, cluttered background, dark horror mood, excessive bloom obscuring the tiles, falling-block tetrominoes
```

## 七、上線檢查

- `index.html` 上線後，canonical、`og:url` 與 JSON-LD URL 必須可公開存取。
- `og-image.png` 回應的 Content-Type 必須是 `image/png`，且不可被 robots 規則阻擋。
- 頁面只能有一個 `<title>`、一個 canonical 與一個主要 `<h1>`。
- 正式發布後再填入真實的 `datePublished`，不要使用規格或素材建立日期代替。
- 將新遊戲加入首頁時，同步更新首頁可見文案、description 與對應遊戲卡。
- 部署後用 Facebook Sharing Debugger、LinkedIn Post Inspector 與 X Card Validator 重新抓取分享卡。
