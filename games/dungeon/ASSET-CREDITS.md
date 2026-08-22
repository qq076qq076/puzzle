# dungeon 素材來源與授權備註

## 使用素材

1. [Free Roguelike Shoot 'em up Pixel Art Game Kit](https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/)
2. [Free Top-Down Roguelike Game Kit Pixel Art](https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/)

兩個素材頁面都標示為 2D Pixel Art，並提供 PNG 與 PSD。第一套主要提供奇幻俯視角地城內容；第二套主要提供機械／荒地俯視角內容。

## 目前查閱到的 Freebie 授權重點

依 CraftPix 的 [File Licenses](https://craftpix.net/file-licenses/) 頁面，Freebie 素材：

- 可用於任意數量的個人與商業專案。
- 可以修改素材並放入遊戲、應用程式或其他作品。
- 可以銷售與發行使用這些素材的遊戲。
- 不要求署名或回鏈，但保留署名會受到鼓勵。
- 不可以單獨重新販售 PNG、PSD 或其他原始素材，也不能以讓終端使用者取出素材的方式重新分發。

## 本階段實際使用的本地素材

本階段沒有重新下載或生成素材；runtime manifest 直接重用專案內已提供的 Kenney Tiny Dungeon PNG，來源路徑為 `../dice-tower-defense/assets/`，並維持 nearest-neighbor 顯示：

| dungeon 用途 | 提供素材 |
| --- | --- |
| 玩家 | `enemies/armored-knight.png` |
| 巨鼠 | `enemies/swift-bat.png` |
| 棒棍哥布林 | `enemies/splitter-slime.png` |
| 匕首哥布林 | `enemies/shadow-ghost.png` |
| 鋼鐵蜘蛛 | `enemies/child-spider.png` |
| 蜘蛛護衛／骨面機械王 | `enemies/boss-demon.png` |
| 機械地板 | `road/pebble-road.png` |

Kenney Tiny Dungeon 的既有 `games/dice-tower-defense/assets/enemies/README.md` 標示為 CC0 1.0；遊戲中的行為、色調與預警效果由 dungeon runtime 以程式繪製。素材只從既有 workspace 取用，沒有新增外部下載依賴。

## 專案內的使用規則

- 素材只作為《dungeon》遊戲的一部分，不提供素材檔案匯出或單獨下載功能。
- 發佈前再次確認素材頁面與授權頁面的最新版本。
- 若日後加入第三方音效、字型或額外素材，必須在本檔案追加來源與授權。
- 若日後替換為 CraftPix 素材，仍須在本檔案追加實際檔名、作者欄位與版本資訊；目前不把 CraftPix 檔案宣稱為已匯入素材。
