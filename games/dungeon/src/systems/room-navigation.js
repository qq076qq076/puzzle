import { pointWalkable } from "./room-validation.js";

function actorPadding(actor) {
  return Math.max(actor?.body?.halfWidth || 0, actor?.body?.halfHeight || 0, 10);
}

function moveActor(actor, x, y) {
  actor.knockbackRemaining = 0;
  actor.knockbackVelocityX = 0;
  actor.knockbackVelocityY = 0;
  if (actor.body?.reset) actor.body.reset(x, y);
  else actor.setPosition?.(x, y);
  actor.setVelocity?.(0, 0);
}

export function keepActorOnRoomFloor(actor, obstacles = []) {
  if (!actor?.active) return false;
  const padding = actorPadding(actor);
  if (pointWalkable(actor.x, actor.y, obstacles, padding)) {
    actor.lastWalkableFloor = { x: actor.x, y: actor.y };
    return false;
  }

  const previous = actor.lastWalkableFloor;
  if (previous && pointWalkable(previous.x, previous.y, obstacles, padding)) {
    moveActor(actor, previous.x, previous.y);
    return true;
  }

  for (let radius = 8; radius <= 96; radius += 8) {
    for (let index = 0; index < 16; index += 1) {
      const angle = (Math.PI * 2 * index) / 16;
      const x = actor.x + Math.cos(angle) * radius;
      const y = actor.y + Math.sin(angle) * radius;
      if (!pointWalkable(x, y, obstacles, padding)) continue;
      moveActor(actor, x, y);
      actor.lastWalkableFloor = { x, y };
      return true;
    }
  }
  return false;
}
