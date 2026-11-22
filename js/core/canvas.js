// Canvas helpers used by the drawings.
const SANS = '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function label(ctx, s, x, y, size, color, align, weight) {
  ctx.font = (weight || 500) + ' ' + size + 'px ' + SANS;
  ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

// Start a rounded-rectangle path (plain rectangle where roundRect is missing).
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), r); else ctx.rect(x, y, Math.max(0, w), Math.max(0, h));
}

// A point on a cubic Bezier curve at parameter u.
export function bez(x0, y0, x1, y1, x2, y2, x3, y3, u) {
  const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u;
  return [a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3];
}
