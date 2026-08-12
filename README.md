# Puzzle Club

遊戲入口頁與多款響應式網頁遊戲，支援桌面瀏覽器與手機瀏覽器。

## Demo

[開啟 GitHub Pages Demo](https://qq076qq076.github.io/puzzle/)

## 頁面

- `index.html`：遊戲入口，列出專案內所有可遊玩的網頁遊戲。
- `games/2048/`：2048 遊戲本體與規則文件。
- `games/1a2b/`：單機版 1A2B 遊戲與規則文件，電腦自動出題。
- `games/gomoku/`：15×15 本機雙人五子棋與規則文件。
- `games/knife-throw/`：單機射飛刀／見縫插針遊戲、素材與規則文件。
- `games/subaracity/`：單機 SubaraCity 合併城市遊戲、建築素材與規則文件。
- `games/petri-dish/`：2D Canvas 菌境培養皿遊戲、十種菌種、環境屬性與顏色互動規劃文件。
- `games/microorganism/`：150×150 Canvas 黑色與綠色微生物爬行遊戲與規劃文件。
- `games/duquan/`：剪刀、石頭、布各 30 個圖示的 100ms 距離加權模擬遊戲。
- `games/gravity-planet/`：Three.js 重力星球生存遊戲，吸收碎石、進化成 10 階星體並躲避大型星體。
- `games/dice-tower-defense/`：骰塔守境骰子塔防遊戲，包含 15 波敵人、6 種骰塔、骰面充能、合成與首領波；規格與實作補充文件位於遊戲資料夾內。
- `games/rock-paper-scissors/`：使用 WebRTC DataChannel 的雙人 P2P 剪刀石頭布，以 QR Code 或複製貼上交換連線資料，並使用 commit-reveal 驗證出拳。

## 執行

直接以瀏覽器開啟 `index.html`，再從入口頁開始遊玩。若瀏覽器限制本機檔案的儲存功能，可在此資料夾啟動簡易伺服器：

```bash
python3 -m http.server 8000
```

接著開啟 `http://localhost:8000`。

P2P 剪刀石頭布在正式部署時需使用 HTTPS；本機開發可使用 `localhost`。本版使用 STUN 協助穿越 NAT，未配置 TURN，因此部分受限網路可能無法建立 P2P 連線。

## 操作

- 桌面：使用方向鍵，也支援 `W`、`A`、`S`、`D`。
- 手機：在棋盤上上下左右滑動。
- 「重新開始」會建立新棋盤；最高分會儲存在目前裝置的瀏覽器中。

遊戲包含 4×4 棋盤、開局兩個方塊、2/4 隨機生成、每回合每個方塊最多合併一次、2048 勝利提示，以及無法移動時的遊戲結束判定。
