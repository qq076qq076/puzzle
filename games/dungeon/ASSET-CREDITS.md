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

## 本階段素材狀態

runtime manifest 已不再引用其他遊戲的 Kenney 素材，改為指向上述兩個 CraftPix 素材包的本地化路徑：

| dungeon 用途 | manifest 路徑 | 來源 |
| --- | --- | --- |
| 玩家、巨鼠、哥布林 | `assets/fantasy/*.png` | Top-Down Roguelike Game Kit |
| 鋼鐵蜘蛛、Boss、機械地板 | `assets/machine/*.png` | Roguelike Shoot 'em up Game Kit |

由於 CraftPix 免費下載端點要求登入，本次 commit 沒有取得原始 ZIP，因此上述 PNG 尚未放入 repository。缺少檔案時會由 `texture-factory.js` 提供可執行的程序化像素備援；這不代表備援圖形是 CraftPix 原始素材。

## 專案內的使用規則

- 素材只作為《dungeon》遊戲的一部分，不提供素材檔案匯出或單獨下載功能。
- 發佈前再次確認素材頁面與授權頁面的最新版本。
- 若日後加入第三方音效、字型或額外素材，必須在本檔案追加來源與授權。
- 取得並匯入 CraftPix PNG 後，應在本檔案追加實際檔名、作者欄位與版本資訊。
