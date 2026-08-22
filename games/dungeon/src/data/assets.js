const PROVIDED_ENEMY_ROOT = "../dice-tower-defense/assets/enemies";

// These files already belong to the project and are reused from the CC0 Kenney
// Tiny Dungeon set documented in games/dice-tower-defense/assets/enemies/README.md.
// Keeping the URLs relative means the same manifest works on GitHub Pages and
// when the repository is served locally.
export const PROVIDED_ASSETS = {
  images: {
    player: `${PROVIDED_ENEMY_ROOT}/armored-knight.png`,
    rat: `${PROVIDED_ENEMY_ROOT}/swift-bat.png`,
    goblin_bat: `${PROVIDED_ENEMY_ROOT}/splitter-slime.png`,
    goblin_dagger: `${PROVIDED_ENEMY_ROOT}/shadow-ghost.png`,
    steel_spider: `${PROVIDED_ENEMY_ROOT}/child-spider.png`,
    spider_guard: `${PROVIDED_ENEMY_ROOT}/boss-demon.png`,
    boss: `${PROVIDED_ENEMY_ROOT}/boss-demon.png`,
    machineFloor: "../dice-tower-defense/assets/road/pebble-road.png",
  },
  credits: {
    source: "Kenney Tiny Dungeon",
    license: "CC0 1.0",
    sourceUrl: "https://kenney.nl/assets/tiny-dungeon",
  },
};
