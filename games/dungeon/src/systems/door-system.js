function getDoorAppearance(side) {
  if (side === "up") return { texture: "door-up", animation: "door-up-open" };
  if (side === "down") return { texture: "door-down", animation: "door-down-open" };
  return { texture: "door-side", animation: "door-side-open" };
}

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
  door.blocker.setVisible(false).setDisplaySize(door.blockerWidth, door.blockerHeight).refreshBody();
}

export function createSideDoor(scene, options) {
  const { x, y, side, walls, machine = false, initiallyOpen = false } = options;
  const blockerTexture = machine ? "wall-machine" : "wall-fantasy";
  const verticalSide = side === "left" || side === "right";
  const blockerWidth = verticalSide ? 32 : 88;
  const blockerHeight = verticalSide ? 88 : 32;
  const appearance = getDoorAppearance(side);
  const blocker = walls.create(x, y, blockerTexture);
  blocker.setVisible(false).setDisplaySize(blockerWidth, blockerHeight).refreshBody();

  const visual = scene.add.sprite(x, y, appearance.texture, initiallyOpen ? 3 : 0).setScale(4).setDepth(6);
  visual.setFlipX(side === "left");
  if (machine) visual.setTint(0xb5e4ee);

  const door = { x, y, side, walls, blocker, blockerWidth, blockerHeight, animation: appearance.animation, visual, isOpen: initiallyOpen, isAnimating: false };
  setBlockerEnabled(door, !initiallyOpen);
  return door;
}

export function openSideDoor(door) {
  if (!door || door.isOpen) return false;
  door.isOpen = true;
  door.isAnimating = true;
  setBlockerEnabled(door, false);
  door.visual.setVisible(true).setAlpha(1).setFrame(0);
  door.visual.once(`animationcomplete-${door.animation}`, () => {
    door.isAnimating = false;
    door.visual.setFrame(3);
  });
  door.visual.anims.play(door.animation, true);
  return true;
}

export function closeSideDoor(door) {
  if (!door || !door.isOpen) return false;
  door.isOpen = false;
  door.isAnimating = true;
  setBlockerEnabled(door, true);
  door.visual.setVisible(true).setAlpha(1).setFrame(3);
  door.visual.once(`animationcomplete-${door.animation}`, () => {
    door.isAnimating = false;
    door.visual.setFrame(0);
  });
  door.visual.anims.playReverse(door.animation, true);
  return true;
}

export function constrainActorToClosedDoor(actor, door) {
  if (!actor?.active || !door || door.isOpen) return false;

  const actorHalfWidth = actor.body?.halfWidth || 8;
  const actorHalfHeight = actor.body?.halfHeight || 8;
  const blockerHalfWidth = door.blocker?.body?.halfWidth || door.blockerWidth / 2 || 16;
  const blockerHalfHeight = door.blocker?.body?.halfHeight || door.blockerHeight / 2 || 16;
  if (door.side === "up" || door.side === "down") {
    const boundary = door.side === "up"
      ? door.y + blockerHalfHeight + actorHalfHeight
      : door.y - blockerHalfHeight - actorHalfHeight;
    const crossed = door.side === "up" ? actor.y < boundary : actor.y > boundary;
    if (!crossed) return false;
    if (actor.body?.reset) actor.body.reset(actor.x, boundary);
    else actor.setPosition?.(actor.x, boundary);
    return true;
  }
  const boundary = door.side === "left"
    ? door.x + blockerHalfWidth + actorHalfWidth
    : door.x - blockerHalfWidth - actorHalfWidth;
  const crossed = door.side === "left" ? actor.x < boundary : actor.x > boundary;
  if (!crossed) return false;

  if (actor.body?.reset) actor.body.reset(boundary, actor.y);
  else actor.setPosition?.(boundary, actor.y);
  return true;
}
