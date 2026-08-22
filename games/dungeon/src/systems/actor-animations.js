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
          frames: scene.anims.generateFrameNumbers(definition.key, { start: 0, end: definition.frameCount - 1 }),
          frameRate: definition.frameRate,
          repeat: definition.repeat,
        });
      });
    });
  });

  PROVIDED_ASSETS.environmentAnimations.forEach((definition) => {
    if (scene.anims.exists(definition.key) || !hasNumberedFrames(scene, definition.texture)) return;
    scene.anims.create({
      key: definition.key,
      frames: scene.anims.generateFrameNumbers(definition.texture, { start: 0, end: definition.frameCount - 1 }),
      frameRate: definition.frameRate,
      repeat: -1,
    });
  });
}

export function getFacingDirection(vector) {
  const x = Number(vector?.x) || 0;
  const y = Number(vector?.y) || 0;
  if (Math.abs(x) > Math.abs(y)) return "side";
  return y < 0 ? "up" : "down";
}

export function playActorAnimation(sprite, actorId, state, facing, options = {}) {
  const actor = ACTOR_ASSETS[actorId];
  if (!actor) return false;
  const direction = getFacingDirection(facing);
  const requestedState = actor.states[state] ? state : actor.states.walk ? "walk" : "idle";
  const definition = actor.states[requestedState]?.[direction] || actor.states.idle?.[direction];
  if (!definition) return false;
  const key = animationKey(actorId, requestedState, direction);
  if (!sprite.scene.anims.exists(key)) return false;
  sprite.setFlipX(direction === "side" && (Number(facing?.x) || 0) < 0);
  sprite.anims.play(key, !options.restart);
  return true;
}

export function playEnvironmentAnimation(sprite, key) {
  if (!sprite?.scene?.anims.exists(key)) return false;
  sprite.anims.play(key, true);
  return true;
}
