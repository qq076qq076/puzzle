import { generateFloorMap } from "./floor-map-generator.js";

export { generateFloorMap, validateFloorMap } from "./floor-map-generator.js";
export { generateRoom } from "./room-factory.js";
export { validateRoom } from "./room-validation.js";
export { ENEMY_COUNTS, THREAT_BUDGETS, WAVE_COUNTS } from "./room-content-generator.js";

export function generateFloor(runSeed) {
  return generateFloorMap(runSeed).rooms;
}
