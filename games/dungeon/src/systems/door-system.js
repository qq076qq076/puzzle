const DOOR_OPEN_ANIMATION = "door-side-open";

function setBlockerEnabled(door, enabled) {
  if (!door?.blocker) return;
  if (!enabled) {
    door.blocker.disableBody(true, true);
    // Static groups keep a spatial index for collisions. Removing an open
    // door from the group guarantees its stale static body cannot seal the
    // visual doorway until the next physics-tree refresh.
    door.walls?.remove(door.blocker, false, false);
    return;
  }
  if (door.walls && !door.walls.contains(door.blocker)) door.walls.add(door.blocker);
  door.blocker.enableBody(false, door.x, door.y, true, false);
  door.blocker.setVisible(false).setDisplaySize(32, 88).refreshBody();
}

export function createSideDoor(scene, options) {
  const { x, y, side, walls, machine = false, initiallyOpen = false } = options;
  const blockerTexture = machine ? "wall-machine" : "wall-fantasy";
  const blocker = walls.create(x, y, blockerTexture);
  blocker.setVisible(false).setDisplaySize(32, 88).refreshBody();

  const visual = scene.add.sprite(x, y, "door-side", initiallyOpen ? 3 : 0).setScale(4).setDepth(6);
  visual.setFlipX(side === "left");
  if (machine) visual.setTint(0xb5e4ee);

  const door = { x, y, side, walls, blocker, visual, isOpen: initiallyOpen, isAnimating: false };
  setBlockerEnabled(door, !initiallyOpen);
  return door;
}

export function openSideDoor(door) {
  if (!door || door.isOpen) return false;
  door.isOpen = true;
  door.isAnimating = true;
  setBlockerEnabled(door, false);
  door.visual.setVisible(true).setAlpha(1).setFrame(0);
  door.visual.once(`animationcomplete-${DOOR_OPEN_ANIMATION}`, () => {
    door.isAnimating = false;
    door.visual.setFrame(3);
  });
  door.visual.anims.play(DOOR_OPEN_ANIMATION, true);
  return true;
}

export function closeSideDoor(door) {
  if (!door || !door.isOpen) return false;
  door.isOpen = false;
  door.isAnimating = true;
  setBlockerEnabled(door, true);
  door.visual.setVisible(true).setAlpha(1).setFrame(3);
  door.visual.once(`animationcomplete-${DOOR_OPEN_ANIMATION}`, () => {
    door.isAnimating = false;
    door.visual.setFrame(0);
  });
  door.visual.anims.playReverse(DOOR_OPEN_ANIMATION, true);
  return true;
}

export function constrainActorToClosedDoor(actor, door) {
  if (!actor?.active || !door || door.isOpen) return false;

  const actorHalfWidth = actor.body?.halfWidth || 8;
  const blockerHalfWidth = door.blocker?.body?.halfWidth || 16;
  const boundary = door.side === "left"
    ? door.x + blockerHalfWidth + actorHalfWidth
    : door.x - blockerHalfWidth - actorHalfWidth;
  const crossed = door.side === "left" ? actor.x < boundary : actor.x > boundary;
  if (!crossed) return false;

  if (actor.body?.reset) actor.body.reset(boundary, actor.y);
  else actor.setPosition?.(boundary, actor.y);
  return true;
}
