# 快樂水族箱素材分階段製作

## 共同風格基準

- 參考：`source/clownfish-idle-generated.png`
- 形式：可愛、粗輪廓、高辨識度的像素美術，魚頭預設朝右。
- 線條：深暖棕色粗描邊；避免純黑硬邊。
- 明暗：2～3 階塊面陰影，加少量高光；縮至 `64×64` 仍需清楚。
- 表情：大而有高光的友善眼睛、小嘴。
- 輸出：RGBA 真透明背景，單魚、無文字、無道具、無外發光。

## 資料夾與命名規則

- 每種魚獨立放在 `fish/<species-id>/`，`species-id` 一律使用英文 kebab-case。
- 每個正式資料夾固定只包含 `<species-id>-states.png`。
- 狀態圖集固定為 `256×384`、4 欄 × 6 列、每格 `64×64`、魚頭預設朝右。
- 欄由左至右為動畫第 0～3 幀；列由上至下固定為 `swim`、`hungry`、`eat`、`sick`、`death`、`bubble`。
- `idle` 使用 `swim` 列第 0 幀，不另建檔案。
- 每格內容四周必須保留至少 1 px 透明邊界；禁止直接按高解析母表等分裁切，應使用 `tools/build-fish-state-atlases.ps1` 的內容辨識重排。
- 高解析母表放在 `source/fish/<species-id>/`；假透明中間稿放在該資料夾的 `raw-checkerboard/`。
- 魚種、狀態順序與播放速度的機器可讀規格以 `manifest.json` 為準。
- 舊分片移至 `source/legacy-runtime-split/<species-id>/`；根目錄既有 `clownfish-*.png` 暫時保留為相容檔。新程式只載入 `fish/clownfish/clownfish-states.png`。

## 階段

1. **新手魚母圖（完成）**：小蝦虎、孔雀魚（透明高解析單幀）
2. **新手魚全狀態 runtime（完成）**：小蝦虎、孔雀魚的 idle、swim、hungry、eat、sick、death、bubble
3. **前期魚全狀態（完成）**：燈籠魚、黃金錦鯉、斑馬魚、藍魔鬼
4. **中後期魚全狀態（完成）**：神仙魚、獅子魚、月光魚、龍魚、電鰻、魟魚、彩虹美人魚
5. **非魚類生物與裝置（完成）**：魚卵、魚糧、蘋果螺、清潔蝦、清道夫魚、自動餵食器、水質裝置、寶箱
6. **裝飾與整體驗收（完成）**：30 種裝飾、索引、透明度、尺寸、命名與完整性檢查

每階段先檢查物種辨識、輪廓一致性、透明度與 `64×64` 可讀性，再進入下一階段。

第一階段的實際提示詞與輸出紀錄見 `source/phase-01-prompts.md`。
完整批次提示詞規格與物種設計差異見 `source/GENERATION-PROMPTS.md`。
