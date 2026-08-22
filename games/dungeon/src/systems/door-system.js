const DOOR_OPEN_ANIMATION = "door-side-open";

function setBlockerEnabled(door, enabled) {
  if (!door?.blocker) return;
  if (!enabled) {
    door.blocker.disableBody(true, true);
    return;
  }
  door.blocker.enableBody(false, door.x, door.y, true, false);
  door.blocker.setVisible(false).setDisplaySize(32, 88).refreshBody();
}

export function createSideDoor(scene, options) {
  const { x, y, side, walls, machine = false, initiallyOpen = false } = options;
  const blockerTexture = machine ? "wall-machine" : "wall-fantasy";
  const frameColor = machine ? 0x7db9ca : 0x6b5548;
  const blocker = walls.create(x, y, blockerTexture);
  blocker.setVisible(false).setDisplaySize(32, 88).refreshBody();

  const frame = scene.add.rectangle(x, y, 46, 112, 0x080a10, 0.88).setStrokeStyle(2, frameColor, 0.95).setDepth(5);
  const visual = scene.add.sprite(x, y, "door-side", initiallyOpen ? 3 : 0).setScale(4).setDepth(6);
  visual.setFlipX(side === "left");
  if (machine) visual.setTint(0xb5e4ee);

  const door = { x, y, side, blocker, frame, visual, isOpen: initiallyOpen, isAnimating: false };
  setBlockerEnabled(door, !initiallyOpen);
  return door;
}

export function openSideDoor(door) {
  if (!door || door.isOpen) return false;
  door.isOpen = true;
  door.isAnimating = true;
  setBlockerEnabled(door, false);
  door.frame.setStrokeStyle(2, 0xdfb84f, 1);
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
  door.frame.setStrokeStyle(2, 0xb94d45, 0.95);
  door.visual.setVisible(true).setAlpha(1).setFrame(3);
  door.visual.once(`animationcomplete-${DOOR_OPEN_ANIMATION}`, () => {
    door.isAnimating = false;
    door.visual.setFrame(0);
  });
  door.visual.anims.playReverse(DOOR_OPEN_ANIMATION, true);
  return true;
}
