/*
 * CRIM: DDIM inversion and reconstruction.
 */
import { $, clamp, mix, smooth, hash, setText } from '../core/util.js';
import { ramp, ink, SOFT, FAINT, EMPTY, ACC } from '../core/palette.js';
import { label } from '../core/canvas.js';

export default function ddimInversion(fig) {
  const ctx = fig.ctx, N = 12, C = 10, STEPS = 20;
  const out = { phase: $('#f3-phase'), t: $('#f3-t') };
  const x0 = new Float32Array(N * N), eps = new Float32Array(N * N), xh = new Float32Array(N * N), err = new Float32Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u = (j + .5) / N, v = (i + .5) / N;
    const head = 1 - smooth((((u - .5) / .2) ** 2 + ((v - .4) / .26) ** 2 - .7) / .6);
    const sh = 1 - smooth((((u - .5) / .46) ** 2 + ((v - 1.1) / .36) ** 2 - .75) / .5);
    x0[i * N + j] = clamp(.1 + head * (.62 + .3 * (.5 - u) + .1 * (.4 - v)) + (1 - head) * sh * .42);
    eps[i * N + j] = (hash(i, j, 1) + hash(i, j, 2) + hash(i, j, 3) - 1.5) * .9;
  }
  let emax = 1e-6;
  const at = (i, j) => x0[clamp(i, 0, N - 1) * N + clamp(j, 0, N - 1)];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const g = Math.abs(at(i, j + 1) - at(i, j - 1)) + Math.abs(at(i + 1, j) - at(i - 1, j));
    const e = g * (.5 + hash(i, j, 5)) + .03 * hash(i, j, 6);
    err[i * N + j] = e; emax = Math.max(emax, e);
  }
  for (let q = 0; q < N * N; q++) {
    err[q] /= emax;
    xh[q] = clamp(x0[q] + (hash(q, 7) < .5 ? -1 : 1) * err[q] * .16);
  }
  const NAMES = ['Input', 'Latent', 'Rebuilt', 'Error'];
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const tau = t % C;
    const fs = clamp(w * .026, 10, 12.5), pad = Math.max(14, w * .055), ga = Math.max(14, w * .045), trackH = 30;
    const top = pad + fs + 8;
    const s = Math.max(24, Math.floor(Math.min((w - 2 * pad - 3 * ga) / 4, h - top - trackH - pad * .7)));
    const total = 4 * s + 3 * ga, xa = (w - total) / 2, ya = top + Math.max(0, (h - top - trackH - pad * .7 - s) / 2);
    const cell = s / N, gp = cell > 6 ? 1 : .5;
    const inv = clamp((tau - .6) / 3), rec = clamp((tau - 4.2) / 3), rev = clamp((tau - 7.3) / .8), fadeOut = smooth((tau - 9.3) / .7);
    const sI = Math.round(inv * STEPS) / STEPS, sR = Math.round(rec * STEPS) / STEPS;
    const abI = Math.cos(sI * Math.PI / 2) ** 2, abR = Math.cos((1 - sR) * Math.PI / 2) ** 2;
    for (let p = 0; p < 4; p++) {
      const tx = xa + p * (s + ga);
      label(ctx, NAMES[p], tx, ya - 8, fs, SOFT);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const q = i * N + j, cx = tx + j * cell, cy = ya + i * cell;
        let v = -1;
        if (p === 0) v = x0[q];
        else if (p === 1) v = mix(clamp(.5 + Math.sqrt(abI) * (x0[q] - .5) + Math.sqrt(1 - abI) * eps[q]), x0[q], fadeOut);
        else if (p === 2) { if (tau >= 4.2) v = clamp(.5 + Math.sqrt(abR) * (xh[q] - .5) + Math.sqrt(1 - abR) * eps[q]); }
        else if (tau >= 7.3 && (i + j) / (2 * N - 2) <= rev * 1.05) v = err[q];
        if (v < 0 || (p >= 2 && fadeOut > 0)) { ctx.fillStyle = EMPTY; ctx.fillRect(cx, cy, cell - gp, cell - gp); }
        if (v >= 0) {
          if (p >= 2) ctx.globalAlpha = 1 - fadeOut;
          ctx.fillStyle = ramp(v); ctx.fillRect(cx, cy, cell - gp, cell - gp);
          ctx.globalAlpha = 1;
        }
      }
      if (p < 3) {
        const active = p === 0 ? inv > 0 && inv < 1 : p === 1 ? rec > 0 && rec < 1 : rev > 0 && tau < 9.3;
        const ax = tx + s + ga / 2 - .5, ay = ya + s / 2;
        ctx.strokeStyle = active ? ACC : ink(.3); ctx.lineWidth = active ? 2.25 : 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ax - 3, ay - 5); ctx.lineTo(ax + 2.5, ay); ctx.lineTo(ax - 3, ay + 5); ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
    // timestep track: out to T during inversion, back to 0 during reconstruction
    const yT = ya + s + 18, x0t = xa + fs * 3, x1t = xa + total - fs * 3;
    label(ctx, 't = 0', xa, yT + fs * .34, fs * .92, SOFT);
    label(ctx, 't = T', xa + total, yT + fs * .34, fs * .92, SOFT, 'right');
    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(x0t, yT + .5); ctx.lineTo(x1t, yT + .5);
    for (let q = 0; q <= STEPS; q++) { const px = Math.round(x0t + (x1t - x0t) * (q / STEPS)) + .5; ctx.moveTo(px, yT - 3); ctx.lineTo(px, yT + 3); }
    ctx.stroke();
    const tn = tau < 4.2 ? sI : 1 - sR;
    ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(x0t + (x1t - x0t) * tn, yT + .5, 4.5, 0, 6.2832); ctx.fill();

    setText(out.phase, tau < .6 ? 'Input' : tau < 3.6 ? 'Inverting' : tau < 4.2 ? 'Latent reached' : tau < 7.2 ? 'Reconstructing' : 'Reconstruction error');
    setText(out.t, String(Math.round(tn * 999)).padStart(3, '0'));
  }
  return { draw, stillAt: 8.6 };
}
