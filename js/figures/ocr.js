/*
 * Wipro: OCR pulling fields out of a document.
 */
import { clamp, mix, smooth, hash, rng } from '../core/util.js';
import { ramp, ink, acc, FAINT, ACC, PAPER } from '../core/palette.js';
import { rr } from '../core/canvas.js';

export default function ocrExtraction(fig) {
  const ctx = fig.ctx, C = 7.5, LINES = 9, FIELDS = 4;
  function pick(k) {
    const r = rng(k + 41), idx = [1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    return idx.slice(0, FIELDS).sort((a, b) => a - b);
  }
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const k = Math.floor(t / C), tau = t - k * C, fields = pick(k);
    const pad = Math.max(14, w * .06);
    const dH = h - 2 * pad, dW = Math.min(dH * .76, w * .34), dX = pad + Math.max(0, (w * .42 - pad - dW) / 2), dY = pad;
    const fade = 1 - smooth((tau - 6.2) / .9);
    const scan = clamp((tau - .5) / 3.2), scanY = dY + dH * scan;
    ctx.fillStyle = PAPER; ctx.strokeStyle = FAINT; ctx.lineWidth = 1;
    rr(ctx, dX, dY, dW, dH, 8); ctx.fill(); ctx.stroke();
    const lx = dX + dW * .13, lw = dW * .74, lh = Math.max(3, dH * .034);
    const lineY = i => dY + dH * (.13 + i * .088);
    const lineW = i => lw * (i === 0 ? .5 : .5 + .5 * hash(i, k, 2));
    for (let i = 0; i < LINES; i++) {
      const y = lineY(i);
      ctx.fillStyle = i === 0 ? ink(.45) : ink(.15);
      rr(ctx, lx, y, lineW(i), lh, lh / 2); ctx.fill();
      if (fields.indexOf(i) >= 0 && scanY > y + lh) {
        ctx.globalAlpha = fade; ctx.fillStyle = ramp(.7);
        rr(ctx, lx, y, lineW(i), lh, lh / 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    if (scan > 0 && scan < 1) {
      const gh = Math.min(dH * .12, scanY - dY - 1);
      if (gh > 1) {
        const g = ctx.createLinearGradient(0, scanY - gh, 0, scanY);
        g.addColorStop(0, acc(0)); g.addColorStop(1, acc(.16));
        ctx.fillStyle = g; ctx.fillRect(dX + 1, scanY - gh, dW - 2, gh);
      }
      ctx.strokeStyle = ACC; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dX - 5, scanY); ctx.lineTo(dX + dW + 5, scanY); ctx.stroke();
    }
    const rx = w * .54, rw = w - pad - rx, rh = Math.max(12, Math.min(dH / FIELDS - 8, 36)), gapR = (dH - FIELDS * rh) / (FIELDS - 1);
    for (let j = 0; j < FIELDS; j++) {
      const i = fields[j], age = tau - (.5 + 3.2 * ((lineY(i) + lh - dY) / dH)), ry = dY + j * (rh + gapR);
      ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      rr(ctx, rx, ry, rw, rh, 9); ctx.stroke(); ctx.setLineDash([]);
      if (age <= 0) continue;
      const pop = smooth(age / .4) * fade;
      const sx = lx + lineW(i) + 5, sy = lineY(i) + lh / 2, ex = rx - 4, ey = ry + rh / 2, mx = (sx + ex) / 2;
      ctx.globalAlpha = pop * mix(.9, .3, smooth((age - .4) / 1));
      ctx.strokeStyle = ACC; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(mx, sy, mx, ey, ex, ey); ctx.stroke();
      ctx.globalAlpha = pop;
      ctx.fillStyle = PAPER; rr(ctx, rx, ry, rw, rh, 9); ctx.fill();
      ctx.strokeStyle = ink(.2); ctx.stroke();
      const bh = Math.max(4, rh * .2), by = ry + (rh - bh) / 2, bx = rx + rh * .34;
      ctx.fillStyle = ink(.28); rr(ctx, bx, by, rw * .2, bh, bh / 2); ctx.fill();
      ctx.fillStyle = ramp(.7); rr(ctx, bx + rw * .26, by, rw * (.25 + .3 * hash(i, k, 5)) * smooth(age / .6), bh, bh / 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  return { draw, stillAt: 5 };
}
