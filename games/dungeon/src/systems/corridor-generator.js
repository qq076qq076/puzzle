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

function findHorizontalRuns(centerline) {
  const runs = [];
  let startIndex = 0;
  for (let index = 1; index <= centerline.length; index += 1) {
    const previous = centerline[index - 1];
    const current = centerline[index];
    if (current && current[1] === previous[1] && Math.abs(current[0] - previous[0]) === 1) continue;
    const cells = centerline.slice(startIndex, index);
    if (cells.length >= 4 && cells.every((cell) => cell[1] === cells[0][1])) runs.push(cells);
    startIndex = index;
  }
  return runs;
}

export function buildLoopBranch(centerline, rng, depth = 3) {
  const runs = findHorizontalRuns(centerline);
  if (!runs.length) return null;
  const longestLength = Math.max(...runs.map((run) => run.length));
  const run = rng.pick(runs.filter((candidate) => candidate.length === longestLength));
  const span = Math.min(4, run.length - 3);
  const maximumStart = Math.max(1, run.length - span - 2);
  const startOffset = maximumStart > 1 ? rng.int(1, maximumStart) : 1;
  const start = run[startOffset];
  const end = run[startOffset + span];
  const direction = rng.next() < 0.5 ? -1 : 1;
  const branchY = start[1] + direction * depth;
  const cells = [];
  appendVertical(cells, start[0], start[1], branchY);
  appendHorizontal(cells, start[0], end[0], branchY);
  appendVertical(cells, end[0], branchY, end[1]);
  return {
    id: "loop-1",
    templateId: "loop",
    cells,
    floorCells: expandCorridorCells(cells),
    eventCell: [Math.floor((start[0] + end[0]) / 2), branchY],
  };
}

function pickEventCells(corridorIndex, mainCells, branch, eventRng) {
  const chest = eventRng.next() < 0.45
    ? {
        cell: [...branch.eventCell],
        reward: eventRng.next() < 0.72
          ? { type: "gold", amount: eventRng.int(12, 24) }
          : { type: "potion", amount: 1 },
      }
    : null;
  const chestKey = chest?.cell.join(",");
  const candidates = [...mainCells.slice(2, -2), ...branch.cells.slice(2, -2)]
    .filter((cell, index, values) => cell.join(",") !== chestKey && values.findIndex((value) => value.join(",") === cell.join(",")) === index);
  const trapCells = [];
  const trapCount = Math.min(candidates.length, 2 + (corridorIndex % 2));
  while (candidates.length && trapCells.length < trapCount) {
    trapCells.push(candidates.splice(eventRng.int(0, candidates.length - 1), 1)[0]);
  }
  return { chest, trapCells };
}

export function buildCorridor(sourceRoom, targetRoom, corridorIndex, rng, width = 2, eventRng = rng, branchDepth = 3) {
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
  const branch = buildLoopBranch(cells, rng, branchDepth);
  const branches = branch ? [branch] : [];
  const floorCells = uniqueFloorCells([...expandCorridorCells(cells), ...branches.flatMap((item) => item.floorCells)]);
  const events = branch ? pickEventCells(corridorIndex, cells, branch, eventRng) : { chest: null, trapCells: [] };
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
    floorCells,
    branches,
    trapCells: events.trapCells,
    chest: events.chest,
    length: cells.length,
  };
}

function uniqueFloorCells(cells) {
  return [...new Map(cells.map((cell) => [cell.join(","), cell])).values()];
}
