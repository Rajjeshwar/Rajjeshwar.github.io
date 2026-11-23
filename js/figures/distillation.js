/*
 * Vivid Machines: teacher to student distillation.
 */
import { clamp, mix, smooth, hash, rng } from '../core/util.js';
import { ramp, ink, INK, SOFT, FAINT, ACC } from '../core/palette.js';
import { label, rr, bez, measure } from '../core/canvas.js';

export default function distillation(fig) {
  const ctx = fig.ctx, GT = 14, GS = 7, C = 9;
  const scenes = new Map();
  function scene(k) {
    if (scenes.has(k)) return scenes.get(k);
    const r = rng(k + 11), want = 5 + Math.floor(r() * 4), blobs = [];
    for (let guard = 0; blobs.length < want && guard < 300; guard++) {
      const b = { x: .12 + r() * .76, y: .12 + r() * .76, s: .068 + r() * .034 };
      if (blobs.every(o => Math.hypot(o.x - b.x, o.y - b.y) > .21)) blobs.push(b);
    }
    const T = new Float32Array(GT * GT), S = new Float32Array(GS * GS);
    for (let i = 0; i < GT; i++) for (let j = 0; j < GT; j++) {
      const x = (j + .5) / GT, y = (i + .5) / GT;
      let v = 0;
      for (const b of blobs) v = Math.max(v, Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (2 * b.s * b.s)));
      T[i * GT + j] = clamp(.06 + .9 * v + .07 * (hash(i, j, k) - .5));
    }
    for (let i = 0; i < GS; i++) for (let j = 0; j < GS; j++) {
      const a = 2 * i * GT + 2 * j;
      S[i * GS + j] = (T[a] + T[a + 1] + T[a + GT] + T[a + GT + 1]) / 4;
    }
    const sc = { T, S, tok: [0, 1, 2, 3, 4].map(() => .25 + r() * .6) };
    scenes.set(k, sc);
    if (scenes.size > 6) scenes.delete(scenes.keys().next().value);
    return sc;
  }
  const conv = tau => (tau < .8 ? 0 : 1 - Math.exp(-(tau - .8) / 1.4));
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const k = Math.floor(t / C), tau = t - k * C, A = scene(k - 1), B = scene(k);
    const x = smooth(tau / 1.2), al = conv(tau), unsettled = smooth(tau / .8) * (1 - al);
    const fs = clamp(w * .027, 10.5, 13.5), pad = Math.max(16, w * .06);
    const top = pad + fs + 12, bottom = h - pad;
    const gT = Math.min(((bottom - top) / (GT + 1.7)) * GT, (w - 2 * pad) * .48), cT = gT / GT;
    const gS = gT * .6, cS = gS / GS;
    const y0 = top + (bottom - top - gT - cT * 1.7) / 2 + cT * 1.7;
    const xT = pad, xS = w - pad - gS, yS = y0 + (gT - gS) / 2;
    const gap = Math.max(1, cT * .14), gapS = Math.max(1, cS * .12), tick = Math.floor(t * 7);

    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(xT + gT + 4, y0); ctx.lineTo(xS - 6, yS);
    ctx.moveTo(xT + gT + 4, y0 + gT - gap); ctx.lineTo(xS - 6, yS + gS - gapS);
    ctx.stroke();

    for (let i = 0; i < GT; i++) for (let j = 0; j < GT; j++) {
      const q = i * GT + j;
      ctx.fillStyle = ramp(mix(A.T[q], B.T[q], x) + .03 * Math.sin(t * 1.7 + i * .9 + j * 1.3));
      rr(ctx, xT + j * cT, y0 + i * cT, cT - gap, cT - gap, cT * .22); ctx.fill();
    }
    for (let i = 0; i < GS; i++) for (let j = 0; j < GS; j++) {
      const q = i * GS + j, target = mix(A.S[q], B.S[q], x);
      ctx.fillStyle = ramp(mix(target, .5 * hash(q, tick, k) + .4 * A.S[q], unsettled));
      rr(ctx, xS + j * cS, yS + i * cS, cS - gapS, cS - gapS, cS * .22); ctx.fill();
    }
    // CLS and register tokens sit above each grid
    const tokT = y0 - cT * 1.7, tokS = yS - cT * 1.7;
    for (let q = 0; q < 5; q++) {
      const tv = mix(A.tok[q], B.tok[q], x);
      ctx.fillStyle = ramp(tv); rr(ctx, xT + q * cT, tokT, cT - gap, cT - gap, cT * .22); ctx.fill();
      ctx.fillStyle = ramp(mix(tv, .2 + .6 * hash(q, tick, 9), unsettled * .85)); rr(ctx, xS + q * cT, tokS, cT - gap, cT - gap, cT * .22); ctx.fill();
    }
    label(ctx, 'CLS + registers', xT + 5 * cT + 6, tokT + cT * .5 + fs * .3, fs * .85, SOFT);
    const lw = ctx.measureText('CLS + registers').width;
    ctx.strokeStyle = ink(.3); ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -t * 16; ctx.beginPath();
    ctx.moveTo(xT + 5 * cT + 13 + lw, tokT + cT * .45); ctx.lineTo(xS - 7, tokS + cT * .45); ctx.stroke();
    ctx.setLineDash([]);

    // patch features flowing from teacher to student
    const P = w < 420 ? 28 : 46, mx = (xT + gT + xS) / 2, flow = .35 + .65 * unsettled;
    for (let p = 0; p < P; p++) {
      const per = 2.1 + hash(p, 1) * 1.7, ph = t / per + hash(p, 2), g = Math.floor(ph), u = ph - g;
      const ci = Math.floor(hash(p, g, 3) * GT), cj = Math.floor(hash(p, g, 13) * GT);
      const cv = mix(A.T[ci * GT + cj], B.T[ci * GT + cj], x);
      const sx = xT + (cj + .5) * cT, sy = y0 + (ci + .5) * cT;
      const dx = xS + ((cj >> 1) + .5) * cS, dy = yS + ((ci >> 1) + .5) * cS;
      for (let q = 0; q < 4; q++) {
        const uu = u - q * .024;
        if (uu <= 0) break;
        const pt = bez(sx, sy, mx, sy, mx, dy, dx, dy, smooth(uu));
        ctx.globalAlpha = Math.sin(Math.PI * uu) * (1 - q * .24) * flow * (.35 + .65 * cv);
        ctx.fillStyle = q ? ramp(.45 + .4 * cv) : ACC;
        const s = q ? 2.4 : 3.2;
        ctx.beginPath(); ctx.arc(pt[0], pt[1], s / 2, 0, 6.2832); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    label(ctx, 'Teacher  ·  ViT-S', xT, tokT - 9, fs, INK, 'left', 600);
    // In a short, wide frame the student's name would run into the CLS label; stack it instead.
    const sName = 'Student  ·  Efficient-ViT', cEnd = xT + 5 * cT + 13 + lw;
    if (w - pad - measure(ctx, sName, fs, 600) > cEnd) label(ctx, sName, w - pad, tokS - 9, fs, INK, 'right', 600);
    else {
      label(ctx, 'Student', w - pad, tokS - 9 - fs * 1.15, fs, INK, 'right', 600);
      label(ctx, 'Efficient-ViT', w - pad, tokS - 9, fs, INK, 'right', 600);
    }
  }
  return { draw, stillAt: 6.5 };
}
