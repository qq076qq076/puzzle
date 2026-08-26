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

### 奇幻角色／怪物的實際幀數

每個角色或怪物資料夾實際有 16 張 PNG：1 張數字命名的預覽圖，加上 15 張三方向動作圖。動作圖的尺寸可直接換算幀數，單格固定為 32×32：

| 動作 | 檔案尺寸 | 每方向幀數 | 適合在遊戲中的時機 |
| --- | --- | ---: | --- |
| `Idle` | 128×32 | 4 | 沒有移動、等待攻擊 |
| `Walk` | 192×32 | 6 | 追擊、巡邏、受地形限制移動 |
| `Attack` | 128×32 | 4 | 近戰攻擊的命中窗口 |
| `Hurt` | 64×32 | 2 | 受擊閃爍與擊退 |
| `Death` | 256×32 | 8 | 死亡後播放一次 |

`D_Attack.png`、`S_Attack.png`、`U_Attack.png` 並沒有左右兩張側面圖；`S` 應視為一個側面來源，朝左時使用水平翻轉。四個 `3 Dungeon Enemies/1..4/` 資料夾的檔案集合與尺寸一致，因此可以共用動畫 manifest，只替換 texture key。

資料夾內的 `1.png`、`2.png`、`3.png`、`4.png` 是 256×480 的角色預覽／展示圖，不是 32×32 動畫 spritesheet，不應拿來當戰鬥角色的 runtime texture。

### 地板、牆壁與房間元素

- `2 Dungeon Tileset/1 Tiles/`：16×16 地板、牆壁與轉角 tile。房間牆壁應依照方向選用不同的橫牆、豎牆與四個轉角素材，不能用同一張圖硬套所有方向。
- `2 Dungeon Tileset/2 Objects/`：`Blockage`、`Bookshelf`、`Bookshelf decor`、`Boxes`、`Chairs`、`Doors`、`Other`、`Tables`、`Torches`、`Trapdoors`。
- `2 Dungeon Tileset/3 Animated objects/`：`Door_S/U/D`、`BigDoor_S/U/D`、`Chest1/2_S/U/D`、`Trapdoor_S/U/D`、`Spikes`、`Lever1/2` 與 `Fire1`。
- `Fire1.png` 是 8 幀、16×16 單格的火焰動畫；火把或火焰不能只顯示其中一幀。
- `Spikes.png` 是 6 幀、17×17 單格的陷阱動畫，可作為會傷害玩家與怪物的地板陷阱。
- `Door_S.png` 是 4 幀、14×26 單格的側向門動畫；`Door_U/D.png` 是上下方向的門動畫。

### GUI

`4 GUI/` 分為 `Interface`、`Buttons`、`Icons`、`Bars`、`Scrolling`、`Logo`，適合生命條、獎勵選擇框、buff icon、按鈕與遊戲介面。數字命名的 icon 必須先用預覽或實機確認語意，不應只依檔名猜用途。

### 奇幻 Tileset 的結構與限制

- `1 Tiles/` 有 83 張 16×16 單 tile，以及 `Tileset.png`（304×176）總覽圖。單 tile 適合程式化鋪房間；`Tileset.png` 適合美術查找，不應整張當成地板。
- `2 Objects/` 有 160 張分類物件圖，以及 `Objects.png`（336×192）物件總覽圖。物件尺寸不是固定 16×16，家具、書櫃和門常會超過一格，碰撞框必須另行定義。
- 物件分類有 `Blockage`、`Bookshelf`、`Bookshelf decor`、`Boxes`、`Chairs`、`Doors`、`Other`、`Tables`、`Torches`、`Trapdoors`；其中 `Bookshelf decor` 是小型裝飾，不應誤設成可阻擋的大型書櫃。
- `3 Animated objects/` 的檔案不是同一種大小：門、寶箱、火焰、尖刺、拉桿與活板門各自有不同單格尺寸，必須在 manifest 中為每一種 sheet 指定獨立的 frameWidth、frameHeight 與 frameCount。

目前已確認的動畫尺寸如下：

| 素材 | 整張尺寸 | 單格尺寸 | 幀數 |
| --- | --- | --- | ---: |
| `Door_S.png` | 56×26 | 14×26 | 4 |
| `Door_U/D.png` | 80×20 | 20×20 | 4 |
| `BigDoor_S.png` | 180×42 | 45×42 | 4 |
| `BigDoor_U/D.png` | 216×36 | 54×36 | 4 |
| `Chest1/2_S/U/D.png` | 64×24 | 16×24 | 4 |
| `Fire1.png` | 128×16 | 16×16 | 8 |
| `Lever1/2.png` | 64×18 | 約 16×18 | 4 |
| `Spikes.png` | 102×17 | 17×17 | 6 |
| `Trapdoor_S/U/D.png` | 132×32 | 22×32 | 6 |

### 奇幻牆體與房間生成的使用建議

`Tile_15`、`Tile_16`、`Tile_31` 是一般牆面／裂紋候選；目前 Dungeon 另為房間框架指定八個方向素材：

| 位置 | 目前使用的檔案 |
| --- | --- |
| 上水平牆 | `Tile_59.png` |
| 下水平牆 | `Tile_98.png` |
| 左垂直牆 | `Tile_87.png` |
| 右垂直牆 | `Tile_88.png` |
| 左上、右上角 | `Tile_57.png`、`Tile_61.png` |
| 左下、右下角 | `Tile_91.png`、`Tile_93.png` |

這八張都是 16×16，應以 tile 的實際可見邊緣對齊。門洞不能只把門 sprite 疊在完整牆上；生成房間時需要先切開相應方向的牆碰撞與牆視覺，再放置門動畫，否則會出現門旁空氣牆或角色被擋在門外的問題。`wall-fantasy-cracked` 與 `wall-fantasy-alt` 目前都指向 `Tile_31.png`，是同一張圖的兩個語意 key，不是兩個不同外觀。

### 奇幻包的可用元素與碰撞分類

| 分類 | 遊戲用途 | 碰撞／傷害建議 |
| --- | --- | --- |
| `Blockage` | 石堆、障礙牆、房間內掩體 | 建立矩形阻擋，視覺中心要對齊障礙矩形 |
| `Boxes`、`Tables`、`Bookshelf` | 家具、箱子、書櫃 | 大型物件阻擋；小型箱子可作裝飾或可破壞物 |
| `Chairs`、`Other` | 地面散落物、瓶子、骨頭、武器、蠟燭 | 多數只作非阻擋裝飾，瓶子另掛可破壞與掉落邏輯 |
| `Torches`、`Fire1` | 牆上火把與火焰 | 火焰要播放 8 幀；牆上火把不應成為角色可穿越的地面障礙 |
| `Spikes` | 地板陷阱 | 播放升降動畫，傷害玩家與怪物，傷害區不可只跟最後一幀綁定 |
| `Doors`、`Trapdoors` | 出入口、機關或特殊房間 | 動畫狀態與碰撞狀態同步，關閉時阻擋、開啟後移除阻擋 |

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
- `Without_shadow` 的玩家 spritesheet 使用 64×64 單格，四個方向依序是下、左、右、上；目前 manifest 已登記三個等級的全部八種動作。
- `Idle` 每方向 12 幀、`Walk` 每方向 6 幀、`attack` 每方向 8 幀。載入時需依行偏移選正確方向，不能把整張四方向圖當成單一動畫播放。
- `ASEPRITE/` 與 `PSD/` 是可編輯的原始來源，`Tiled_files/` 含分件圖與 TMX；這些不應直接由瀏覽器載入。

目前 runtime 路徑會依房間進度使用：

```text
./player/PNG/Swordsman_lvl1/Without_shadow/
./player/PNG/Swordsman_lvl2/Without_shadow/
./player/PNG/Swordsman_lvl3/Without_shadow/
```

玩家影子使用同一包的 `shadow_single.png`，角色本體與影子應保持接近，避免產生浮空感。

### 玩家 PNG 的完整動作表

`PNG/Swordsman_lvl1`、`PNG/Swordsman_lvl2`、`PNG/Swordsman_lvl3` 的主體圖都是 64×64 單格、4 列方向（下、左、右、上）。同一動作的整張寬度可直接換算每方向幀數：

| 動作 | 主要檔案 | 整張尺寸 | 每方向幀數 | 說明 |
| --- | --- | --- | ---: | --- |
| Idle | `*_Idle_without_shadow.png` | 768×256 | 12 | 待機循環 |
| Walk | `*_Walk_without_shadow.png` | 384×256 | 6 | 一般移動循環 |
| Walk Attack | `*_Walk_Attack_without_shadow.png` | 384×256 | 6 | 移動中揮刀 |
| Run | `*_Run_without_shadow.png` | 512×256 | 8 | 高速移動／閃避可用的視覺基礎 |
| Run Attack | `*_Run_Attack_without_shadow.png` | 512×256 | 8 | 移動中攻擊 |
| Attack | `*_attack_without_shadow.png` | 512×256 | 8 | 近戰攻擊主動畫 |
| Hurt | `*_Hurt_without_shadow.png` | 320×256 | 5 | 受傷與擊退反饋 |
| Death | `*_Death_without_shadow.png` | 448×256 | 7 | 死亡一次性動畫 |

`With_shadow` 是已經把影子合成進每一幀的版本；目前遊戲採用 `Without_shadow`，再以 `shadow_single.png` 獨立放置影子，方便調整腳底位置。`shadow_death.png` 是死亡狀態的影子，不應與一般移動影子混用。

### 玩家 Parts、方向與可替換性

- 每個等級的 `Parts/` 目標是 48 張分件圖，包含 body、head、sword、shadow、swing 等層，可用於需要單獨換武器或做受傷染紅的情況。
- `With_shadow/` 與 `Without_shadow/` 適合直接播放；`Parts/` 適合需要分層組合的客製化角色，不應與完整合成圖同時疊加，否則會出現兩把劍或兩個影子。
- `ASEPRITE/` 每個等級有 8 個動作、每個動作 4 個方向，共 96 個來源檔；`PSD/` 每個等級有 8 個動作來源；`Tiled_files/` 是分件圖與 TMX 編輯資料。
- 玩家四方向的行順序必須固定使用下、左、右、上。左右不能靠把「下」或「上」的素材旋轉來代替；側面圖應使用對應的 `side_left`、`side_right`。

### 玩家素材盤點時發現的來源一致性問題

目前 `PNG/Swordsman_lvl3/Parts/` 有 5 張檔名仍是 `Swordsman_lvl2_Death_*.png`，而且相對應的 `Swordsman_lvl3_Hurt_body/head/red/sword/sword_back.png` 未出現在該資料夾。這不影響目前使用的完整 `Without_shadow` runtime 圖，但若未來改用 lvl3 的 Parts 組合，會載入錯誤或缺圖；建議先在素材整理階段確認來源包，再決定是否重新命名或補齊，不應在程式中靜默以 lvl2 素材代替。

### 玩家素材的選擇建議

1. 玩家已使用 `lvl1`、`lvl2`、`lvl3` 的完整 `Without_shadow` 合成圖，並依房間進度切換外觀。
2. 閃避播放 `Run_without_shadow`，閃避後立即攻擊播放 `Run_Attack_without_shadow`；無敵時間與位移仍由遊戲邏輯獨立控制。
3. 待機、行走、移動攻擊、跑步、跑步攻擊、原地攻擊、受傷與死亡均已接到對應動畫；換用 Parts 前仍必須先處理 lvl3 的來源一致性問題。
4. 攻擊不要同時播放 `attack_without_shadow` 與 `attack_swing`。前者是完整角色動畫，後者是 Parts 中的揮刀分件；二者只能擇一，否則會產生重複武器或錯位。

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
| 玩家 | `player/PNG/Swordsman_lvl1..3/Without_shadow/` 的四方向八種完整動作，依進度升級外觀 |
| 巨鼠、哥布林、法師 | `roguelike-game-kit-pixel-art/3 Dungeon Enemies/1..4/` 的 Idle、Walk、Attack、Hurt、Death |
| 墓穴斥候、墓室弓手、虛空騎士 | `roguelike-game-kit-pixel-art/1 Characters/1..3/`，分別使用衝刺、箭矢與重型近戰行為 |
| 奇幻房間地板 | `roguelike-game-kit-pixel-art/2 Dungeon Tileset/1 Tiles/Tile_20.png`、`Tile_21.png`、`Tile_22.png` |
| 奇幻房間牆壁 | `Tile_15.png`、`Tile_16.png`、`Tile_31.png` 與 `Tile_57/59/61/87/88/91/93/98.png` |
| 房間門 | `2 Dungeon Tileset/3 Animated objects/Door_S/U/D.png` 與 `BigDoor_S/U/D.png` |
| 陷阱 | `2 Dungeon Tileset/3 Animated objects/Spikes.png` 與三方向 `Trapdoor` |
| 火把／火焰 | `2 Dungeon Tileset/3 Animated objects/Fire1.png`，搭配 8 種火把座 |
| 寶箱、機關與家具 | 動畫 `Chest1/2`、`Lever1/2`，以及 Blockages、Bookshelves、Bookshelf decor、Boxes、Chairs、Other、Tables 的可用 PNG |
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

- 玩家 Parts 可用於未來的武器分層換裝，但必須先修正 lvl3 的來源檔一致性。
- 動畫寶箱、拉桿、活板門與大門目前已用於一般房間；後續可再加入實際機關連鎖或特殊房解謎邏輯。
- 已納入房間候選池的家具仍可依房型增加語意規則，例如書櫃成排、桌椅成組或障礙物形成掩體。
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
