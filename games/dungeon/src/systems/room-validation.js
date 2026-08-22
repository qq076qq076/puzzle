import { ROOM_BOUNDS } from "../data/rooms.js";

export function pointWalkable(x, y, obstacles, padding = 18) {
  if (x < ROOM_BOUNDS.left + padding || x > ROOM_BOUNDS.right - padding || y < ROOM_BOUNDS.top + padding || y > ROOM_BOUNDS.bottom - padding) return false;
  return !obstacles.some(([ox, oy, width, height]) => x >= ox - padding && x <= ox + width + padding && y >= oy - padding && y <= oy + height + padding);
}

export function hasGridPath(start, goal, obstacles) {
  const step = 28;
  const toGrid = ([x, y]) => [Math.round(x / step), Math.round(y / step)];
  const startGrid = toGrid(start);
  const goalGrid = toGrid(goal);
  const queue = [startGrid];
  const visited = new Set([startGrid.join(",")]);
  let cursor = 0;
  while (cursor < queue.length) {
    const [x, y] = queue[cursor];
    cursor += 1;
    if (x === goalGrid[0] && y === goalGrid[1]) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, y + dy];
      const key = next.join(",");
      if (visited.has(key)) continue;
      const point = [next[0] * step, next[1] * step];
      if (!pointWalkable(point[0], point[1], obstacles, 12)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

export function estimateWalkableArea(obstacles) {
  const cell = 24;
  let walkable = 0;
  let total = 0;
  for (let y = ROOM_BOUNDS.top; y <= ROOM_BOUNDS.bottom; y += cell) {
    for (let x = ROOM_BOUNDS.left; x <= ROOM_BOUNDS.right; x += cell) {
      total += 1;
      if (pointWalkable(x, y, obstacles, 0)) walkable += 1;
    }
  }
  return total ? walkable / total : 0;
}

export function validateRoom(room) {
  const path = hasGridPath(room.entry, room.exit, room.obstacles);
  const safeSpawns = room.spawnPoints.every((point) =>
    pointWalkable(point[0], point[1], room.obstacles, 10) && Math.hypot(point[0] - room.entry[0], point[1] - room.entry[1]) >= 192,
  );
  const trapSafe = room.trapPoints.every((point) => pointWalkable(point[0], point[1], room.obstacles, 2));
  const area = estimateWalkableArea(room.obstacles) >= 0.6;
  return { valid: path && safeSpawns && trapSafe && area, path, safeSpawns, trapSafe, area };
}
