export function hasReachedCorridorExit(position, exitTrigger, doorwayHalfHeight = 52) {
  if (!position || !exitTrigger) return false;
  return position.x >= exitTrigger[0] && Math.abs(position.y - exitTrigger[1]) <= doorwayHalfHeight;
}
