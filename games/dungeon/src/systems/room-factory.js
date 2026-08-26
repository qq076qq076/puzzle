import { BUFF_POOL_BY_ROOM } from "../data/buffs.js";
import {
  ROOM_CONNECTION_POINTS,
  ROOM_SIDES,
  ROOM_TEMPLATES,
  getOppositeSide,
} from "../data/rooms.js";
import { generateRoomContent, getRoomTemplatePool } from "./room-content-generator.js";
import { pointWalkable, validateRoom } from "./room-validation.js";
import { createRng } from "./rng.js";
import { rollBottleDrop } from "./destructible-system.js";
import { generateRoomDecorations, generateRoomFirePoints } from "./room-decoration-generator.js";

const BOTTLE_CANDIDATE_POINTS = Object.freeze([
  [170, 150], [790, 150], [170, 430], [790, 430],
  [480, 190], [480, 390], [310, 290], [650, 290],
]);

function generateRoomBottles(runSeed, roomIndex, room) {
  const rng = createRng(`${runSeed}:floor:0:room:${roomIndex}:bottles`);
  if (rng.next() >= 0.68) return [];
  const candidates = BOTTLE_CANDIDATE_POINTS.filter(([x, y]) =>
    pointWalkable(x, y, room.obstacles, 20)
    && Math.hypot(x - room.entry[0], y - room.entry[1]) >= 110
    && Math.hypot(x - room.exit[0], y - room.exit[1]) >= 110
    && room.trapPoints.every(([tx, ty]) => Math.hypot(x - tx, y - ty) >= 56));
  const count = Math.min(candidates.length, rng.next() < 0.28 ? 2 : 1);
  const bottles = [];
  while (candidates.length && bottles.length < count) {
    const [x, y] = candidates.splice(rng.int(0, candidates.length - 1), 1)[0];
    bottles.push({
      id: `room-${roomIndex + 1}-bottle-${bottles.length + 1}`,
      x,
      y,
      texture: `bottle-${rng.int(1, 4)}`,
      drop: rollBottleDrop(rng),
    });
  }
  return bottles;
}

function getTrapdoorDirection([x, y]) {
  if (Math.abs(x - 480) > Math.abs(y - 290)) return "side";
  return y < 290 ? "down" : "up";
}

function generateTrapVisuals(runSeed, roomIndex, room) {
  const rng = createRng(`${runSeed}:floor:0:room:${roomIndex}:trap-visuals`);
  return room.trapPoints.map((point, index) => {
    const useTrapdoor = room.templateId === "trap_corridor" ? index % 2 === 1 : rng.next() < 0.36;
    if (!useTrapdoor) {
      return { texture: "trap", animation: "trap-rise", warningFrame: 2, idleFrame: 0, scale: 2.3 };
    }
    const direction = getTrapdoorDirection(point);
    return {
      texture: `room-trapdoor-${direction}`,
      animation: `room-trapdoor-${direction}-open`,
      warningFrame: 2,
      idleFrame: 0,
      scale: direction === "side" ? 1.8 : 2.05,
    };
  });
}

function withRoomFeatures(runSeed, roomIndex, room) {
  const roomWithBottles = {
    ...room,
    bottles: room.theme === "fantasy" ? generateRoomBottles(runSeed, roomIndex, room) : [],
    trapVisuals: room.theme === "fantasy" ? generateTrapVisuals(runSeed, roomIndex, room) : [],
  };
  roomWithBottles.firePoints = generateRoomFirePoints(runSeed, roomIndex, roomWithBottles);
  return {
    ...roomWithBottles,
    decorations: generateRoomDecorations(runSeed, roomIndex, roomWithBottles),
  };
}

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
    entryDoorVariant: "normal",
    exitDoorVariant: template.theme === "fantasy"
      && (roomIndex === 4 || createRng(`${runSeed}:floor:0:room:${roomIndex}:door-variant`).next() < 0.24)
      ? "big"
      : "normal",
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
  if (room.validation.valid) return withRoomFeatures(runSeed, roomIndex, room);

  const fallbackTemplate = getRoomTemplatePool(roomIndex).find((candidate) => {
    if (candidate.id === previousTemplateId) return false;
    return validateRoom(assembleNormalRoom(content, candidate, runSeed, roomIndex)).valid;
  }) || ROOM_TEMPLATES[0];
  room = assembleNormalRoom({
    ...content,
    rewardIds: [BUFF_POOL_BY_ROOM[roomIndex][0], "minor_heal", "gold_cache"],
  }, fallbackTemplate, runSeed, roomIndex);
  room.validation = { ...validateRoom(room), fallback: true };
  return withRoomFeatures(runSeed, roomIndex, room);
}
