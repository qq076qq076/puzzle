import {
  FLOOR_DECORATIONS,
  OBSTACLE_DECORATIONS,
  ROOM_DECORATION_CANDIDATE_POINTS,
} from "../data/room-decorations.js";
import { pointWalkable } from "./room-validation.js";
import { createRng } from "./rng.js";

function farFrom(point, otherPoints, distance) {
  return otherPoints.every(([x, y]) => Math.hypot(point[0] - x, point[1] - y) >= distance);
}

function takeRandom(rng, values) {
  return values.splice(rng.int(0, values.length - 1), 1)[0];
}

function makeDecoration(roomIndex, index, point, definition, placement, rng) {
  return {
    id: `room-${roomIndex + 1}-decor-${index + 1}`,
    x: point[0],
    y: point[1],
    texture: definition.texture,
    scale: definition.scale,
    flipX: rng.next() < 0.5,
    placement,
  };
}

export function generateRoomDecorations(runSeed, roomIndex, room) {
  if (!room || room.theme !== "fantasy") return [];
  const rng = createRng(`${runSeed}:floor:0:room:${roomIndex}:decorations`);
  const doorPoints = [room.entry, room.exit].filter(Boolean);
  const spawnPoints = room.spawnPoints || [];
  const trapPoints = room.trapPoints || [];
  const bottlePoints = (room.bottles || []).map(({ x, y }) => [x, y]);
  const decorations = [];

  const obstacleAnchors = (room.obstacles || [])
    .filter(([, , width, height]) => width >= 40 || height >= 40)
    .map(([x, y, width, height]) => [x + width / 2, y + height / 2])
    .filter((point) => farFrom(point, doorPoints, 100))
    .filter((point) => farFrom(point, [...spawnPoints, ...trapPoints], 56));
  const obstacleCount = Math.min(obstacleAnchors.length, rng.next() < 0.55 ? 2 : 1);
  while (obstacleAnchors.length && decorations.length < obstacleCount) {
    const point = takeRandom(rng, obstacleAnchors);
    decorations.push(makeDecoration(
      roomIndex,
      decorations.length,
      point,
      rng.pick(OBSTACLE_DECORATIONS),
      "obstacle",
      rng,
    ));
  }

  const floorCandidates = ROOM_DECORATION_CANDIDATE_POINTS
    .map((point) => [...point])
    .filter(([x, y]) => pointWalkable(x, y, room.obstacles || [], 22))
    .filter((point) => farFrom(point, doorPoints, 110))
    .filter((point) => farFrom(point, spawnPoints, 48))
    .filter((point) => farFrom(point, trapPoints, 52))
    .filter((point) => farFrom(point, bottlePoints, 44))
    .filter((point) => farFrom(point, decorations.map(({ x, y }) => [x, y]), 70));
  const floorCount = Math.min(floorCandidates.length, rng.int(2, 4));
  while (floorCandidates.length && decorations.length < obstacleCount + floorCount) {
    const point = takeRandom(rng, floorCandidates);
    if (!farFrom(point, decorations.map(({ x, y }) => [x, y]), 70)) continue;
    decorations.push(makeDecoration(
      roomIndex,
      decorations.length,
      point,
      rng.pick(FLOOR_DECORATIONS),
      "floor",
      rng,
    ));
  }
  return decorations;
}
