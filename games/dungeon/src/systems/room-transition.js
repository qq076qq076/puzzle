export function hasCrossedExit(position, room, doorwayHalfSize = 34) {
  if (!position || !room?.exitTrigger) return false;
  const [triggerX, triggerY] = room.exitTrigger;
  if (room.exitSide === "left") return position.x <= triggerX && Math.abs(position.y - triggerY) <= doorwayHalfSize;
  if (room.exitSide === "up") return position.y <= triggerY && Math.abs(position.x - triggerX) <= doorwayHalfSize;
  if (room.exitSide === "down") return position.y >= triggerY && Math.abs(position.x - triggerX) <= doorwayHalfSize;
  return position.x >= triggerX && Math.abs(position.y - triggerY) <= doorwayHalfSize;
}
