const FRAME = Object.freeze({ left: 40, right: 920, top: 76, bottom: 512, thickness: 32 });
const DOOR = Object.freeze({ left: 436, right: 524, top: 246, bottom: 334 });

function rectFromEdges(left, top, right, bottom) {
  return [(left + right) / 2, (top + bottom) / 2, right - left, bottom - top];
}

export function getBoundaryWallRects(openSides = []) {
  const openings = new Set(openSides);
  const walls = [];
  const horizontal = (y, side) => {
    if (!openings.has(side)) {
      walls.push(rectFromEdges(FRAME.left, y - FRAME.thickness / 2, FRAME.right, y + FRAME.thickness / 2));
      return;
    }
    walls.push(rectFromEdges(FRAME.left, y - FRAME.thickness / 2, DOOR.left, y + FRAME.thickness / 2));
    walls.push(rectFromEdges(DOOR.right, y - FRAME.thickness / 2, FRAME.right, y + FRAME.thickness / 2));
  };
  const vertical = (x, side) => {
    if (!openings.has(side)) {
      walls.push(rectFromEdges(x - FRAME.thickness / 2, FRAME.top, x + FRAME.thickness / 2, FRAME.bottom));
      return;
    }
    walls.push(rectFromEdges(x - FRAME.thickness / 2, FRAME.top, x + FRAME.thickness / 2, DOOR.top));
    walls.push(rectFromEdges(x - FRAME.thickness / 2, DOOR.bottom, x + FRAME.thickness / 2, FRAME.bottom));
  };
  horizontal(FRAME.top, "up");
  horizontal(FRAME.bottom, "down");
  vertical(FRAME.left, "left");
  vertical(FRAME.right, "right");
  return walls;
}

export function getBoundarySeamRects(openSides = []) {
  const openings = new Set(openSides);
  const seams = [
    [FRAME.left, FRAME.top, FRAME.thickness, FRAME.thickness],
    [FRAME.right, FRAME.top, FRAME.thickness, FRAME.thickness],
    [FRAME.left, FRAME.bottom, FRAME.thickness, FRAME.thickness],
    [FRAME.right, FRAME.bottom, FRAME.thickness, FRAME.thickness],
  ];
  ["up", "down"].forEach((side) => {
    if (!openings.has(side)) return;
    const y = side === "up" ? FRAME.top : FRAME.bottom;
    seams.push([DOOR.left + 4, y, 8, FRAME.thickness], [DOOR.right - 4, y, 8, FRAME.thickness]);
  });
  ["left", "right"].forEach((side) => {
    if (!openings.has(side)) return;
    const x = side === "left" ? FRAME.left : FRAME.right;
    seams.push([x, DOOR.top + 4, FRAME.thickness, 8], [x, DOOR.bottom - 4, FRAME.thickness, 8]);
  });
  return seams;
}
