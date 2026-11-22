/*
 * L&T Infotech: bottles segmented as they cross a line camera.
 */
import { clamp, smooth, hash } from '../core/util.js';
import { ink, acc, teal, INK, SOFT, FAINT, ACC, TEAL, PAPER, ONACC } from '../core/palette.js';
import { label, rr } from '../core/canvas.js';

export default function bottleLine(fig) {
  const ctx = fig.ctx;
  function outline(x, y, bw, bh) {
    const L = x - bw / 2, R = x + bw / 2, top = y - bh, nw = bw * .44, nL = x - nw / 2, nR = x + nw / 2;
    const capH = bh * .11, shY = top + capH + bh * .13, sh = bh * .13, r = bw * .2;
    ctx.beginPath();
    ctx.moveTo(nL, top + capH); ctx.lineTo(nL, shY); ctx.quadraticCurveTo(L, shY, L, shY + sh);
    ctx.lineTo(L, y - r); ctx.quadraticCurveTo(L, y, L + r, y); ctx.lineTo(R - r, y); ctx.quadraticCurveTo(R, y, R, y - r);
    ctx.lineTo(R, shY + sh); ctx.quadraticCurveTo(R, shY, nR, shY); ctx.lineTo(nR, top + capH); ctx.closePath();
  }
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const pad = Math.max(14, w * .06), fs = clamp(w * .026, 10, 12.5);
    const beltY = Math.round(h * .8), sp = Math.max(58, w * .17), bw = sp * .44, bh = Math.min(h * .46, bw * 2.2), v = sp * .4;
    const xs = Math.round(w * .5) + .5, off = (t * v) % sp, first = Math.floor((t * v) / sp);
    ctx.strokeStyle = ink(.28); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, beltY + .5); ctx.lineTo(w, beltY + .5); ctx.stroke();
    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = ((t * v) % 22) - 22; x < w + 22; x += 22) { ctx.moveTo(x, beltY + 5); ctx.lineTo(x - 5, beltY + 11); }
    ctx.stroke();
    const n = Math.ceil(w / sp) + 2, capH = bh * .11, nw = bw * .44;
    for (let i = -1; i < n; i++) {
      const x = -sp / 2 + i * sp + off, id = first - i;
      const edge = clamp(Math.min(x + bw, w - x + bw) / (bw * 1.8));
      const bad = hash(id, 3) < .3;
      const dxp = x + (hash(id, 4) - .5) * bw * .4, dyp = beltY - bh * (.2 + .3 * hash(id, 5));
      ctx.globalAlpha = edge;
      outline(x, beltY, bw, bh); ctx.fillStyle = PAPER; ctx.fill();
      ctx.strokeStyle = ink(.3); ctx.lineWidth = 1.25; ctx.stroke();
      ctx.fillStyle = ink(.32); rr(ctx, x - nw / 2 - 2, beltY - bh, nw + 4, capH - 1.5, 2); ctx.fill();
      if (bad) { ctx.fillStyle = ink(.55); ctx.beginPath(); ctx.ellipse(dxp, dyp, bw * .09, bw * .05, hash(id, 6) * 3, 0, 6.2832); ctx.fill(); }
      if (x + bw / 2 > xs) {
        // everything past the camera line has been segmented
        ctx.save(); ctx.beginPath(); ctx.rect(xs, 0, w, h); ctx.clip();
        outline(x, beltY, bw, bh);
        ctx.fillStyle = bad ? acc(.14) : teal(.2); ctx.fill();
        ctx.strokeStyle = bad ? ACC : TEAL; ctx.lineWidth = 2; ctx.stroke();
        if (bad) { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(dxp, dyp, bw * .17, 0, 6.2832); ctx.stroke(); }
        ctx.restore();
        if (bad && x - bw / 2 > xs) {
          ctx.globalAlpha = edge * smooth((x - bw / 2 - xs) / 14);
          const tw = fs * 4.9, th = fs * 1.7, ty = beltY - bh - th - 7;
          ctx.fillStyle = ACC; rr(ctx, x - tw / 2, ty, tw, th, th / 2); ctx.fill();
          label(ctx, 'anomaly', x, ty + th * .68, fs * .9, ONACC, 'center', 600);
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = ACC; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xs, pad + fs + 16); ctx.lineTo(xs, beltY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = INK; rr(ctx, xs - 9, pad + fs + 4, 18, 12, 3); ctx.fill();
    label(ctx, 'Line camera', xs, pad + fs * .8, fs, SOFT, 'center');
  }
  return { draw, stillAt: 3.2 };
}
