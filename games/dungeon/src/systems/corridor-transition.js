export function hasReachedCorridorExit(position, exitTrigger, exitSide = "right", doorwayHalfHeight = 52) {
  if (!position || !exitTrigger) return false;
  if (exitSide === "left") return position.x <= exitTrigger[0] && Math.abs(position.y - exitTrigger[1]) <= doorwayHalfHeight;
  if (exitSide === "up") return position.y <= exitTrigger[1] && Math.abs(position.x - exitTrigger[0]) <= doorwayHalfHeight;
  if (exitSide === "down") return position.y >= exitTrigger[1] && Math.abs(position.x - exitTrigger[0]) <= doorwayHalfHeight;
  return position.x >= exitTrigger[0] && Math.abs(position.y - exitTrigger[1]) <= doorwayHalfHeight;
}
