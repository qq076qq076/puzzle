import { BOSS_ROOM_FOOTPRINT, DEFAULT_ROOM_FOOTPRINT, MAP_LAYOUT, ROOM_FOOTPRINTS } from "../data/map-layout.js";
import { getOppositeSide } from "../data/rooms.js";
import { buildCorridor, isContinuousCorridor } from "./corridor-generator.js";
import { createRng } from "./rng.js";
import { generateRoom } from "./room-factory.js";

function rectanglesOverlap(first, second) {
  const [ax, ay, aw, ah] = first;
  const [bx, by, bw, bh] = second;
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function pointInsideBounds([x, y], [left, top, width, height]) {
  return x >= left && x < left + width && y >= top && y < top + height;
}

function getFootprint(room) {
  if (room.type === "boss") return BOSS_ROOM_FOOTPRINT;
  return ROOM_FOOTPRINTS[room.templateId] || DEFAULT_ROOM_FOOTPRINT;
}

function createRoomSet(runSeed) {
  const rooms = [];
  let previousTemplateId = null;
  for (let roomIndex = 0; roomIndex < 6; roomIndex += 1) {
    const room = generateRoom(runSeed, roomIndex, previousTemplateId);
    previousTemplateId = room.templateId;
    rooms.push(room);
  }
  return rooms;
}

export function buildFloorLayoutCandidate(runSeed, baseRooms, attempt = 0) {
  const layoutRng = createRng(`${runSeed}:floor:0:layout:attempt:${attempt}`);
  const rooms = [];
  let cursorX = 0;
  let roomY = 0;
  baseRooms.forEach((room, roomIndex) => {
    if (roomIndex > 0) {
      roomY = Math.max(
        -MAP_LAYOUT.maxRoomYOffsetCells,
        Math.min(MAP_LAYOUT.maxRoomYOffsetCells, roomY + layoutRng.int(-3, 3)),
      );
    }
    const footprint = getFootprint(room);
    const origin = [cursorX, roomY];
    const middleY = roomY + Math.floor(footprint.height / 2);
    rooms.push({
      ...room,
      id: `room-${roomIndex + 1}`,
      origin,
      bounds: [origin[0], origin[1], footprint.width, footprint.height],
      mapEntry: [origin[0] - 1, middleY],
      mapExit: [origin[0] + footprint.width, middleY],
    });
    if (roomIndex < baseRooms.length - 1) {
      const gap = layoutRng.int(MAP_LAYOUT.minCorridorLengthCells, MAP_LAYOUT.maxCorridorLengthCells);
      cursorX += footprint.width + gap + 1;
    }
  });

  const corridors = rooms.slice(0, -1).map((room, corridorIndex) => {
    const shapeRng = createRng(`${runSeed}:floor:0:corridor:${corridorIndex}:shape:attempt:${attempt}`);
    const eventRng = createRng(`${runSeed}:floor:0:corridor:${corridorIndex}:event:attempt:${attempt}`);
    return {
      ...buildCorridor(room, rooms[corridorIndex + 1], corridorIndex, shapeRng, MAP_LAYOUT.corridorWidthCells, eventRng, MAP_LAYOUT.branchDepthCells),
      entrySide: getOppositeSide(room.exitSide),
      exitSide: getOppositeSide(rooms[corridorIndex + 1].entrySide),
    };
  });
  return { runSeed, floorIndex: 0, rooms, corridors };
}

function findCorridorOverlap(corridors) {
  const occupied = new Map();
  for (const corridor of corridors) {
    for (const cell of corridor.floorCells) {
      const key = cell.join(",");
      const existing = occupied.get(key);
      if (existing && existing !== corridor.id) return true;
      occupied.set(key, corridor.id);
    }
  }
  return false;
}

export function validateFloorMap(floorMap) {
  const rooms = floorMap?.rooms || [];
  const corridors = floorMap?.corridors || [];
  const roomCount = rooms.length === 6;
  const corridorCount = corridors.length === 5;
  const noRoomOverlap = rooms.every((room, index) =>
    rooms.slice(index + 1).every((other) => !rectanglesOverlap(room.bounds, other.bounds)),
  );
  const connectedGraph = corridorCount && corridors.every((corridor, index) =>
    corridor.from === rooms[index]?.id && corridor.to === rooms[index + 1]?.id,
  );
  const continuousCorridors = corridors.every((corridor) =>
    corridor.width >= 2
      && isContinuousCorridor(corridor.cells)
      && corridor.cells[0]?.join(",") === corridor.start.join(",")
      && corridor.cells.at(-1)?.join(",") === corridor.end.join(","),
  );
  const connectedBranches = corridors.every((corridor) => corridor.branches?.length === 1 && corridor.branches.every((branch) =>
    isContinuousCorridor(branch.cells)
      && corridor.cells.some((cell) => cell.join(",") === branch.cells[0]?.join(","))
      && corridor.cells.some((cell) => cell.join(",") === branch.cells.at(-1)?.join(",")),
  ));
  const corridorEventsValid = corridors.every((corridor) => {
    const floorKeys = new Set(corridor.floorCells.map((cell) => cell.join(",")));
    return corridor.trapCells?.length >= 2
      && corridor.trapCells.every((cell) => floorKeys.has(cell.join(",")))
      && (!corridor.chest || floorKeys.has(corridor.chest.cell.join(",")));
  });
  const corridorsClearRooms = corridors.every((corridor) =>
    corridor.floorCells.every((cell) => rooms.every((room) => !pointInsideBounds(cell, room.bounds))),
  );
  const noCorridorOverlap = !findCorridorOverlap(corridors);
  const roomLayoutsValid = rooms.every((room) => room.validation?.valid === true);
  const checks = {
    roomCount,
    corridorCount,
    noRoomOverlap,
    connectedGraph,
    continuousCorridors,
    connectedBranches,
    corridorEventsValid,
    corridorsClearRooms,
    noCorridorOverlap,
    roomLayoutsValid,
  };
  return { valid: Object.values(checks).every(Boolean), checks };
}

function createSafeFallbackLayout(runSeed, baseRooms) {
  const rooms = [];
  let cursorX = 0;
  baseRooms.forEach((room, roomIndex) => {
    const footprint = getFootprint(room);
    const middleY = Math.floor(footprint.height / 2);
    rooms.push({
      ...room,
      id: `room-${roomIndex + 1}`,
      origin: [cursorX, 0],
      bounds: [cursorX, 0, footprint.width, footprint.height],
      mapEntry: [cursorX - 1, middleY],
      mapExit: [cursorX + footprint.width, middleY],
    });
    cursorX += footprint.width + MAP_LAYOUT.minCorridorLengthCells + 1;
  });
  const corridors = rooms.slice(0, -1).map((room, corridorIndex) =>
    ({
      ...buildCorridor(
      room,
      rooms[corridorIndex + 1],
      corridorIndex,
      createRng(`${runSeed}:floor:0:fallback:corridor:${corridorIndex}`),
      MAP_LAYOUT.corridorWidthCells,
      createRng(`${runSeed}:floor:0:fallback:corridor:${corridorIndex}:event`),
      MAP_LAYOUT.branchDepthCells,
      ),
      entrySide: getOppositeSide(room.exitSide),
      exitSide: getOppositeSide(rooms[corridorIndex + 1].entrySide),
    }));
  return { runSeed, floorIndex: 0, rooms, corridors };
}

function getMapBounds(rooms, corridors) {
  const points = [
    ...rooms.flatMap((room) => {
      const [x, y, width, height] = room.bounds;
      return [[x, y], [x + width - 1, y + height - 1]];
    }),
    ...corridors.flatMap((corridor) => corridor.floorCells),
  ];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

export function generateFloorMap(runSeed, options = {}) {
  const baseRooms = createRoomSet(runSeed);
  const maxAttempts = Math.max(0, options.maxAttempts ?? MAP_LAYOUT.maxAttempts);
  const candidateFactory = options.candidateFactory || buildFloorLayoutCandidate;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = candidateFactory(runSeed, baseRooms, attempt);
    const validation = validateFloorMap(candidate);
    if (validation.valid) {
      return {
        ...candidate,
        bounds: getMapBounds(candidate.rooms, candidate.corridors),
        validation: { ...validation, attempt, fallback: false },
      };
    }
  }

  const fallback = createSafeFallbackLayout(runSeed, baseRooms);
  const validation = validateFloorMap(fallback);
  return {
    ...fallback,
    bounds: getMapBounds(fallback.rooms, fallback.corridors),
    validation: { ...validation, attempt: maxAttempts, fallback: true },
  };
}
