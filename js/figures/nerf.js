/*
 * Side project: ray marching semantic classes.
 */
import { clamp, mix, smooth } from '../core/util.js';
import { ink, INK, SOFT, COL } from '../core/palette.js';
import { label, rr } from '../core/canvas.js';

export default function nerfRays(fig) {
  const ctx = fig.ctx, RN = 9, SAMPLES = 26, C = 6.5;
  const pose = k => .5 + .3 * Math.sin(k * 2.2 + .6);
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const k = Math.floor(t / C), tau = t - k * C;
    const fs = clamp(w * .026, 10, 12.5), pad = Math.max(14, w * .055), u = Math.min(w, h);
    const camX = pad + 9, camY = mix(pose(k - 1), pose(k), smooth(tau / .9)) * h;
    const blobs = [{ x: w * .58, y: h * .37, r: u * .2 }, { x: w * .79, y: h * .63, r: u * .23 }];
    const th = Math.atan2(h * .5 - camY, w * .66 - camX), spread = .1;
    const d0 = Math.max(40, w * .15), near = d0 + 14;
    const front = clamp((tau - .9) / 3), vis = 1 - smooth((tau - (C - .6)) / .6);

    blobs.forEach((b, q) => {
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(' + COL[q] + ',.18)'); g.addColorStop(.7, 'rgba(' + COL[q] + ',.09)'); g.addColorStop(1, 'rgba(' + COL[q] + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill();
    });
    label(ctx, 'Class A', blobs[0].x, blobs[0].y - blobs[0].r - 5, fs, SOFT, 'center');
    label(ctx, 'Class B', blobs[1].x, blobs[1].y + blobs[1].r + fs + 2, fs, SOFT, 'center');

    for (let i = 0; i < RN; i++) {
      const ang = th + (i - (RN - 1) / 2) * spread, cx = Math.cos(ang), sy = Math.sin(ang);
      let len = (w - pad - camX) / cx;
      if (sy > 1e-3) len = Math.min(len, (h - pad - camY) / sy);
      else if (sy < -1e-3) len = Math.min(len, (pad - camY) / sy);
      ctx.strokeStyle = ink(.09); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(camX, camY); ctx.lineTo(camX + cx * len, camY + sy * len); ctx.stroke();
      let Tr = 1, a0 = 0, a1 = 0;
      for (let s = 0; s < SAMPLES; s++) {
        const f = (s + .5) / SAMPLES;
        if (f > front) break;
        const dist = near + (len - near) * f, px = camX + cx * dist, py = camY + sy * dist;
        let dens = 0, cls = 0;
        for (let b = 0; b < 2; b++) {
          const q = 1 - smooth((Math.hypot(px - blobs[b].x, py - blobs[b].y) - blobs[b].r * .55) / (blobs[b].r * .4));
          if (q > dens) { dens = q; cls = b; }
        }
        const al = dens * .42, wgt = Tr * al;
        if (cls) a1 += wgt; else a0 += wgt;
        Tr *= 1 - al;
        ctx.beginPath();
        if (dens > .04) {
          ctx.globalAlpha = vis * (.4 + .6 * dens); ctx.fillStyle = 'rgb(' + COL[cls] + ')';
          ctx.arc(px, py, 1.2 + 1.9 * dens, 0, 6.2832);
        } else {
          ctx.globalAlpha = vis * .4; ctx.fillStyle = INK; ctx.arc(px, py, .9, 0, 6.2832);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const pd = d0 / Math.cos(ang - th), ps = Math.max(6, d0 * Math.tan(spread) * .86);
      ctx.save(); ctx.translate(camX + cx * pd, camY + sy * pd); ctx.rotate(th);
      ctx.fillStyle = ink(.1); rr(ctx, -ps / 2, -ps / 2, ps, ps, 1.5); ctx.fill();
      const acc = clamp(a0 + a1);
      if (acc > .01) { ctx.globalAlpha = vis * clamp(acc * 1.2); ctx.fillStyle = 'rgb(' + COL[a1 > a0 ? 1 : 0] + ')'; rr(ctx, -ps / 2, -ps / 2, ps, ps, 1.5); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(camX, camY); ctx.rotate(th);
    ctx.fillStyle = INK; rr(ctx, -10, -6, 10, 12, 2.5); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -5); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  return { draw, stillAt: 4.4 };
}
