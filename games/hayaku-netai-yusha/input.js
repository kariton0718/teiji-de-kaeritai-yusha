// Pure pointer geometry is shared by the browser controls and regression tests.
export function canvasPoint(clientX, clientY, rect) {
  const scale = Math.min(rect.width / 480, rect.height / 620);
  const left = rect.left + (rect.width - 480 * scale) / 2;
  const top = rect.top + (rect.height - 620 * scale) / 2;
  return { x: (clientX - left) / scale, y: (clientY - top) / scale };
}
export function stickVector(origin, point) {
  const x = point.x - origin.x, y = point.y - origin.y, d = Math.hypot(x, y);
  if (d < 9) return { x: 0, y: 0 };
  return { x: x / d, y: y / d };
}
