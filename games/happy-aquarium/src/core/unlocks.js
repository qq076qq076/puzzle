import { DECORATIONS, DEVICES, HELPERS, SPECIES } from "../config/game-config.js";

export const CATALOG_NAME_BY_ID = Object.fromEntries(
  [...SPECIES, ...HELPERS, ...DEVICES, ...DECORATIONS].map((item) => [item.id, item.name]),
);

export function ownedCatalogIds(state) {
  return new Set([
    ...(state.tank?.fishes || []).map((item) => item.speciesId),
    ...(state.tank?.helpers || []).map((item) => item.kind),
    ...(state.tank?.devices?.instances || []).map((item) => item.catalogId),
    ...(state.tank?.decorations || []).map((item) => item.catalogId),
  ]);
}

export function missingRequirements(state, item) {
  const owned = ownedCatalogIds(state);
  return (item?.requires || []).filter((id) => !owned.has(id));
}

export function isUnlocked(state, item) {
  return missingRequirements(state, item).length === 0;
}

export function requirementNames(ids) {
  return ids.map((id) => CATALOG_NAME_BY_ID[id] || id);
}
