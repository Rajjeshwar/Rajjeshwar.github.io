/*
 * Vivid Machines: Gaussian Process calibration, fit for real.
 */
import { $, clamp, mix, smooth, rng, setText } from '../core/util.js';
import { ink, teal, INK, SOFT, ACC, PAPER } from '../core/palette.js';
import { label } from '../core/canvas.js';

export default function gpCalibration(fig) {
  const ctx = fig.ctx, G = 72, NMAX = 9, C = 13, SF = .17, ELL = .15, SN = .03;
  const out = { n: $('#f2-n'), sd: $('#f2-sd') };
  const kern = (a, b) => SF * SF * Math.exp(-((a - b) ** 2) / (2 * ELL * ELL));
  const mu = new Float32Array(G), sd = new Float32Array(G), m = new Float32Array(G);
  function posterior(X, R, gx) {
    const n = X.length, pm = new Float32Array(gx.length), ps = new Float32Array(gx.length).fill(SF);
    if (!n) return { mu: pm, sd: ps };
    const L = [];
    for (let i = 0; i < n; i++) {
      L.push(new Float64Array(n));
      for (let j = 0; j <= i; j++) {
        let s = kern(X[i], X[j]) + (i === j ? SN * SN : 0);
        for (let q = 0; q < j; q++) s -= L[i][q] * L[j][q];
        L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
      }
    }
    const fwd = b => { const y = new Float64Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let q = 0; q < i; q++) s -= L[i][q] * y[q]; y[i] = s / L[i][i]; } return y; };
    const back = y => { const x = new Float64Array(n); for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let q = i + 1; q < n; q++) s -= L[q][i] * x[q]; x[i] = s / L[i][i]; } return x; };
    const alpha = back(fwd(R));
    for (let g = 0; g < gx.length; g++) {
      const ks = X.map(xv => kern(gx[g], xv));
      let mean = 0;
      for (let i = 0; i < n; i++) mean += ks[i] * alpha[i];
      const v = fwd(ks);
      let q = 0;
      for (let i = 0; i < n; i++) q += v[i] * v[i];
      pm[g] = mean; ps[g] = Math.sqrt(Math.max(SF * SF - q, 0));
    }
    return { mu: pm, sd: ps };
  }
  const cache = new Map();
  function build(k) {
    if (cache.has(k)) return cache.get(k);
    const r = rng(k + 301);
    const p1 = r() * 6.28, p2 = r() * 6.28, amp = .1 + r() * .06, off = (r() - .5) * .14, f2 = 4.5 + r() * 2.6;
    const model = x => .5 + .17 * Math.sin(2.3 * x + p1) + .05 * Math.sin(6.1 * x + p2);
    const truth = x => model(x) + amp * Math.sin(f2 * x + p2) + off;
    const xs = [];
    for (let i = 0; i < NMAX; i++) xs.push(.05 + ((i + .15 + r() * .7) / NMAX) * .9);
    for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = xs[i]; xs[i] = xs[j]; xs[j] = tmp; }
    const ys = xs.map(xv => truth(xv) + (r() - .5) * .04);
    const gx = []; for (let i = 0; i < G; i++) gx.push(i / (G - 1));
    const post = [];
    for (let n = 0; n <= NMAX; n++) post.push(posterior(xs.slice(0, n), ys.slice(0, n).map((y, i) => y - model(xs[i])), gx));
    const d = { xs, ys, gx, m: gx.map(model), post, model };
    cache.set(k, d);
    if (cache.size > 4) cache.delete(cache.keys().next().value);
    return d;
  }
  const arrive = i => 1 + i * .95;
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const k = Math.floor(t / C), tau = t - k * C, d = build(k), dn = build(k + 1);
    const fs = clamp(w * .026, 10, 12.5);
    const L = Math.max(16, w * .055), R = w - L, T = fs + 20, B = h - fs - 18;
    const X = x => L + (R - L) * x, Y = v => B - (B - T) * ((v + .1) / 1.2);
    const fade = smooth((tau - (C - 1.3)) / 1.3);
    const nf = tau < 1 ? 0 : Math.min(NMAX, Math.floor((tau - 1) / .95) + 1);
    const e = nf ? smooth((tau - arrive(nf - 1)) / .6) : 1;
    const p0 = d.post[Math.max(0, nf - 1)], p1 = d.post[nf];
    let sdSum = 0;
    for (let g = 0; g < G; g++) {
      mu[g] = mix(mix(p0.mu[g], p1.mu[g], e), 0, fade);
      sd[g] = mix(mix(p0.sd[g], p1.sd[g], e), SF, fade);
      m[g] = mix(d.m[g], dn.m[g], fade);
      sdSum += sd[g];
    }
    ctx.strokeStyle = ink(.08); ctx.lineWidth = 1; ctx.beginPath();
    for (let q = 0; q <= 4; q++) { const y = Math.round(Y(q / 4)) + .5; ctx.moveTo(L, y); ctx.lineTo(R, y); }
    ctx.stroke();
    label(ctx, 'Prediction', L, fs + 6, fs, SOFT);
    label(ctx, 'Time →', R, h - 7, fs, SOFT, 'right');

    ctx.save(); ctx.beginPath(); ctx.rect(L, T - 6, R - L, B - T + 12); ctx.clip();
    ctx.beginPath();
    for (let g = 0; g < G; g++) { const px = X(d.gx[g]), py = Y(m[g] + mu[g] + 2 * sd[g]); if (g) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    for (let g = G - 1; g >= 0; g--) ctx.lineTo(X(d.gx[g]), Y(m[g] + mu[g] - 2 * sd[g]));
    ctx.closePath(); ctx.fillStyle = teal(.16); ctx.fill();
    ctx.strokeStyle = teal(.45); ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath();
    for (let g = 0; g < G; g++) { const px = X(d.gx[g]), py = Y(m[g]); if (g) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.strokeStyle = ink(.42); ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);

    ctx.beginPath();
    for (let g = 0; g < G; g++) { const px = X(d.gx[g]), py = Y(m[g] + mu[g]); if (g) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.strokeStyle = ACC; ctx.lineWidth = 2.25; ctx.lineJoin = 'round'; ctx.stroke();

    for (let i = 0; i < nf; i++) {
      const age = tau - arrive(i), px = X(d.xs[i]), py = Y(d.ys[i]), pop = smooth(age / .6);
      ctx.globalAlpha = (1 - fade) * .35;
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, Y(d.model(d.xs[i]))); ctx.lineTo(px, py); ctx.stroke();
      if (pop < 1) { ctx.globalAlpha = (1 - pop) * (1 - fade) * .7; ctx.strokeStyle = ACC; ctx.beginPath(); ctx.arc(px, py, 4 + 14 * pop, 0, 6.2832); ctx.stroke(); }
      ctx.globalAlpha = 1 - fade;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    setText(out.n, String(fade > .5 ? 0 : nf));
    setText(out.sd, (sdSum / G).toFixed(3));
  }
  return { draw, stillAt: 10.6 };
}
