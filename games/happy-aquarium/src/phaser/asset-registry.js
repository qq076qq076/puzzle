import catalog from "../../assets/catalog.json";
import manifest from "../../assets/manifest.json";

const runtimeModules = import.meta.glob("../../assets/runtime/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const urls = new Map(
  Object.entries(runtimeModules).map(([path, url]) => [path.replace(/^.*\/assets\/runtime\//, ""), url]),
);

export { catalog, manifest };

export function runtimeUrl(relativePath) {
  const url = urls.get(relativePath.replace(/^runtime\//, ""));
  if (!url) throw new Error(`Missing runtime asset: ${relativePath}`);
  return url;
}

export function fishTextureKey(speciesId) { return `fish:${speciesId}`; }
export function fishTurnTextureKey(speciesId) { return `fish-turn:${speciesId}`; }
export function backgroundTextureKey(id) { return `background:${id}`; }
export function helperTextureKey(helperId, state) { return `helper:${helperId}:${state}`; }
export function deviceTextureKey(deviceId, state) { return `device:${deviceId}:${state}`; }
export function objectTextureKey(objectId) { return `object:${objectId}`; }
export function decorationTextureKey(id) { return `decor:${id}`; }
export function uiTextureKey(id) { return `ui:${id}`; }
