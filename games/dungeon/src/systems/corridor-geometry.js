import { getSideVector } from "../data/rooms.js";

function keyOf([x, y]) {
  return `${x},${y}`;
}

export function getCorridorRenderFloorCells(corridor) {
  const floor = new Map((corridor.floorCells || []).map((cell) => [keyOf(cell), [...cell]]));
  [corridor.start, corridor.end].forEach(([centerX, centerY]) => {
    for (let y = centerY - 4; y <= centerY + 4; y += 1) {
      for (let x = centerX - 2; x <= centerX + 2; x += 1) floor.set(`${x},${y}`, [x, y]);
    }
  });
  return [...floor.values()];
}

export function getCorridorDoorway(corridor, atStart) {
  const [centerX, centerY] = atStart ? corridor.start : corridor.end;
  const side = (atStart ? corridor.entrySide : corridor.exitSide) || (atStart ? "left" : "right");
  const [dx, dy] = getSideVector(side);
  let aperture;
  if (side === "up" || side === "down") {
    const y = centerY + (side === "up" ? -4 : 4);
    aperture = [[centerX - 1, y], [centerX, y]];
  } else {
    const x = centerX + (side === "left" ? -2 : 2);
    const floor = new Set(getCorridorRenderFloorCells(corridor).map(keyOf));
    const offsets = [-4, -3, -2, -1, 0, 1, 2, 3];
    const offset = offsets.find((candidate) =>
      !floor.has(`${x + dx},${centerY + candidate}`)
      && !floor.has(`${x + dx},${centerY + candidate + 1}`)) ?? -4;
    aperture = [[x, centerY + offset], [x, centerY + offset + 1]];
  }
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
  const floor = new Set(getCorridorRenderFloorCells(corridor).map(keyOf));
  const start = getCorridorDoorway(corridor, true);
  const end = getCorridorDoorway(corridor, false);
  if (![...start.aperture, ...end.aperture].every((cell) => floor.has(keyOf(cell)))) return false;
  if ([...start.outside, ...end.outside].some((cell) => floor.has(keyOf(cell)))) return false;

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
