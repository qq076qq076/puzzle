function appendCell(cells, x, y) {
  const last = cells[cells.length - 1];
  if (!last || last[0] !== x || last[1] !== y) cells.push([x, y]);
}

function appendHorizontal(cells, fromX, toX, y) {
  const step = fromX <= toX ? 1 : -1;
  for (let x = fromX; x !== toX + step; x += step) appendCell(cells, x, y);
}

function appendVertical(cells, x, fromY, toY) {
  const step = fromY <= toY ? 1 : -1;
  for (let y = fromY; y !== toY + step; y += step) appendCell(cells, x, y);
}

export function expandCorridorCells(centerline) {
  const floor = new Map();
  const add = (x, y) => floor.set(`${x},${y}`, [x, y]);
  centerline.forEach(([x, y], index) => {
    const previous = centerline[index - 1];
    const next = centerline[index + 1];
    const horizontal = [previous, next].some((point) => point && point[1] === y && point[0] !== x);
    const vertical = [previous, next].some((point) => point && point[0] === x && point[1] !== y);
    add(x, y);
    if (horizontal) add(x, y + 1);
    if (vertical) add(x + 1, y);
    if (horizontal && vertical) add(x + 1, y + 1);
  });
  return [...floor.values()];
}

export function isContinuousCorridor(cells) {
  if (!cells?.length) return false;
  return cells.every((cell, index) => {
    if (index === 0) return true;
    const previous = cells[index - 1];
    return Math.abs(cell[0] - previous[0]) + Math.abs(cell[1] - previous[1]) === 1;
  });
}

export function buildCorridor(sourceRoom, targetRoom, corridorIndex, rng, width = 2) {
  const start = [...sourceRoom.mapExit];
  const end = [...targetRoom.mapEntry];
  const cells = [];
  let templateId = "straight";
  if (start[1] === end[1]) {
    appendHorizontal(cells, start[0], end[0], start[1]);
  } else {
    templateId = "dogleg";
    const minimumTurnX = start[0] + 1;
    const maximumTurnX = Math.max(minimumTurnX, end[0] - 1);
    const midpoint = Math.floor((start[0] + end[0]) / 2);
    const jitter = maximumTurnX > minimumTurnX ? rng.int(-1, 1) : 0;
    const turnX = Math.max(minimumTurnX, Math.min(maximumTurnX, midpoint + jitter));
    appendHorizontal(cells, start[0], turnX, start[1]);
    appendVertical(cells, turnX, start[1], end[1]);
    appendHorizontal(cells, turnX, end[0], end[1]);
  }
  return {
    id: `corridor-${corridorIndex + 1}`,
    corridorIndex,
    from: sourceRoom.id,
    to: targetRoom.id,
    templateId,
    theme: targetRoom.theme === "machine" ? "machine" : sourceRoom.theme,
    width,
    start,
    end,
    cells,
    floorCells: expandCorridorCells(cells),
    length: cells.length,
  };
}
