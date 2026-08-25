import {
  DEFAULT_DECORATION_PROFILE,
  FLOOR_PATCH_TEXTURES,
  PROP_DEFINITIONS,
  ROOM_DECORATION_CANDIDATE_POINTS,
  ROOM_DECORATION_PROFILES,
  ROOM_FIRE_PAIRS,
  WALL_ACCENT_DECORATIONS,
} from "../data/room-decorations.js";
import { pointWalkable } from "./room-validation.js";
import { createRng } from "./rng.js";

function farFrom(point, otherPoints, distance) {
  return otherPoints.every(([x, y]) => Math.hypot(point[0] - x, point[1] - y) >= distance);
}

function takeRandom(rng, values) {
  return values.splice(rng.int(0, values.length - 1), 1)[0];
}

function getProfile(room) {
  return ROOM_DECORATION_PROFILES[room.templateId] || DEFAULT_DECORATION_PROFILE;
}

function reservedPoints(room) {
  return [
    room.entry,
    room.exit,
    ...(room.spawnPoints || []),
    ...(room.trapPoints || []),
    ...(room.bottles || []).map(({ x, y }) => [x, y]),
  ].filter(Boolean);
}

function makeProp(roomIndex, index, point, definition, placement, rng, extra = {}) {
  return {
    id: `room-${roomIndex + 1}-decor-${placement}-${index + 1}`,
    x: point[0],
    y: point[1],
    texture: definition.texture,
    scale: definition.scale,
    flipX: definition.allowFlip !== false && rng.next() < 0.5,
    offsetY: definition.offsetY || 0,
    kind: "prop",
    placement,
    ...extra,
  };
}

function generateWallAccents(roomIndex, room, rng) {
  const sideCandidates = {
    top: [[176, 108], [336, 108], [624, 108], [784, 108]],
    bottom: [[176, 476], [336, 476], [624, 476], [784, 476]],
    left: [[72, 188], [72, 392]],
    right: [[888, 188], [888, 392]],
  };
  const openings = new Set([room.entrySide, room.exitSide]);
  const candidates = Object.keys(sideCandidates).flatMap((side) => sideCandidates[side]
    .filter((point) => !openings.has(side) || farFrom(point, [room.entry, room.exit].filter(Boolean), 130))
    .map((point) => ({ point, side })));
  const count = Math.min(candidates.length, rng.int(3, 6));
  const accents = [];
  while (candidates.length && accents.length < count) {
    const { point, side } = takeRandom(rng, candidates);
    const definition = rng.pick(WALL_ACCENT_DECORATIONS[side]);
    accents.push({
      id: `room-${roomIndex + 1}-wall-accent-${accents.length + 1}`,
      x: point[0],
      y: point[1],
      texture: definition.texture,
      scale: definition.scale,
      kind: definition.kind,
      flipX: rng.next() < 0.5,
    });
  }
  return accents;
}

function generateWallProps(roomIndex, room, profile, rng) {
  if (!profile.wallProps.length || room.entrySide === "up" || room.exitSide === "up") return [];
  const candidates = [[184, 130], [296, 130], [664, 130], [776, 130]]
    .filter((point) => farFrom(point, reservedPoints(room), 72));
  const count = Math.min(candidates.length, rng.int(1, 2));
  const props = [];
  const propTypes = [...profile.wallProps];
  while (candidates.length && props.length < count) {
    const point = takeRandom(rng, candidates);
    const definition = PROP_DEFINITIONS[takeRandom(rng, propTypes)];
    props.push(makeProp(roomIndex, props.length, point, definition, "wall", rng, { flipX: false }));
  }
  return props;
}

function floorPatchCandidates(room) {
  const points = [];
  for (let y = 144; y <= 432; y += 32) {
    for (let x = 112; x <= 848; x += 32) {
      if (!pointWalkable(x, y, room.obstacles || [], 8)) continue;
      if (!farFrom([x, y], reservedPoints(room), 54)) continue;
      points.push([x, y]);
    }
  }
  return points;
}

function generateFloorPatches(runSeed, roomIndex, room) {
  const rng = createRng(`${runSeed}:floor:0:room:${roomIndex}:floor-patches`);
  const candidates = floorPatchCandidates(room);
  const patches = [];
  const clusterCount = rng.int(2, 3);
  for (let cluster = 0; cluster < clusterCount && candidates.length; cluster += 1) {
    const origin = takeRandom(rng, candidates);
    const nearby = [[0, 0], [32, 0], [-32, 0], [0, 32], [0, -32]]
      .filter(() => rng.next() < 0.72)
      .map(([dx, dy]) => [origin[0] + dx, origin[1] + dy])
      .filter((point) => pointWalkable(point[0], point[1], room.obstacles || [], 8))
      .filter((point) => farFrom(point, reservedPoints(room), 54));
    nearby.forEach((point) => {
      if (patches.some(({ x, y }) => x === point[0] && y === point[1])) return;
      patches.push({
        id: `room-${roomIndex + 1}-patch-${patches.length + 1}`,
        texture: rng.pick(FLOOR_PATCH_TEXTURES),
        x: point[0],
        y: point[1],
        scale: 2,
        alpha: rng.real(0.78, 0.94),
        kind: "floor-patch",
        flipX: rng.next() < 0.5,
      });
    });
  }
  return patches;
}

function generateObstacleProps(roomIndex, room, profile, rng) {
  const anchors = (room.obstacles || [])
    .filter(([, , width, height]) => width >= 40 || height >= 40)
    .map(([x, y, width, height]) => [x + width / 2, y + height / 2])
    .filter((point) => farFrom(point, [room.entry, room.exit].filter(Boolean), 110))
    .filter((point) => farFrom(point, [...(room.spawnPoints || []), ...(room.trapPoints || [])], 62));
  const count = Math.min(anchors.length, rng.int(1, 2));
  const props = [];
  const propTypes = [...profile.obstacleProps];
  while (anchors.length && props.length < count) {
    const point = takeRandom(rng, anchors);
    const definition = PROP_DEFINITIONS[takeRandom(rng, propTypes)];
    props.push(makeProp(roomIndex, props.length, point, definition, "obstacle", rng));
  }
  return props;
}

function generateFloorProps(roomIndex, room, profile, rng, existing) {
  const candidates = ROOM_DECORATION_CANDIDATE_POINTS
    .map((point) => [...point])
    .filter(([x, y]) => pointWalkable(x, y, room.obstacles || [], 24))
    .filter((point) => farFrom(point, reservedPoints(room), 66))
    .filter((point) => farFrom(point, existing.map(({ x, y }) => [x, y]), 62));
  const count = Math.min(candidates.length, profile.floorProps.length, rng.int(3, 5));
  const props = [];
  const propTypes = [...profile.floorProps];
  while (candidates.length && props.length < count) {
    const point = takeRandom(rng, candidates);
    if (!farFrom(point, [...existing, ...props].map(({ x, y }) => [x, y]), 62)) continue;
    const definition = PROP_DEFINITIONS[takeRandom(rng, propTypes)];
    props.push(makeProp(roomIndex, existing.length + props.length, point, definition, "floor", rng));
  }
  return props;
}

export function generateRoomFirePoints(runSeed, roomIndex, room) {
  if (!room || room.theme !== "fantasy") return [];
  const profile = getProfile(room);
  const rng = createRng(`${runSeed}:floor:0:room:${roomIndex}:fires`);
  const sides = Object.keys(ROOM_FIRE_PAIRS)
    .map((side) => ({
      side,
      doorwayPenalty: side === room.entrySide || side === room.exitSide ? 1 : 0,
      order: rng.next(),
    }))
    .sort((left, right) => left.doorwayPenalty - right.doorwayPenalty || left.order - right.order)
    .slice(0, profile.firePairCount)
    .map(({ side }) => side);
  return sides.flatMap((side) => ROOM_FIRE_PAIRS[side]);
}

export function generateRoomDecorations(runSeed, roomIndex, room) {
  if (!room || room.theme !== "fantasy") return [];
  const rng = createRng(`${runSeed}:floor:0:room:${roomIndex}:decorations`);
  const profile = getProfile(room);
  const background = [
    ...generateWallAccents(roomIndex, room, rng),
    ...generateFloorPatches(runSeed, roomIndex, room),
  ];
  const wallProps = generateWallProps(roomIndex, room, profile, rng);
  const obstacleProps = generateObstacleProps(roomIndex, room, profile, rng);
  const floorProps = generateFloorProps(roomIndex, room, profile, rng, [...wallProps, ...obstacleProps]);
  return [...background, ...wallProps, ...obstacleProps, ...floorProps];
}
