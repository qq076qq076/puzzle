import { BUFF_POOL_BY_ROOM } from "../data/buffs.js";
import {
  ENTRY_DOOR_POINT,
  ENTRY_POINT,
  ENTRY_SPAWN_POINT,
  EXIT_DOOR_POINT,
  EXIT_POINT,
  EXIT_TRIGGER_POINT,
  ROOM_TEMPLATES,
} from "../data/rooms.js";
import { generateRoomContent, getRoomTemplatePool } from "./room-content-generator.js";
import { validateRoom } from "./room-validation.js";

function roomConnections() {
  return {
    entrySide: "left",
    entry: [...ENTRY_POINT],
    entrySpawn: [...ENTRY_SPAWN_POINT],
    entryDoor: [...ENTRY_DOOR_POINT],
    exitSide: "right",
    exit: [...EXIT_POINT],
    exitDoor: [...EXIT_DOOR_POINT],
    exitTrigger: [...EXIT_TRIGGER_POINT],
  };
}

function getTemplate(templateId) {
  return ROOM_TEMPLATES.find((template) => template.id === templateId);
}

function assembleNormalRoom(content, template) {
  return {
    ...content,
    templateId: template.id,
    theme: template.theme,
    name: template.name,
    obstacles: template.obstacles,
    trapPoints: template.trapPoints,
    machineDecor: template.machineDecor || [],
    spawnPoints: template.spawnPoints,
    ...roomConnections(),
  };
}

function assembleBossRoom(content) {
  return {
    ...content,
    obstacles: [[208, 164, 48, 48], [752, 164, 48, 48], [208, 372, 48, 48], [752, 372, 48, 48]],
    trapPoints: [[350, 290], [610, 290]],
    machineDecor: [[150, 150], [810, 150], [150, 430], [810, 430]],
    spawnPoints: [[232, 142], [728, 142], [232, 438], [728, 438]],
    ...roomConnections(),
    validation: { valid: true, path: true, safeSpawns: true, trapSafe: true, area: true },
  };
}

export function generateRoom(runSeed, roomIndex, previousTemplateId = null) {
  const content = generateRoomContent(runSeed, roomIndex, previousTemplateId);
  if (content.type === "boss") return assembleBossRoom(content);

  const template = getTemplate(content.templateId);
  let room = assembleNormalRoom(content, template);
  room.validation = validateRoom(room);
  if (room.validation.valid) return room;

  const fallbackTemplate = getRoomTemplatePool(roomIndex).find((candidate) => {
    if (candidate.id === previousTemplateId) return false;
    return validateRoom(assembleNormalRoom(content, candidate)).valid;
  }) || ROOM_TEMPLATES[0];
  room = assembleNormalRoom({
    ...content,
    rewardIds: [BUFF_POOL_BY_ROOM[roomIndex][0], "minor_heal", "gold_cache"],
  }, fallbackTemplate);
  room.validation = { ...validateRoom(room), fallback: true };
  return room;
}
