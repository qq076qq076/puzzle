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

function sheet(key, path, frameWidth, frameHeight, frameCount, frameRate, repeat = -1) {
  return { key, path, frameWidth, frameHeight, frameCount, frameRate, repeat };
}

function fantasyActor(textureKey, folder, options = {}) {
  const root = `${FANTASY_ROOT}/${folder}`;
  const directionFile = { down: "D", side: "S", up: "U" };
  const stateFile = {
    idle: { suffix: "Idle", frameCount: 4, frameRate: 6, repeat: -1 },
    walk: { suffix: "Walk", frameCount: 6, frameRate: 11, repeat: -1 },
    attack: { suffix: "Attack", frameCount: 4, frameRate: 22, repeat: 0 },
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
  player: fantasyActor("provided-player", "1 Characters/2", { sideFaces: "left" }),
  rat: fantasyActor("provided-rat", "3 Dungeon Enemies/1", { sideFaces: "left" }),
  goblin_bat: fantasyActor("provided-goblin-bat", "3 Dungeon Enemies/2"),
  goblin_dagger: fantasyActor("provided-goblin-dagger", "3 Dungeon Enemies/3"),
  spider_guard: fantasyActor("provided-spider-guard", "3 Dungeon Enemies/4"),
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
    sideFaces: "right",
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
    "door-side",
    `${FANTASY_ROOT}/2 Dungeon Tileset/3 Animated objects/Door_S.png`,
    14,
    26,
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
    "player-attack-effect",
    `${MACHINE_ROOT}/1 Main Character/3 Effects/1_1.png`,
    96,
    96,
    6,
    30,
    0,
  ),
];

export const PROVIDED_ASSETS = {
  localFilesAvailable: true,
  images: {
    "provided-shadow": `${FANTASY_ROOT}/1 Characters/Other/Shadow.png`,
    "potion-icon": `${FANTASY_ROOT}/4 GUI/3 Icons/Icon_32.png`,
    "enemy-projectile": `${MACHINE_ROOT}/1 Main Character/2 Weapons/Projectiles/10.png`,
    "room-floor-fantasy": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_20.png`,
    "wall-fantasy": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_16.png`,
    "reward-chest": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Boxes/12.png`,
    "room-floor-machine": `${MACHINE_ROOT}/2 Location/1 Tiles/Tile_28.png`,
    "wall-machine": `${MACHINE_ROOT}/2 Location/1 Tiles/Tile_19.png`,
  },
  spritesheets: [...collectActorSheets(), ...environmentSpritesheets],
  environmentAnimations: [
    { key: "door-side-open", texture: "door-side", frameCount: 4, frameRate: 12, repeat: 0 },
    { key: "portal-idle", texture: "portal", frameCount: 4, frameRate: 6 },
    { key: "reward-console-idle", texture: "reward-console", frameCount: 6, frameRate: 7 },
    { key: "trap-rise", texture: "trap", frameCount: 6, frameRate: 12, repeat: 0 },
    { key: "spawn-marker-start", texture: "spawn-marker", frameCount: 6, frameRate: 10, repeat: 0 },
    { key: "hit-spark-burst", texture: "hit-spark", frameCount: 4, frameRate: 18, repeat: 0 },
    { key: "player-attack-sweep", texture: "player-attack-effect", frameCount: 6, frameRate: 30, repeat: 0 },
  ],
  credits: {
    sources: CRAFTPIX_SOURCES,
    licenseUrl: "https://craftpix.net/file-licenses/",
    runtimePolicy: "Runtime game art is loaded only from the two supplied CraftPix packs; generated fallback textures are disabled.",
  },
};
