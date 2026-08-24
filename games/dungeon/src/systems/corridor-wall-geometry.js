function keyOf([x, y]) {
  return `${x},${y}`;
}

export function getCorridorWallCells(floorCells, doorways = [], includeDiagonals = true) {
  const floorKeys = new Set(floorCells.map(keyOf));
  const walls = new Map();
  floorCells.forEach(([x, y]) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (!includeDiagonals && Math.abs(dx) + Math.abs(dy) !== 1) continue;
        const key = `${x + dx},${y + dy}`;
        if (!floorKeys.has(key)) walls.set(key, [x + dx, y + dy]);
      }
    }
  });
  doorways.flatMap((doorway) => doorway.outside || []).forEach((cell) => walls.delete(keyOf(cell)));
  return [...walls.values()];
}
