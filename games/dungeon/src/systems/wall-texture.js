import { FANTASY_WALL_TEXTURES } from "../data/wall-art.js";

function inferWallRole(x, y, width, height) {
  if (width >= height) return y < 290 ? "horizontal-top" : "horizontal-bottom";
  return x < 480 ? "vertical-left" : "vertical-right";
}

export function getDungeonWallTexture(machine, x = 0, y = 0, width = 0, height = 0, role = null) {
  if (machine) return "wall-machine";
  return FANTASY_WALL_TEXTURES[role || inferWallRole(x, y, width, height)]
    || FANTASY_WALL_TEXTURES["horizontal-top"];
}
