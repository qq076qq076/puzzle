import { ACTOR_ASSETS, PROVIDED_ASSETS } from "../data/assets.js";

function animationKey(actorId, state, direction) {
  return `actor-${actorId}-${state}-${direction}`;
}

function hasNumberedFrames(scene, textureKey) {
  if (!scene.textures.exists(textureKey)) return false;
  const texture = scene.textures.get(textureKey);
  return texture.has(0) || texture.has("0");
}

export function registerCraftPixAnimations(scene) {
  Object.entries(ACTOR_ASSETS).forEach(([actorId, actor]) => {
    Object.entries(actor.states).forEach(([state, directions]) => {
      Object.entries(directions).forEach(([direction, definition]) => {
        const key = animationKey(actorId, state, direction);
        if (scene.anims.exists(key) || !hasNumberedFrames(scene, definition.key)) return;
        scene.anims.create({
          key,
          frames: scene.anims.generateFrameNumbers(definition.key, {
            start: definition.start ?? 0,
            end: definition.end ?? definition.frameCount - 1,
          }),
          frameRate: definition.frameRate,
          repeat: definition.repeat,
        });
      });
    });
  });

  PROVIDED_ASSETS.environmentAnimations.forEach((definition) => {
    if (scene.anims.exists(definition.key)) return;
    if (definition.frames) {
      if (definition.frames.some((textureKey) => !scene.textures.exists(textureKey))) return;
      scene.anims.create({
        key: definition.key,
        frames: definition.frames.map((textureKey) => ({ key: textureKey })),
        frameRate: definition.frameRate,
        repeat: definition.repeat ?? -1,
      });
      return;
    }
    if (!hasNumberedFrames(scene, definition.texture)) return;
    scene.anims.create({
      key: definition.key,
      frames: scene.anims.generateFrameNumbers(definition.texture, {
        start: definition.start ?? 0,
        end: definition.end ?? definition.frameCount - 1,
      }),
      frameRate: definition.frameRate,
      repeat: definition.repeat ?? -1,
    });
  });
}

export function getFacingDirection(vector) {
  const x = Number(vector?.x) || 0;
  const y = Number(vector?.y) || 0;
  if (Math.abs(x) > Math.abs(y)) return "side";
  return y < 0 ? "up" : "down";
}

export function getActorOrientation(actorId, facing) {
  const actor = ACTOR_ASSETS[actorId];
  const x = Number(facing?.x) || 0;
  const y = Number(facing?.y) || 0;
  const direction = actor?.directionalSides && Math.abs(x) > Math.abs(y)
    ? (x < 0 ? "left" : "right")
    : getFacingDirection(facing);
  if (!actor) return { direction, flipX: false, rotation: 0 };

  if (actor.rotationMode === "from-down") {
    const rotation = direction === "up" ? Math.PI : direction === "side" ? (x < 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
    return { direction, flipX: false, rotation };
  }

  const canFlip = direction === "side" || Boolean(actor.flipVerticalByHorizontalFacing && Math.abs(x) > 0.05);
  const baseFacesLeft = actor.sideFaces === "left";
  const flipX = canFlip && (baseFacesLeft ? x >= 0 : x < 0);
  return { direction, flipX, rotation: 0 };
}

export function playActorAnimation(sprite, actorId, state, facing, options = {}) {
  const actor = ACTOR_ASSETS[actorId];
  if (!actor) return false;
  const { direction, flipX, rotation } = getActorOrientation(actorId, facing);
  const requestedState = actor.states[state] ? state : actor.states.walk ? "walk" : "idle";
  const definition = actor.states[requestedState]?.[direction] || actor.states.idle?.[direction];
  if (!definition) return false;
  const key = animationKey(actorId, requestedState, direction);
  if (!sprite.scene.anims.exists(key)) return false;
  sprite.setFlipX(flipX);
  sprite.setRotation(rotation);
  sprite.anims.play(key, !options.restart);
  return true;
}

export function playEnvironmentAnimation(sprite, key) {
  if (!sprite?.scene?.anims.exists(key)) return false;
  sprite.anims.play(key, true);
  return true;
}
