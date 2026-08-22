export function moveMenuSelection(currentIndex, direction, itemCount) {
  const count = Math.max(0, Math.trunc(Number(itemCount) || 0));
  if (count === 0) return -1;
  const current = ((Math.trunc(Number(currentIndex) || 0) % count) + count) % count;
  const step = Math.sign(Number(direction) || 0);
  return (current + step + count) % count;
}
