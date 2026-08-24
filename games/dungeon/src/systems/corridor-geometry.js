import { getSideVector } from "../data/rooms.js";

function keyOf([x, y]) {
  return `${x},${y}`;
}

export function getCorridorDoorway(corridor, atStart) {
  const cell = atStart ? corridor.start : corridor.end;
  const side = (atStart ? corridor.entrySide : corridor.exitSide) || (atStart ? "left" : "right");
  const horizontalDoor = side === "up" || side === "down";
  const aperture = horizontalDoor
    ? [cell, [cell[0] + (atStart ? 1 : -1), cell[1]]]
    : [cell, [cell[0], cell[1] + 1]];
  const [dx, dy] = getSideVector(side);
  return {
    side,
    aperture: aperture.map(([x, y]) => [x, y]),
    outside: aperture.map(([x, y]) => [x + dx, y + dy]),
  };
}

export function getCorridorDoorGeometry(layout, corridor, atStart) {
  const doorway = getCorridorDoorway(corridor, atStart);
  const points = doorway.aperture.map((cell) => layout.toPixel(cell));
  const center = [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
  const [dx, dy] = getSideVector(doorway.side);
  const boundaryDistance = layout.cellSize / 2;
  return {
    ...doorway,
    center,
    doorPoint: [center[0] + dx * boundaryDistance, center[1] + dy * boundaryDistance],
  };
}

export function isCorridorDoorToDoorWalkable(corridor) {
  if (!corridor?.floorCells?.length) return false;
  const floor = new Set(corridor.floorCells.map(keyOf));
  const start = getCorridorDoorway(corridor, true);
  const end = getCorridorDoorway(corridor, false);
  if (![...start.aperture, ...end.aperture].every((cell) => floor.has(keyOf(cell)))) return false;

  const visited = new Set();
  const queue = [[...start.aperture[0]]];
  while (queue.length) {
    const cell = queue.shift();
    const key = keyOf(cell);
    if (visited.has(key) || !floor.has(key)) continue;
    visited.add(key);
    const [x, y] = cell;
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return end.aperture.every((cell) => visited.has(keyOf(cell))) && visited.size === floor.size;
}
