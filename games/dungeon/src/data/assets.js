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

function fantasyActor(textureKey, folder) {
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
  return { baseTexture: textureKey, states };
}

const steelSpiderDown = sheet(
  "provided-steel-spider",
  `${MACHINE_ROOT}/1 Main Character/1 Character/Walk1.png`,
  48,
  48,
  4,
  7,
);
const steelSpiderSide = sheet(
  "provided-steel-spider-side",
  `${MACHINE_ROOT}/1 Main Character/1 Character/Walk2.png`,
  48,
  48,
  4,
  7,
);
const steelSpiderUp = sheet(
  "provided-steel-spider-up",
  `${MACHINE_ROOT}/1 Main Character/1 Character/Walk3.png`,
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
  player: fantasyActor("provided-player", "1 Characters/2"),
  rat: fantasyActor("provided-rat", "3 Dungeon Enemies/1"),
  goblin_bat: fantasyActor("provided-goblin-bat", "3 Dungeon Enemies/2"),
  goblin_dagger: fantasyActor("provided-goblin-dagger", "3 Dungeon Enemies/3"),
  spider_guard: fantasyActor("provided-spider-guard", "3 Dungeon Enemies/4"),
  steel_spider: {
    baseTexture: "provided-steel-spider",
    states: {
      idle: { down: steelSpiderDown, side: steelSpiderSide, up: steelSpiderUp },
      walk: { down: steelSpiderDown, side: steelSpiderSide, up: steelSpiderUp },
    },
  },
  boss: {
    baseTexture: "provided-boss",
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
];

export const PROVIDED_ASSETS = {
  localFilesAvailable: true,
  images: {
    "room-floor-fantasy": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_20.png`,
    "wall-fantasy": `${FANTASY_ROOT}/2 Dungeon Tileset/1 Tiles/Tile_16.png`,
    "door-closed": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Doors/4.png`,
    "reward-chest": `${FANTASY_ROOT}/2 Dungeon Tileset/2 Objects/Boxes/12.png`,
    "room-floor-machine": `${MACHINE_ROOT}/2 Location/1 Tiles/Tile_28.png`,
    "wall-machine": `${MACHINE_ROOT}/2 Location/1 Tiles/Tile_19.png`,
  },
  spritesheets: [...collectActorSheets(), ...environmentSpritesheets],
  environmentAnimations: [
    { key: "portal-idle", texture: "portal", frameCount: 4, frameRate: 6 },
    { key: "reward-console-idle", texture: "reward-console", frameCount: 6, frameRate: 7 },
  ],
  credits: {
    sources: CRAFTPIX_SOURCES,
    licenseUrl: "https://craftpix.net/file-licenses/",
    fallback: "Procedural nearest-neighbor pixel art is retained only as a missing-file safeguard.",
  },
};
