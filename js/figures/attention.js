/*
 * Hero: a patch grid that attends to the pointer.
 */
import { clamp } from '../core/util.js';
import { ramp, ink } from '../core/palette.js';
import { rr } from '../core/canvas.js';

export default function attention(fig) {
  const ctx = fig.ctx;
  let fx = .64, fy = .4, lastT = 0, ptr = null, ptrAt = -99;
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    ptr = [e.clientX, e.clientY]; ptrAt = fig.t;
  }, { passive: true });
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const dt = clamp(t - lastT, 0, .1); lastT = t;
    const cs = w < 640 ? 36 : 48, cols = Math.ceil(w / cs), rows = Math.ceil(h / cs);
    const ox = (w - cols * cs) / 2, oy = (h - rows * cs) / 2, inset = 3, s = cs - 2 * inset;
    let tx = w * (.5 + .36 * Math.sin(t * .21 + 1.1)), ty = h * (.46 + .3 * Math.sin(t * .16 + 2.3));
    if (ptr && t - ptrAt < 2.5) { const r = fig.canvas.getBoundingClientRect(); tx = ptr[0] - r.left; ty = ptr[1] - r.top; }
    const k = dt ? 1 - Math.exp(-dt * 5) : 1;
    fx += (tx / w - fx) * k; fy += (ty / h - fy) * k;
    const px = fx * w, py = fy * h, s1 = 2 * (cs * 2.2) ** 2, s2 = 2 * (cs * 2.9) ** 2;
    const qx = w * (.5 + .4 * Math.cos(t * .12 + 4)), qy = h * (.55 + .32 * Math.sin(t * .18 + .7));
    ctx.lineWidth = 1; ctx.strokeStyle = ink(.06);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = ox + c * cs + inset, y = oy + r * cs + inset, cx = x + s / 2, cy = y + s / 2;
      const a = Math.min(1, Math.exp(-((cx - px) ** 2 + (cy - py) ** 2) / s1) + .5 * Math.exp(-((cx - qx) ** 2 + (cy - qy) ** 2) / s2));
      rr(ctx, x, y, s, s, 8);
      if (a > .04) { ctx.globalAlpha = a * .8; ctx.fillStyle = ramp(.08 + .27 * a); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.stroke();
    }
  }
  return { draw, stillAt: 4 };
}
