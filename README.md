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
- `games/rock-paper-scissors/`：使用 WebRTC DataChannel 的雙人 P2P 剪刀石頭布，以邀請網址 QR Code／複製網址配對，並使用 commit-reveal 驗證出拳。
- `games/harvest-clicker/`：15×15 Canvas 點擊農場，包含 25 塊土地、農具游標、3×3 種植、自動收割、灑水、肥料及離線結算。

## 執行

直接以瀏覽器開啟 `index.html`，再從入口頁開始遊玩。若瀏覽器限制本機檔案的儲存功能，可在此資料夾啟動簡易伺服器：

```bash
python3 -m http.server 8000
```

接著開啟 `http://localhost:8000`。

## Firebase 雲端存檔

除了剪刀石頭布以外，其餘 11 款遊戲已接上共用 Firebase 存檔層。未設定 Firebase 時，遊戲會自動退回原本的 `localStorage`；設定完成後，未登入時使用匿名 Authentication，登入 Google／Facebook 後即可跨裝置恢復進度，Email 登入則可按需展開。存檔寫入：

```text
users/{uid}/saves/{gameId}
```

啟用方式：

1. 在 Firebase Console 建立 Web App 與 Cloud Firestore database；Authentication 的 Anonymous 與 Email/Password provider 已寫入 `firebase.json`，可由 CLI 部署。
2. 將 Web app config 填入 [`games/firebase-config.js`](games/firebase-config.js)。這些 Web config 可以放在前端，資料存取由 Authentication 與 [`firestore.rules`](firestore.rules) 保護。
3. 將 `localhost` 與正式網域（例如 `qq076qq076.github.io`）加入 Firebase Authentication 的 Authorized domains。
4. 在 Firebase Console → Authentication → Sign-in method 啟用 Google；Facebook 另外需要 Facebook App ID、App Secret，並將 `https://puzzle-56941.firebaseapp.com/__/auth/handler` 加入 Facebook Login 的 OAuth redirect URI。
5. 使用 Firebase CLI 登入並部署 Authentication 與 Firestore 規則：

```bash
firebase deploy --only auth,firestore:rules
```

Firebase SDK 會從瀏覽器 module CDN 載入；使用本機 `file://` 開啟時請改用上面的 `python3 -m http.server 8000`。雲端寫入採延遲同步，`localStorage` 仍會保留作為離線與連線失敗時的 fallback。

登入與跨裝置測試：在裝置 A 開啟遊戲右上角的「登入雲端」，優先選 Google 或 Facebook；第一次登入會將目前匿名存檔連結到社群帳號。在裝置 B 開啟同一網站並登入相同帳號，頁面重新載入後會確認 `users/{uid}/saves/{gameId}` 的雲端存檔；只有雲端的伺服器 `savedAt` 確實較新時才載入，不再用不同裝置的 `createdAt` 阻擋新進度。登入前會先等待目前遊戲的本地存檔與待寫入雲端佇列完成，避免登入瞬間遺失最新操作。每筆存檔使用伺服器時間、伺服器版本號與樂觀鎖，避免較舊分頁覆蓋較新資料。右上角會顯示帳號名稱並可點開登出。登入後每次本地 autosave 都會同步到雲端。Email 登入可按「使用 Email 登入」展開。同一個農場開啟多個分頁時，只有目前作用中的分頁會自動存檔；背景分頁收到較新存檔會載入，前景分頁若有未保存變更則會先詢問。

P2P 剪刀石頭布在正式部署時需使用 HTTPS；本機開發可使用 `localhost`。遊戲先嘗試直連與 STUN，失敗時使用第三方 TURN 中繼，以改善受限網路的連線成功率。正式上線建議替換為自己管理的 TURN 與限時憑證；可在載入 `script.js` 前設定 `window.RPS_ICE_SERVERS` 覆寫預設清單。

```html
<script>
  window.RPS_ICE_SERVERS = [{
    urls: "turn:turn.example.com:443?transport=tcp",
    username: "temporary-user",
    credential: "temporary-credential"
  }];
</script>
```

## 操作

- 桌面：使用方向鍵，也支援 `W`、`A`、`S`、`D`。
- 手機：在棋盤上上下左右滑動。
- 「重新開始」會建立新棋盤；最高分會儲存在目前裝置的瀏覽器中。

遊戲包含 4×4 棋盤、開局兩個方塊、2/4 隨機生成、每回合每個方塊最多合併一次、2048 勝利提示，以及無法移動時的遊戲結束判定。
