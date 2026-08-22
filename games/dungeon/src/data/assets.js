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

// The downloaded CraftPix files are intentionally normalized into these paths.
// The Vite public directory is configured to use games/dungeon/assets, so these
// URLs work both in dev and in the built game. Missing files fall back to the
// procedural pixel textures created by texture-factory.js.
export const PROVIDED_ASSETS = {
  localFilesAvailable: typeof import.meta.env !== "undefined" && import.meta.env.VITE_CRAFTPIX_ASSETS === "true",
  images: {
    player: "./fantasy/player.png",
    rat: "./fantasy/rat.png",
    goblin_bat: "./fantasy/goblin-bat.png",
    goblin_dagger: "./fantasy/goblin-dagger.png",
    spider_guard: "./fantasy/goblin-guard.png",
    steel_spider: "./machine/steel-spider.png",
    boss: "./machine/boss.png",
    machineFloor: "./machine/floor.png",
  },
  credits: {
    sources: CRAFTPIX_SOURCES,
    licenseUrl: "https://craftpix.net/file-licenses/",
    fallback: "Procedural nearest-neighbor pixel art until the downloaded PNG files are placed in assets/.",
  },
};
