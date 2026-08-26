export const CRAFTPIX_SOURCES = {
  fantasy: {
    name: "Free Top-Down Roguelike Game Kit Pixel Art",
    pageUrl: "https://craftpix.net/freebies/free-top-down-roguelike-game-kit-pixel-art/",
    downloadUrl: "https://craftpix.net/download/76854/",
  },
  machine: {
    name: "Free Roguelike Shoot 'em up Pixel Art Game Kit",
    pageUrl: "https://craftpix.net/freebies/free-roguelike-shoot-em-up-pixel-art-game-kit/",
    downloadUrl: "https://craftpix.net/download/78014/",
  },
};

const FANTASY_ROOT = "./roguelike-game-kit-pixel-art";
const MACHINE_ROOT = "./shoot";
const playerRoot = (level) => `./player/PNG/Swordsman_lvl${level}/Without_shadow`;
const MAGIC_ROOT = "./water-and-fire-magic-sprite-vector-pack/Fire Ball/PNG";
const OBJECT_ROOT = `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects`;
const ANIMATED_OBJECT_ROOT = `${FANTASY_ROOT}/2 Dungeon Tileset/3 Animated objects`;
const FIREBALL_FRAME_KEYS = Object.freeze(Array.from(
  { length: 8 },
  (_, index) => index === 0 ? "spell-projectile" : `spell-projectile-${String(index + 1).padStart(2, "0")}`,
));
const fireballImages = Object.fromEntries(FIREBALL_FRAME_KEYS.map((key, index) => [
  key,
  `${MAGIC_ROOT}/Fire Ball_Frame_${String(index + 1).padStart(2, "0")}.png`,
]));

function numberedImageSeries(keyPrefix, folder, count, excluded = []) {
  const excludedNumbers = new Set(excluded);
  return Object.fromEntries(Array.from({ length: count }, (_, index) => index + 1)
    .filter((number) => !excludedNumbers.has(number))
    .map((number) => [`${keyPrefix}-${number}`, `${OBJECT_ROOT}/${folder}/${number}.png`]));
}

const dungeonObjectImages = {
  ...numberedImageSeries("dungeon-blockage", "Blockage", 8),
  ...numberedImageSeries("dungeon-bookshelf", "Bookshelf", 12),
  ...numberedImageSeries("dungeon-bookshelf-decor", "Bookshelf decor", 40),
  ...numberedImageSeries("dungeon-box", "Boxes", 16),
  ...numberedImageSeries("dungeon-chair", "Chairs", 14),
  ...numberedImageSeries("dungeon-other", "Other", 44, [5, 6, 7, 8]),
  ...numberedImageSeries("dungeon-table", "Tables", 8),
  ...numberedImageSeries("dungeon-torch-mount", "Torches", 8),
};

function sheet(key, path, frameWidth, frameHeight, frameCount, frameRate, repeat = -1, options = {}) {
  return { key, path, frameWidth, frameHeight, frameCount, frameRate, repeat, ...options };
}

function swordsmanPlayer(level = 1) {
  const texturePrefix = level === 1 ? "provided-player" : `provided-player-lvl${level}`;
  const root = playerRoot(level);
  const filePrefix = `Swordsman_lvl${level}`;
  const directions = { down: 0, left: 1, right: 2, up: 3 };
  const states = {
    idle: { key: texturePrefix, file: `${filePrefix}_Idle_without_shadow.png`, frames: 12, frameRate: 8, repeat: -1 },
    walk: { key: `${texturePrefix}-walk`, file: `${filePrefix}_Walk_without_shadow.png`, frames: 6, frameRate: 11, repeat: -1 },
    run: { key: `${texturePrefix}-run`, file: `${filePrefix}_Run_without_shadow.png`, frames: 8, frameRate: 18, repeat: -1 },
    attack: { key: `${texturePrefix}-attack`, file: `${filePrefix}_attack_without_shadow.png`, frames: 8, frameRate: 36, repeat: 0 },
    walkAttack: { key: `${texturePrefix}-walk-attack`, file: `${filePrefix}_Walk_Attack_without_shadow.png`, frames: 6, frameRate: 28, repeat: 0 },
    runAttack: { key: `${texturePrefix}-run-attack`, file: `${filePrefix}_Run_Attack_without_shadow.png`, frames: 8, frameRate: 36, repeat: 0 },
    hurt: { key: `${texturePrefix}-hurt`, file: `${filePrefix}_Hurt_without_shadow.png`, frames: 5, frameRate: 22, repeat: 0 },
    death: { key: `${texturePrefix}-death`, file: `${filePrefix}_Death_without_shadow.png`, frames: 7, frameRate: 12, repeat: 0 },
  };
  const actorStates = {};
  Object.entries(states).forEach(([state, animation]) => {
    actorStates[state] = {};
    Object.entries(directions).forEach(([direction, row]) => {
      const start = row * animation.frames;
      actorStates[state][direction] = sheet(
        animation.key,
        `${root}/${animation.file}`,
        64,
        64,
        animation.frames,
        animation.frameRate,
        animation.repeat,
        { start, end: start + animation.frames - 1, textureFrameCount: animation.frames * 4, sheetRows: 4 },
      );
    });
  });
  return { baseTexture: texturePrefix, directionalSides: true, states: actorStates };
}

function fantasyActor(textureKey, folder, options = {}) {
  const root = `${FANTASY_ROOT}/${folder}`;
  const directionFile = { down: "D", side: "S", up: "U" };
  const stateFile = {
    idle: { suffix: "Idle", frameCount: 4, frameRate: 6, repeat: -1 },
    walk: { suffix: "Walk", frameCount: 6, frameRate: 11, repeat: -1 },
    attack: { suffix: "Attack", frameCount: 4, frameRate: 22, repeat: 0 },
    hurt: { suffix: "Hurt", frameCount: 2, frameRate: 16, repeat: 0 },
    death: { suffix: "Death", frameCount: 8, frameRate: 12, repeat: 0 },
  };
  const states = {};
  Object.entries(stateFile).forEach(([state, animation]) => {
    states[state] = {};
    Object.entries(directionFile).forEach(([direction, prefix]) => {
      const key = state === "idle" && direction === "down" ? textureKey : `${textureKey}-${state}-${direction}`;
      states[state][direction] = sheet(
        key,
        `${root}/${prefix}_${animation.suffix}.png`,
        32,
        32,
        animation.frameCount,
        animation.frameRate,
        animation.repeat,
      );
    });
  });
  return { baseTexture: textureKey, sideFaces: options.sideFaces ?? "right", states };
}

function machineEnemyActor(textureKey, folder) {
  const down = sheet(textureKey, `${MACHINE_ROOT}/3 Enemies/${folder}/RunSD.png`, 48, 48, 6, 8);
  const up = sheet(`${textureKey}-up`, `${MACHINE_ROOT}/3 Enemies/${folder}/RunSU.png`, 48, 48, 6, 8);
  return {
    baseTexture: textureKey,
    sideFaces: "left",
    flipVerticalByHorizontalFacing: true,
    states: {
      idle: { down, side: down, up },
      walk: { down, side: down, up },
    },
  };
}

const steelSpiderWalk = sheet(
  "provided-steel-spider",
  `${MACHINE_ROOT}/1 Main Character/1 Character/Walk1.png`,
  48,
  48,
  4,
  7,
);
const bossDown = sheet(
  "provided-boss",
  `${MACHINE_ROOT}/3 Enemies/6/RunSD.png`,
  48,
  48,
  6,
  8,
);
const bossUp = sheet(
  "provided-boss-up",
  `${MACHINE_ROOT}/3 Enemies/6/RunSU.png`,
  48,
  48,
  6,
  8,
);

export const ACTOR_ASSETS = {
  player: swordsmanPlayer(1),
  player_lvl2: swordsmanPlayer(2),
  player_lvl3: swordsmanPlayer(3),
  tomb_scout: fantasyActor("provided-tomb-scout", "1 Characters/1", { sideFaces: "left" }),
  crypt_archer: fantasyActor("provided-crypt-archer", "1 Characters/2", { sideFaces: "left" }),
  void_knight: fantasyActor("provided-void-knight", "1 Characters/3", { sideFaces: "left" }),
  rat: fantasyActor("provided-rat", "3 Dungeon Enemies/1", { sideFaces: "left" }),
  goblin_bat: fantasyActor("provided-goblin-bat", "3 Dungeon Enemies/2", { sideFaces: "left" }),
  goblin_dagger: fantasyActor("provided-goblin-dagger", "3 Dungeon Enemies/3", { sideFaces: "left" }),
  plague_mage: fantasyActor("provided-plague-mage", "3 Dungeon Enemies/4", { sideFaces: "left" }),
  robot_gunner: machineEnemyActor("provided-robot-gunner", "3"),
  machine_guard: machineEnemyActor("provided-machine-guard", "5"),
  steel_spider: {
    baseTexture: "provided-steel-spider",
    rotationMode: "from-down",
    states: {
      idle: { down: steelSpiderWalk, side: steelSpiderWalk, up: steelSpiderWalk },
      walk: { down: steelSpiderWalk, side: steelSpiderWalk, up: steelSpiderWalk },
    },
  },
  boss: {
    baseTexture: "provided-boss",
    sideFaces: "left",
    flipVerticalByHorizontalFacing: true,
    states: {
      idle: { down: bossDown, side: bossDown, up: bossUp },
      walk: { down: bossDown, side: bossDown, up: bossUp },
    },
  },
};

function collectActorSheets() {
  const unique = new Map();
  Object.values(ACTOR_ASSETS).forEach((actor) => {
    Object.values(actor.states).forEach((directions) => {
      Object.values(directions).forEach((definition) => unique.set(definition.key, definition));
    });
  });
  return [...unique.values()];
}

const environmentSpritesheets = [
  sheet(
    "bottle-break-effect",
    `${MACHINE_ROOT}/3 Enemies/8 Other/Dust.png`,
    64,
    64,
    6,
    22,
    0,
  ),
  sheet(
    "door-side",
    `${FANTASY_ROOT}/2 Dungeon Tileset/3 Animated objects/Door_S.png`,
    14,
    26,
    4,
    12,
    0,
  ),
  sheet(
    "door-up",
    `${FANTASY_ROOT}/2 Dungeon Tileset/3 Animated objects/Door_U.png`,
    20,
    20,
    4,
    12,
    0,
  ),
  sheet(
    "door-down",
    `${FANTASY_ROOT}/2 Dungeon Tileset/3 Animated objects/Door_D.png`,
    20,
    20,
    4,
    12,
    0,
  ),
  sheet(
    "portal",
    `${MACHINE_ROOT}/2 Location/3 Animated objects/Portal1_Idle.png`,
    96,
    96,
    4,
    6,
  ),
  sheet(
    "reward-console",
    `${MACHINE_ROOT}/2 Location/3 Animated objects/Altar_Idle.png`,
    48,
    48,
    6,
    7,
  ),
  sheet(
    "trap",
    `${FANTASY_ROOT}/2 Dungeon Tileset/3 Animated objects/Spikes.png`,
    17,
    17,
    6,
    12,
    0,
  ),
  sheet(
    "spawn-marker",
    `${MACHINE_ROOT}/2 Location/3 Animated objects/Portal1_Start.png`,
    96,
    96,
    6,
    10,
    0,
  ),
  sheet(
    "hit-spark",
    `${FANTASY_ROOT}/1 Characters/Other/D_Blood.png`,
    32,
    32,
    4,
    18,
    0,
  ),
  sheet(
    "room-fire",
    `${ANIMATED_OBJECT_ROOT}/Fire1.png`,
    16,
    16,
    8,
    10,
  ),
  ...[1, 2].flatMap((variant) => ["down", "side", "up"].map((direction) => {
    const suffix = direction === "down" ? "D" : direction === "up" ? "U" : "S";
    return sheet(
      `room-chest-${variant}-${direction}`,
      `${ANIMATED_OBJECT_ROOT}/Chest${variant}_${suffix}.png`,
      16,
      24,
      4,
      10,
      0,
    );
  })),
  ...["down", "side", "up"].map((direction) => {
    const suffix = direction === "down" ? "D" : direction === "up" ? "U" : "S";
    return sheet(
      `room-big-door-${direction}`,
      `${ANIMATED_OBJECT_ROOT}/BigDoor_${suffix}.png`,
      direction === "side" ? 45 : 54,
      direction === "side" ? 42 : 36,
      4,
      10,
      0,
    );
  }),
  ...[1, 2].map((variant) => sheet(
    `room-lever-${variant}`,
    `${ANIMATED_OBJECT_ROOT}/Lever${variant}.png`,
    16,
    18,
    4,
    9,
    0,
  )),
  ...["down", "side", "up"].map((direction) => {
    const suffix = direction === "down" ? "D" : direction === "up" ? "U" : "S";
    return sheet(
      `room-trapdoor-${direction}`,
      `${ANIMATED_OBJECT_ROOT}/Trapdoor_${suffix}.png`,
      22,
      32,
      6,
      12,
      0,
    );
  }),
];

export const PROVIDED_ASSETS = {
  localFilesAvailable: true,
  images: {
    "provided-shadow": `${playerRoot(1)}/shadow_single.png`,
    "potion-icon": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_32.png`,
    "bottle-1": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Other/5.png`,
    "bottle-2": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Other/6.png`,
    "bottle-3": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Other/7.png`,
    "bottle-4": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Other/8.png`,
    "reward-icon-skull": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_01.png`,
    "reward-icon-sword": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_07.png`,
    "reward-icon-shield": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_11.png`,
    "reward-icon-refresh": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_17.png`,
    "reward-icon-coins": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_21.png`,
    "reward-icon-trophy": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_22.png`,
    "reward-icon-speed": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_24.png`,
    "reward-icon-crown": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_31.png`,
    "reward-icon-potion": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_32.png`,
    "reward-icon-gear": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_35.png`,
    "reward-icon-heart": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_42.png`,
    "reward-icon-power": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_43.png`,
    "reward-icon-heal": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_50.png`,
    "enemy-projectile": `${MACHINE_ROOT}/1 Main Character/2 Weapons/Projectiles/10.png`,
    "laser-projectile": `${MACHINE_ROOT}/1 Main Character/2 Weapons/Projectiles/15.png`,
    "fantasy-arrow": `${FANTASY_ROOT}/1 Characters/Other/Arrow.png`,
    ...fireballImages,
    ...dungeonObjectImages,
    "room-floor-fantasy": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_20.png`,
    "room-floor-fantasy-alt": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_21.png`,
    "room-floor-fantasy-stone": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_22.png`,
    "wall-fantasy-cracked": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_31.png`,
    "wall-fantasy": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_16.png`,
    "wall-fantasy-alt": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_31.png`,
    "wall-fantasy-deep": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_15.png`,
    "wall-fantasy-horizontal-top": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_59.png`,
    "wall-fantasy-horizontal-bottom": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_98.png`,
    "wall-fantasy-vertical-left": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_87.png`,
    "wall-fantasy-vertical-right": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_88.png`,
    "wall-fantasy-corner-top-left": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_57.png`,
    "wall-fantasy-corner-top-right": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_61.png`,
    "wall-fantasy-corner-bottom-left": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_91.png`,
    "wall-fantasy-corner-bottom-right": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_93.png`,
    "reward-chest": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Boxes/12.png`,
    "room-decor-bookshelf": `${OBJECT_ROOT}/Bookshelf/5.png`,
    "room-decor-bookshelf-alt": `${OBJECT_ROOT}/Bookshelf/9.png`,
    "room-decor-table": `${OBJECT_ROOT}/Tables/1.png`,
    "room-decor-table-vertical": `${OBJECT_ROOT}/Tables/3.png`,
    "room-decor-altar": `${OBJECT_ROOT}/Tables/5.png`,
    "room-decor-chair": `${OBJECT_ROOT}/Chairs/1.png`,
    "room-decor-chair-side": `${OBJECT_ROOT}/Chairs/3.png`,
    "room-decor-chair-broken": `${OBJECT_ROOT}/Chairs/4.png`,
    "room-decor-crates": `${OBJECT_ROOT}/Boxes/7.png`,
    "room-decor-crate-open": `${OBJECT_ROOT}/Boxes/2.png`,
    "room-decor-crate-closed": `${OBJECT_ROOT}/Boxes/1.png`,
    "room-decor-sack": `${OBJECT_ROOT}/Other/32.png`,
    "room-decor-barricade": `${OBJECT_ROOT}/Blockage/3.png`,
    "room-decor-rubble": `${OBJECT_ROOT}/Blockage/5.png`,
    "room-decor-bones": `${OBJECT_ROOT}/Other/31.png`,
    "room-decor-chain": `${OBJECT_ROOT}/Other/37.png`,
    "room-decor-weapon": `${OBJECT_ROOT}/Other/39.png`,
    "room-decor-candle": `${OBJECT_ROOT}/Other/13.png`,
    "room-decor-glow": `${OBJECT_ROOT}/Other/20.png`,
    "room-decor-torch-mount": `${OBJECT_ROOT}/Torches/2.png`,
    "room-floor-machine": `${MACHINE_ROOT}/2 Location/1 Tiles/Tile_28.png`,
    "wall-machine": `${MACHINE_ROOT}/2 Location/1 Tiles/Tile_19.png`,
  },
  spritesheets: [...collectActorSheets(), ...environmentSpritesheets],
  environmentAnimations: [
    { key: "bottle-break", texture: "bottle-break-effect", frameCount: 6, frameRate: 22, repeat: 0 },
    { key: "door-side-open", texture: "door-side", frameCount: 4, frameRate: 12, repeat: 0 },
    { key: "door-up-open", texture: "door-up", frameCount: 4, frameRate: 12, repeat: 0 },
    { key: "door-down-open", texture: "door-down", frameCount: 4, frameRate: 12, repeat: 0 },
    { key: "portal-idle", texture: "portal", frameCount: 4, frameRate: 6 },
    { key: "reward-console-idle", texture: "reward-console", frameCount: 6, frameRate: 7 },
    { key: "trap-rise", texture: "trap", frameCount: 6, frameRate: 12, repeat: 0 },
    { key: "spawn-marker-start", texture: "spawn-marker", frameCount: 6, frameRate: 10, repeat: 0 },
    { key: "hit-spark-burst", texture: "hit-spark", frameCount: 4, frameRate: 18, repeat: 0 },
    { key: "room-fire-idle", texture: "room-fire", frameCount: 8, frameRate: 10 },
    ...[1, 2].flatMap((variant) => ["down", "side", "up"].map((direction) => ({
      key: `room-chest-${variant}-${direction}-open`,
      texture: `room-chest-${variant}-${direction}`,
      frameCount: 4,
      frameRate: 10,
      repeat: 0,
    }))),
    ...["down", "side", "up"].map((direction) => ({
      key: `room-big-door-${direction}-open`,
      texture: `room-big-door-${direction}`,
      frameCount: 4,
      frameRate: 10,
      repeat: 0,
    })),
    ...[1, 2].map((variant) => ({
      key: `room-lever-${variant}-toggle`,
      texture: `room-lever-${variant}`,
      frameCount: 4,
      frameRate: 9,
      repeat: 0,
    })),
    ...["down", "side", "up"].map((direction) => ({
      key: `room-trapdoor-${direction}-open`,
      texture: `room-trapdoor-${direction}`,
      frameCount: 6,
      frameRate: 12,
      repeat: 0,
    })),
    { key: "spell-projectile-flight", frames: FIREBALL_FRAME_KEYS, frameRate: 18, repeat: -1 },
  ],
  credits: {
    sources: CRAFTPIX_SOURCES,
    licenseUrl: "https://craftpix.net/file-licenses/",
    runtimePolicy: "Runtime game art uses the supplied CraftPix dungeon, machine, player, and magic packs; generated fallback textures are disabled.",
  },
};
