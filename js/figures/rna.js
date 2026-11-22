/*
 * Side project: RNA base pairs and reactivity.
 */
import { clamp, mix, smooth, hash, rng } from '../core/util.js';
import { ramp, ink, INK, SOFT } from '../core/palette.js';
import { label, rr } from '../core/canvas.js';

export default function rnaFolding(fig) {
  const ctx = fig.ctx, SEQ = 'GGCAGAAUCUGGGAAAUACCAGAUACUGCA', N = SEQ.length, C = 9;
  const pairs = [[1, 28], [2, 27], [3, 26], [4, 25], [8, 21], [9, 20], [10, 19], [11, 18]];
  const paired = new Set(); pairs.forEach(p => { paired.add(p[0]); paired.add(p[1]); });
  const r = rng(77), spur = [];
  for (let guard = 0; spur.length < 12 && guard < 200; guard++) {
    const i = Math.floor(r() * (N - 5)), j = i + 4 + Math.floor(r() * (N - i - 4));
    if (!pairs.some(p => p[0] === i && p[1] === j)) spur.push([i, j, .3 + r() * .5]);
  }
  const target = []; for (let i = 0; i < N; i++) target.push(paired.has(i) ? .06 + .12 * hash(i, 4) : .5 + .5 * hash(i, 5));
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const tau = t % C, c = tau < 6.6 ? smooth((tau - .4) / 3.2) : 1 - smooth((tau - 6.6) / 2.2);
    const fs = clamp(w * .026, 10, 12.5), pad = Math.max(14, w * .055);
    const dx = (w - 2 * pad) / (N - 1), X = i => pad + i * dx;
    const baseY = Math.round(h * .58), arcMax = baseY - pad - fs - 12;
    const letters = dx >= 8.5, fsL = clamp(dx * .78, 7, 11.5);
    const barTop = baseY + (letters ? fsL + 7 : 9), barMax = Math.max(8, h - pad - fs - 8 - barTop);
    const arc = (i, j) => {
      const rx = ((j - i) * dx) / 2, ry = Math.min(rx, arcMax * Math.pow((j - i) / 27, .75));
      ctx.beginPath(); ctx.ellipse((X(i) + X(j)) / 2, baseY - 5, rx, ry, 0, Math.PI, 2 * Math.PI); ctx.stroke();
    };
    ctx.lineWidth = 1;
    for (const sp of spur) { const a = sp[2] * (1 - c) * .5; if (a > .01) { ctx.strokeStyle = ink(a.toFixed(3)); arc(sp[0], sp[1]); } }
    ctx.strokeStyle = ramp(.5 + .38 * c); ctx.lineWidth = 1.25 + 1.25 * c; ctx.globalAlpha = .35 + .65 * c;
    for (const p of pairs) arc(p[0], p[1]);
    ctx.globalAlpha = 1;
    for (let i = 0; i < N; i++) {
      const strong = paired.has(i) && c > .5;
      if (letters) label(ctx, SEQ[i], X(i), baseY + fsL, fsL, strong ? INK : SOFT, 'center', strong ? 600 : 500);
      else { ctx.fillStyle = strong ? INK : SOFT; ctx.beginPath(); ctx.arc(X(i), baseY + 2, 1.6, 0, 6.2832); ctx.fill(); }
      const wob = .2 + .6 * (.5 + .5 * Math.sin(t * (1.6 + 2.4 * hash(i, 1)) + 6.283 * hash(i, 2)));
      const v = mix(wob, target[i], c), bw = Math.max(2, dx * .6);
      ctx.fillStyle = ramp(.22 + .68 * v);
      rr(ctx, X(i) - bw / 2, barTop, bw, Math.max(2, v * barMax), Math.min(3, bw / 2)); ctx.fill();
    }
    label(ctx, 'Base-pair probability', pad, pad + fs * .8, fs, SOFT);
    label(ctx, 'Reactivity', pad, h - pad + 2, fs, SOFT);
  }
  return { draw, stillAt: 5 };
}
