import { BUFF_POOL_BY_ROOM } from "../data/buffs.js";
import {
  ROOM_CONNECTION_POINTS,
  ROOM_SIDES,
  ROOM_TEMPLATES,
  getOppositeSide,
} from "../data/rooms.js";
import { generateRoomContent, getRoomTemplatePool } from "./room-content-generator.js";
import { validateRoom } from "./room-validation.js";
import { createRng } from "./rng.js";

export function getRoomConnectionSides(runSeed, roomIndex) {
  let entrySide = createRng(`${runSeed}:floor:0:start-side`).pick(ROOM_SIDES);
  for (let index = 0; index <= roomIndex; index += 1) {
    const candidates = ROOM_SIDES.filter((side) => side !== entrySide);
    const exitSide = createRng(`${runSeed}:floor:0:room:${index}:exit-side`).pick(candidates);
    if (index === roomIndex) return { entrySide, exitSide };
    entrySide = getOppositeSide(exitSide);
  }
  return { entrySide: "left", exitSide: "right" };
}

function roomConnections(runSeed, roomIndex) {
  const { entrySide, exitSide } = getRoomConnectionSides(runSeed, roomIndex);
  const entry = ROOM_CONNECTION_POINTS[entrySide];
  const exit = ROOM_CONNECTION_POINTS[exitSide];
  return {
    entrySide,
    entry: [...entry.inside],
    entrySpawn: [...entry.outside],
    entryDoor: [...entry.door],
    exitSide,
    exit: [...exit.inside],
    exitDoor: [...exit.door],
    exitTrigger: [...exit.trigger],
  };
}

function getTemplate(templateId) {
  return ROOM_TEMPLATES.find((template) => template.id === templateId);
}

function assembleNormalRoom(content, template, runSeed, roomIndex) {
  const connections = roomConnections(runSeed, roomIndex);
  const obstacles = [...(template.boundaryObstacles || []), ...template.obstacles];
  const spawnPoints = template.spawnPoints.filter(([x, y]) => Math.hypot(x - connections.entry[0], y - connections.entry[1]) >= 192);
  return {
    ...content,
    templateId: template.id,
    theme: template.theme,
    shape: template.shape,
    name: template.name,
    obstacles,
    trapPoints: template.trapPoints,
    machineDecor: template.machineDecor || [],
    spawnPoints,
    ...connections,
  };
}

function assembleBossRoom(content, runSeed, roomIndex) {
  return {
    ...content,
    obstacles: [[208, 164, 48, 48], [752, 164, 48, 48], [208, 372, 48, 48], [752, 372, 48, 48]],
    trapPoints: [[350, 290], [610, 290]],
    machineDecor: [[150, 150], [810, 150], [150, 430], [810, 430]],
    spawnPoints: [[232, 142], [728, 142], [232, 438], [728, 438]],
    ...roomConnections(runSeed, roomIndex),
    validation: { valid: true, path: true, safeSpawns: true, trapSafe: true, area: true },
  };
}

export function generateRoom(runSeed, roomIndex, previousTemplateId = null) {
  const content = generateRoomContent(runSeed, roomIndex, previousTemplateId);
  if (content.type === "boss") return assembleBossRoom(content, runSeed, roomIndex);

  const template = getTemplate(content.templateId);
  let room = assembleNormalRoom(content, template, runSeed, roomIndex);
  room.validation = validateRoom(room);
  if (room.validation.valid) return room;

  const fallbackTemplate = getRoomTemplatePool(roomIndex).find((candidate) => {
    if (candidate.id === previousTemplateId) return false;
    return validateRoom(assembleNormalRoom(content, candidate, runSeed, roomIndex)).valid;
  }) || ROOM_TEMPLATES[0];
  room = assembleNormalRoom({
    ...content,
    rewardIds: [BUFF_POOL_BY_ROOM[roomIndex][0], "minor_heal", "gold_cache"],
  }, fallbackTemplate, runSeed, roomIndex);
  room.validation = { ...validateRoom(room), fallback: true };
  return room;
}
