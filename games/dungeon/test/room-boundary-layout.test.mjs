import test from "node:test";
import assert from "node:assert/strict";
import { ROOM_SIDES } from "../src/data/rooms.js";
import { getBoundarySeamRects, getBoundaryWallRects } from "../src/systems/room-boundary-layout.js";

function edges([x, y, width, height]) {
  return [x - width / 2, y - height / 2, x + width / 2, y + height / 2];
}

test("boundary walls overlap at every corner without holes", () => {
  const rects = getBoundaryWallRects([]).map(edges);
  [[40, 76], [920, 76], [40, 512], [920, 512]].forEach(([x, y]) => {
    assert.ok(rects.filter(([left, top, right, bottom]) => x >= left && x <= right && y >= top && y <= bottom).length >= 2);
  });
});

test("wall segments meet every door blocker and have asset-backed seam patches", () => {
  ROOM_SIDES.forEach((side) => {
    const rects = getBoundaryWallRects([side]).map(edges);
    const seams = getBoundarySeamRects([side]);
    assert.equal(seams.length, 6);
    if (side === "up" || side === "down") {
      const y = side === "up" ? 76 : 512;
      assert.ok(rects.some(([, top, right, bottom]) => right === 436 && y >= top && y <= bottom));
      assert.ok(rects.some(([left, top, , bottom]) => left === 524 && y >= top && y <= bottom));
    } else {
      const x = side === "left" ? 40 : 920;
      assert.ok(rects.some(([left, , right, bottom]) => bottom === 246 && x >= left && x <= right));
      assert.ok(rects.some(([left, top, right]) => top === 334 && x >= left && x <= right));
    }
  });
});
