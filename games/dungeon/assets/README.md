# Dungeon 素材分析

本文件是 `games/dungeon/assets/` 的素材盤點與使用規則。盤點以目前工作區的實際檔案為準；素材來源是 CraftPix，使用時仍須遵守各素材包附帶的授權條款。

## 結論

目前的素材可以完整支援 Dungeon 的主要美術需求：

- `roguelike-game-kit-pixel-art/` 適合作為奇幻地牢的主要房間、牆壁、門、陷阱、寶箱、家具、怪物與 GUI。
- `shoot/` 適合作為機械風格房間、機器人／鋼鐵蜘蛛、雷射與其他遠程武器、傳送門及獎勵祭壇。
- `player/` 是最完整的玩家劍士素材，包含四方向與多種移動、攻擊、受傷、死亡動畫。
- `water-and-fire-magic-sprite-vector-pack/` 適合做火球、水球、箭矢與法術飛行特效；目前遊戲使用 Fire Ball 的 8 張 PNG 動畫幀。
- `fantasy/` 與 `machine/` 目前只有 `.gitkeep`，是預留目錄，不是可用素材來源。

素材根目錄共有約 2,702 個檔案。數量包含 PSD、Aseprite、TMX、授權文件、預覽圖與系統檔，不代表全部都會被瀏覽器載入。

## 素材包總覽

| 目錄 | 原始檔案數 | 主要內容 | 適合用途 |
| --- | ---: | --- | --- |
| `roguelike-game-kit-pixel-art/` | 1,316 | 1,228 張 PNG、PSD、TMX、GUI 與 Tiled 編輯資料 | 奇幻地牢房間與一般怪物 |
| `shoot/` | 746 | 662 張 PNG、PSD、機械地板、武器、特效與 GUI | 機械房間、機器人、鋼鐵蜘蛛與雷射 |
| `player/` | 498 | 364 張 PNG、96 張 Aseprite、24 張 PSD、3 個 TMX | 玩家劍士的完整動作 |
| `water-and-fire-magic-sprite-vector-pack/` | 138 | 58 張 PNG、58 張 EPS、7 張 AI、6 張 GIF | 火焰／水系法術與投射物 |

## 目錄結構

```text
assets/
├── player/                                  # 玩家劍士原始素材
├── roguelike-game-kit-pixel-art/            # 奇幻地牢素材包
├── shoot/                                   # Roguelike shoot'em up 機械素材包
├── water-and-fire-magic-sprite-vector-pack/ # 火焰／水系法術素材包
├── fantasy/                                 # 預留目錄，目前只有 .gitkeep
└── machine/                                 # 預留目錄，目前只有 .gitkeep
```

Vite 將 `games/dungeon/assets/` 當作 public directory。程式中的路徑從 `./` 開始，定義集中在 [`src/data/assets.js`](../src/data/assets.js)。路徑中的空白、大小寫與資料夾名稱必須完全一致。

## 1. roguelike-game-kit-pixel-art：奇幻地牢主素材

來源：[Free Top-Down Roguelike Game Kit Pixel Art](https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/)

### 角色與怪物

- `1 Characters/1..3/`：三組角色，每組都有 `D`（下）、`S`（側）、`U`（上）三個方向。
- 每組包含 `Idle`、`Walk`、`Attack`、`Hurt`、`Death`，可支援一般怪物的完整戰鬥狀態。
- `3 Dungeon Enemies/1..4/`：四組敵人，檔名結構與角色素材相同，適合巨鼠、哥布林、法師等不同敵人。
- 角色動畫通常是 32×32 單格：`Idle` 4 幀、`Walk` 6 幀、`Attack` 4 幀、`Hurt` 2 幀、`Death` 8 幀。
- `Other/` 有血液、火球、箭與影子等輔助素材。

### 地板、牆壁與房間元素

- `2 Dungeon Tileset/1 Tiles/`：16×16 地板、牆壁與轉角 tile。房間牆壁應依照方向選用不同的橫牆、豎牆與四個轉角素材，不能用同一張圖硬套所有方向。
- `2 Dungeon Tileset/2 Objects/`：`Blockage`、`Bookshelf`、`Bookshelf decor`、`Boxes`、`Chairs`、`Doors`、`Other`、`Tables`、`Torches`、`Trapdoors`。
- `2 Dungeon Tileset/3 Animated objects/`：`Door_S/U/D`、`BigDoor_S/U/D`、`Chest1/2_S/U/D`、`Trapdoor_S/U/D`、`Spikes`、`Lever1/2` 與 `Fire1`。
- `Fire1.png` 是 8 幀、16×16 單格的火焰動畫；火把或火焰不能只顯示其中一幀。
- `Spikes.png` 是 6 幀、17×17 單格的陷阱動畫，可作為會傷害玩家與怪物的地板陷阱。
- `Door_S.png` 是 4 幀、14×26 單格的側向門動畫；`Door_U/D.png` 是上下方向的門動畫。

### GUI

`4 GUI/` 分為 `Interface`、`Buttons`、`Icons`、`Bars`、`Scrolling`、`Logo`，適合生命條、獎勵選擇框、buff icon、按鈕與遊戲介面。數字命名的 icon 必須先用預覽或實機確認語意，不應只依檔名猜用途。

## 2. shoot：機械與科幻素材

來源：[Free Roguelike Shoot 'em up Pixel Art Game Kit](https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/)

### 機械角色、武器與特效

- `1 Main Character/1 Character/`：三組機械角色行走圖 `Walk1..3.png` 與死亡圖 `Death1..3.png`。
- `1 Main Character/2 Weapons/`：武器圖片與 `Projectiles/1..22.png` 投射物，適合機器人攻擊、雷射與其他遠程攻擊。
- `1 Main Character/3 Effects/`：多組三幀特效，可用於爆炸、命中與槍械回饋。
- `1 Main Character/4 Icons/`：機械角色與武器 icon。
- 目前 Dungeon 使用 `Projectiles/10.png` 作為一般敵人投射物，`Projectiles/15.png` 作為雷射投射物。

### 機械房間與敵人

- `2 Location/1 Tiles/`：機械地板與牆壁 tile。
- `2 Location/2 Objects/`：`Grass`、`Portals`、`Rocks`、`XP` 等場景元素。
- `2 Location/3 Animated objects/`：`Portal1/2_Idle`、`Portal1/2_Start`、`Altar_Idle/Start`，適合入口、傳送門與獎勵房間。
- `3 Enemies/1..6/`：每組包含 `RunSD`、`RunSU`、`DeathSD`、`DeathSU`。這包的敵人素材主要提供移動與死亡，沒有像奇幻敵人一樣的獨立近戰攻擊序列；攻擊應搭配投射物或效果素材處理。
- `3 Enemies/7 Icons` 與 `8 Other`：敵人 icon、`Dust`、`Boom`、`DropPod`、`Target` 等效果。
- `4 GUI/` 提供另一套機械風格的介面、按鈕、icon、bar、滾動條、logo 與 cursor。

## 3. player：玩家劍士素材

這是玩家目前使用的主要素材來源。素材分為 `Swordsman_lvl1`、`Swordsman_lvl2`、`Swordsman_lvl3` 三個等級，並提供：

- `Idle`、`Walk`、`Attack`、`Walk_Attack`、`Run`、`Run_Attack`、`Death`、`Hurt`。
- `With_shadow`、`Without_shadow`、`Parts` 等變體。
- 每個動作都有 `front`、`back`、`side_left`、`side_right` 四個方向。
- `Without_shadow` 的玩家 spritesheet 使用 64×64 單格，四個方向依序是下、左、右、上；目前 manifest 使用 `Swordsman_lvl1` 的 `Idle`、`Walk`、`attack`。
- `Idle` 每方向 12 幀、`Walk` 每方向 6 幀、`attack` 每方向 8 幀。載入時需依行偏移選正確方向，不能把整張四方向圖當成單一動畫播放。
- `ASEPRITE/` 與 `PSD/` 是可編輯的原始來源，`Tiled_files/` 含分件圖與 TMX；這些不應直接由瀏覽器載入。

目前 runtime 路徑：

```text
./player/PNG/Swordsman_lvl1/Without_shadow/
```

玩家影子使用同一包的 `shadow_single.png`，角色本體與影子應保持接近，避免產生浮空感。

## 4. water-and-fire-magic-sprite-vector-pack：法術特效

素材包含 `Fire Arrow`、`Fire Ball`、`Fire Spell`、`Water Arrow`、`Water Ball`、`Water Spell` 與 `Icons`：

- Fire Arrow、Fire Ball、Fire Spell、Water Arrow 與 Water Spell 各提供 8 幀 PNG；Water Ball 提供 12 幀 PNG。各系列另有對應的 EPS、AI 與 GIF 預覽。
- Fire Ball 的 PNG 單張是 640×640，遊戲內應縮放到投射物尺寸，不要直接以原始像素尺寸顯示。
- 目前使用：`Fire Ball/PNG/Fire Ball_Frame_01..08.png`，以 8 張圖片組成循環火球動畫。
- EPS、AI 適合美術編輯與輸出，不適合瀏覽器 runtime；GIF 主要是預覽，不作為遊戲動畫來源。
- Water Ball、Water Spell、Fire Arrow 等素材可留作後續 buff、魔法武器或 Boss 技能。

目前 runtime 路徑：

```text
./water-and-fire-magic-sprite-vector-pack/Fire Ball/PNG/
```

## 目前 Dungeon 的使用對照

| 遊戲用途 | 使用素材 |
| --- | --- |
| 玩家 | `player/PNG/Swordsman_lvl1/Without_shadow/` 的四方向 Idle、Walk、Attack |
| 巨鼠、哥布林、法師 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/1..4/` |
| 奇幻房間地板 | `roguelike-game-kit-pixel-art/2 Dungeon Tileset/1 Tiles/Tile_20.png`、`Tile_21.png`、`Tile_22.png` |
| 奇幻房間牆壁 | `Tile_15.png`、`Tile_16.png`、`Tile_31.png` 與 `Tile_57/59/61/87/88/91/93/98.png` |
| 房間門 | `2 Dungeon Tileset/3 Animated objects/Door_S/U/D.png` |
| 陷阱 | `2 Dungeon Tileset/3 Animated objects/Spikes.png` |
| 火把／火焰 | `2 Dungeon Tileset/3 Animated objects/Fire1.png` |
| 寶箱與家具 | `2 Dungeon Tileset/2 Objects/Boxes`、`Tables`、`Chairs`、`Other` |
| 機器人與 Boss | `shoot/3 Enemies/` 與 `shoot/1 Main Character/1 Character/` |
| 機械房間元素 | `shoot/2 Location/` |
| 一般投射物與雷射 | `shoot/1 Main Character/2 Weapons/Projectiles/10.png`、`15.png` |
| 法師火球 | `water-and-fire-magic-sprite-vector-pack/Fire Ball/PNG/` |
| 命中、爆炸與出生特效 | `roguelike-game-kit-pixel-art/1 Characters/Other`、`shoot/1 Main Character/3 Effects`、`shoot/3 Enemies/8 Other` |
| 生命、獎勵與 buff icon | `roguelike-game-kit-pixel-art/4 GUI/3 Icons` |

## 動畫、方向與碰撞規則

1. 有動作序列的素材必須以 spritesheet 或逐幀動畫播放。不可只載入 `Fire1.png`、`Spikes.png`、門或寶箱的第一幀來假裝是動畫。
2. 奇幻角色使用 `D/S/U`：下、側、上；玩家素材使用四列：下、左、右、上；機械敵人使用 `SD/SU`，左右方向需要依目前的朝向規則翻轉。
3. 房間牆壁要使用對應的水平、垂直與轉角 tile；門洞、牆角和門與牆之間要補滿，並讓碰撞矩形與可見牆體一致。
4. 房間內家具、箱子、瓶子、陷阱與怪物生成點必須留出牆壁、門口與障礙物安全距離。牆面裝飾可以貼牆，但可移動物件不應生成在牆上。
5. 有碰撞的素材必須同時建立物理障礙或傷害區：牆與大型家具阻擋角色，尖刺對玩家與怪物都造成傷害，瓶子破壞後才產生掉落物。
6. 影子優先使用素材包附帶的影子；若角色換成其他等級，必須重新校正影子相對於腳底的位置。
7. 所有 runtime 資產都應登記在 `src/data/assets.js`，並由 `test/assets.test.mjs` 驗證檔案存在、spritesheet 尺寸與幀數。

## 可用於後續擴充的素材

- 玩家 `Swordsman_lvl2`、`Swordsman_lvl3`，可作為解鎖角色或升級外觀。
- 奇幻包的 `BigDoor`、`Chest1/2`、`Trapdoor`、`Lever`，可用於特殊房間、機關與 Boss 房。
- 奇幻包的其他家具、書櫃、桌椅、障礙物與瓶子，可擴充房間主題。
- Shoot 包的 `Portal2`、`Altar`、`Boom`、`DropPod`、`Target` 與三組角色死亡圖。
- Shoot 包的其他投射物、武器與三幀效果，可增加機器人與 Boss 攻擊模式。
- 法術包的 Water Ball、Water Spell、Fire Arrow，可作為 buff、法術分支或 Boss 技能。

## 不應直接載入 runtime 的檔案

`PSD`、`ASEPRITE`、`TMX`、`AI`、`EPS` 是編輯或輸出來源；`GIF` 是預覽素材。`COUPON`、`.url`、授權文件、`__MACOSX` 與 `.DS_Store` 不是遊戲美術資源，也不應加入 preload manifest。

## 授權與來源

- [CraftPix Free Top-Down Roguelike Game Kit Pixel Art](https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/)
- [CraftPix Free Roguelike Shoot 'em up Pixel Art Game Kit](https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/)
- [CraftPix File Licenses](https://craftpix.net/file-licenses/)

各素材包的 `license.txt`、`License.txt` 與來源連結檔保留在對應目錄中。發佈、商用或重新分發前，應以 CraftPix 最新授權頁面與素材包內文件為準。
