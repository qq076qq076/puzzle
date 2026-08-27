# 第一階段提示詞與輸出紀錄

執行方式：Codex 內建 imagegen。

風格參考圖：`clownfish-idle-generated.png`（僅作風格參考，不作編輯目標）。

## 小蝦虎

輸出：`fish/goby/goby-idle-generated.png`

```text
Use case: stylized-concept
Asset type: 2D aquarium game fish sprite master artwork
Input images: Image 1 is a STYLE REFERENCE ONLY for pixel density, outline weight, proportions, shading, eye treatment, and finish; do not edit or reproduce the clownfish.
Primary request: create one original small goby fish (小蝦虎) for the Happy Aquarium game, facing right.
Subject: a compact beginner-friendly goby with a slightly elongated sandy-gold body, subtle warm brown mottled bands, rounded head, large friendly glossy eye, small mouth, low dorsal fins, broad resting pectoral fins, and a modest rounded tail; clearly recognizable as a goby and clearly different from a clownfish.
Style/medium: polished chunky pixel-art game sprite matching Image 1: crisp square pixels, cute rounded proportions, thick dark warm-brown outline, simplified two-to-three-step shading, bright controlled highlights, expressive friendly face.
Composition/framing: exactly one fish, full body visible, strict side view, head pointing right, centered with generous transparent padding; horizontal silhouette suitable for a 64x64 runtime sprite after downscaling.
Color palette: sandy gold, ochre, warm beige, muted brown markings, dark brown outline; cohesive saturation with the reference.
Constraints: genuinely transparent background with alpha; no backdrop, no checkerboard, no black field, no halo, no glow, no cast shadow; no text, UI, labels, bubbles, food, plants, props, watermark, or extra fish; preserve crisp hard pixel edges; do not use orange-white-black clownfish bands.
```

## 孔雀魚

初次輸出：`fish/guppy/raw-checkerboard/guppy-idle-generated.png`（背景格紋被烘進 RGB，僅保留為中間稿）。

```text
Use case: stylized-concept
Asset type: 2D aquarium game fish sprite master artwork
Input images: Image 1 is a STYLE REFERENCE ONLY for pixel density, outline weight, proportions, shading, eye treatment, and finish; do not edit or reproduce the clownfish.
Primary request: create one original guppy fish (孔雀魚) for the Happy Aquarium game, facing right.
Subject: a small elegant guppy with a slim turquoise-blue body, warm golden face and belly accents, a very large fan-shaped flowing tail patterned with cobalt, teal, amber, and coral spots, a delicate dorsal fin, one visible pectoral fin, large friendly glossy eye, and a tiny cheerful mouth; unmistakably a guppy and clearly different from a clownfish.
Style/medium: polished chunky pixel-art game sprite matching Image 1: crisp square pixels, cute rounded proportions, thick dark warm-brown outline, simplified two-to-three-step shading, bright controlled highlights, expressive friendly face.
Composition/framing: exactly one fish, full body visible, strict side view, head pointing right, centered with generous transparent padding; horizontal silhouette suitable for a 64x64 runtime sprite after downscaling; keep the ornate tail readable at small size.
Color palette: turquoise, cobalt blue, teal, golden yellow, restrained coral accents, warm dark-brown outline; cohesive saturation with the reference.
Constraints: genuinely transparent background with alpha; no backdrop, no checkerboard, no black field, no halo, no glow, no cast shadow; no text, UI, labels, bubbles, food, plants, props, watermark, or extra fish; preserve crisp hard pixel edges; do not use orange-white-black clownfish bands.
```

背景抽離後正式輸出：`fish/guppy/guppy-idle-transparent.png`

```text
Use case: background-extraction
Asset type: 2D aquarium game fish sprite master artwork
Input images: Image 1 is the EDIT TARGET.
Primary request: remove only the pale checkerboard/white background and replace it with genuine transparent alpha.
Constraints: change only the background; preserve the guppy exactly—same fish design, exact pixel-art silhouette, proportions, pose, right-facing direction, colors, individual pixels, dark warm-brown outline, eye, fins, tail patterns, scale, placement, and canvas size; keep crisp hard pixel edges; no antialiased halo; no glow; no shadow; do not redraw, restyle, crop, resize, recolor, sharpen, blur, or add anything; output one RGBA PNG with true transparency; no text or watermark.
```

## 驗證

- `fish/goby/goby-idle-generated.png`：`1536×1024`、`Format32bppArgb`、四角 alpha = 0。
- `fish/guppy/guppy-idle-transparent.png`：`1536×1024`、`Format32bppArgb`、四角 alpha = 0。
- 兩隻魚皆完整朝右、單一主體、無文字與道具。
