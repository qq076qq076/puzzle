export const FANTASY_WALL_TEXTURES = Object.freeze({
  "horizontal-top": "wall-fantasy-horizontal-top",
  "horizontal-bottom": "wall-fantasy-horizontal-bottom",
  "vertical-left": "wall-fantasy-vertical-left",
  "vertical-right": "wall-fantasy-vertical-right",
  "corner-top-left": "wall-fantasy-corner-top-left",
  "corner-top-right": "wall-fantasy-corner-top-right",
  "corner-bottom-left": "wall-fantasy-corner-bottom-left",
  "corner-bottom-right": "wall-fantasy-corner-bottom-right",
});

export const FANTASY_WALL_TEXTURE_KEYS = Object.freeze([
  ...new Set(Object.values(FANTASY_WALL_TEXTURES)),
]);
