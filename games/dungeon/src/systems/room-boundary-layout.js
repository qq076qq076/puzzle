const FRAME = Object.freeze({ left: 40, right: 920, top: 76, bottom: 512, thickness: 32 });
const DOOR = Object.freeze({ left: 436, right: 524, top: 246, bottom: 334 });

function rectFromEdges(left, top, right, bottom) {
  return [(left + right) / 2, (top + bottom) / 2, right - left, bottom - top];
}

export function getBoundaryWallModels(openSides = []) {
  const openings = new Set(openSides);
  const walls = [];
  const horizontal = (y, side, role) => {
    if (!openings.has(side)) {
      walls.push({ rect: rectFromEdges(FRAME.left, y - FRAME.thickness / 2, FRAME.right, y + FRAME.thickness / 2), role });
      return;
    }
    walls.push({ rect: rectFromEdges(FRAME.left, y - FRAME.thickness / 2, DOOR.left, y + FRAME.thickness / 2), role });
    walls.push({ rect: rectFromEdges(DOOR.right, y - FRAME.thickness / 2, FRAME.right, y + FRAME.thickness / 2), role });
  };
  const vertical = (x, side, role) => {
    if (!openings.has(side)) {
      walls.push({ rect: rectFromEdges(x - FRAME.thickness / 2, FRAME.top, x + FRAME.thickness / 2, FRAME.bottom), role });
      return;
    }
    walls.push({ rect: rectFromEdges(x - FRAME.thickness / 2, FRAME.top, x + FRAME.thickness / 2, DOOR.top), role });
    walls.push({ rect: rectFromEdges(x - FRAME.thickness / 2, DOOR.bottom, x + FRAME.thickness / 2, FRAME.bottom), role });
  };
  horizontal(FRAME.top, "up", "horizontal-top");
  horizontal(FRAME.bottom, "down", "horizontal-bottom");
  vertical(FRAME.left, "left", "vertical-left");
  vertical(FRAME.right, "right", "vertical-right");
  return walls;
}

export function getBoundaryWallRects(openSides = []) {
  return getBoundaryWallModels(openSides).map(({ rect }) => rect);
}

export function getBoundarySeamModels(openSides = []) {
  const openings = new Set(openSides);
  const seams = [
    { rect: [FRAME.left, FRAME.top, FRAME.thickness, FRAME.thickness], role: "corner-top-left" },
    { rect: [FRAME.right, FRAME.top, FRAME.thickness, FRAME.thickness], role: "corner-top-right" },
    { rect: [FRAME.left, FRAME.bottom, FRAME.thickness, FRAME.thickness], role: "corner-bottom-left" },
    { rect: [FRAME.right, FRAME.bottom, FRAME.thickness, FRAME.thickness], role: "corner-bottom-right" },
  ];
  ["up", "down"].forEach((side) => {
    if (!openings.has(side)) return;
    const y = side === "up" ? FRAME.top : FRAME.bottom;
    const role = side === "up" ? "horizontal-top" : "horizontal-bottom";
    seams.push({ rect: [DOOR.left + 4, y, 8, FRAME.thickness], role }, { rect: [DOOR.right - 4, y, 8, FRAME.thickness], role });
  });
  ["left", "right"].forEach((side) => {
    if (!openings.has(side)) return;
    const x = side === "left" ? FRAME.left : FRAME.right;
    const role = side === "left" ? "vertical-left" : "vertical-right";
    seams.push({ rect: [x, DOOR.top + 4, FRAME.thickness, 8], role }, { rect: [x, DOOR.bottom - 4, FRAME.thickness, 8], role });
  });
  return seams;
}

export function getBoundarySeamRects(openSides = []) {
  return getBoundarySeamModels(openSides).map(({ rect }) => rect);
}
