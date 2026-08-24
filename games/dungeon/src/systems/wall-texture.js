import { FANTASY_WALL_TEXTURE_KEYS } from "../data/wall-art.js";

export function getDungeonWallTexture(machine, x = 0, y = 0, width = 0, height = 0) {
  if (machine) return "wall-machine";
  const signature = Math.abs(Math.round(x * 3 + y * 5 + width * 7 + height * 11));
  return FANTASY_WALL_TEXTURE_KEYS[signature % FANTASY_WALL_TEXTURE_KEYS.length];
}
