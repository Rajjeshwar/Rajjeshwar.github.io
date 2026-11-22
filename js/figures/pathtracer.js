/*
 * Side project: a real Monte Carlo path tracer converging on a Cornell box. One sample per
 * pixel per frame, next-event estimation toward a sphere light, and a noise estimate (odd
 * passes against even passes) plotted against 1/sqrt(n).
 */
import { $, clamp, setText } from '../core/util.js';
import { ink, INK, SOFT, FAINT, ACC } from '../core/palette.js';
import { label, rr } from '../core/canvas.js';
import { motionOn } from '../core/engine.js';

export default function pathTracer(fig) {
  const ctx = fig.ctx, N = 80, TARGET = 256, HOLD = 3.2, BOUNCES = 4, EXPOSURE = 1.7, LE = 18, STILL = 32;
  const out = $('#f6-spp');
  const sumA = new Float32Array(N * N * 3), sumB = new Float32Array(N * N * 3);
  const buf = document.createElement('canvas'); buf.width = buf.height = N;
  const bctx = buf.getContext('2d'), img = bctx.createImageData(N, N);
  const RED = [.63, .065, .05], GREEN = [.14, .45, .091], WALL = [.73, .72, .69];
  // spheres: x, y, z, radius, kind (0 matte, 1 mirror, 2 light)
  const SPH = [[-.42, -.62, -.3, .38, 0], [.46, -.7, .32, .3, 1], [0, .6, 0, .2, 2]];
  const LIGHTS = [0, -.38, .36];
  let spp = 0, round = 0, lastT = -1, doneAt = -1, hist = [];

  function pass(target) {
    const lx = SPH[2][0], ly = SPH[2][1], lz = SPH[2][2], lr = SPH[2][3];
    let p = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++, p += 3) {
      // camera ray entering through the open front of the box
      let ox = ((i + Math.random()) / N) * 2 - 1, oy = 1 - ((j + Math.random()) / N) * 2, oz = 1;
      let dx = ox, dy = oy, dz = -2.4;
      const il0 = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz); dx *= il0; dy *= il0; dz *= il0;
      let tr = 1, tg = 1, tb = 1, R = 0, G = 0, B = 0, spec = true;
      for (let b = 0; b < BOUNCES; b++) {
        let t = 1e9, nx = 0, ny = 0, nz = 0, ar = 0, ag = 0, ab = 0, kind = -1, tt;
        if (dx < 0) { tt = (-1 - ox) / dx; if (tt < t) { t = tt; nx = 1; ny = 0; nz = 0; ar = RED[0]; ag = RED[1]; ab = RED[2]; kind = 0; } }
        else if (dx > 0) { tt = (1 - ox) / dx; if (tt < t) { t = tt; nx = -1; ny = 0; nz = 0; ar = GREEN[0]; ag = GREEN[1]; ab = GREEN[2]; kind = 0; } }
        if (dy < 0) { tt = (-1 - oy) / dy; if (tt < t) { t = tt; nx = 0; ny = 1; nz = 0; ar = WALL[0]; ag = WALL[1]; ab = WALL[2]; kind = 0; } }
        else if (dy > 0) { tt = (1 - oy) / dy; if (tt < t) { t = tt; nx = 0; ny = -1; nz = 0; ar = WALL[0]; ag = WALL[1]; ab = WALL[2]; kind = 0; } }
        if (dz < 0) { tt = (-1 - oz) / dz; if (tt < t) { t = tt; nx = 0; ny = 0; nz = 1; ar = WALL[0]; ag = WALL[1]; ab = WALL[2]; kind = 0; } }
        else if (dz > 0) { tt = (1 - oz) / dz; if (tt < t) { t = tt; kind = -1; } }
        for (let s = 0; s < 3; s++) {
          const S = SPH[s], cx = ox - S[0], cy = oy - S[1], cz = oz - S[2];
          const bq = cx * dx + cy * dy + cz * dz, disc = bq * bq - (cx * cx + cy * cy + cz * cz - S[3] * S[3]);
          if (disc <= 0) continue;
          tt = -bq - Math.sqrt(disc);
          if (tt < 1e-4 || tt >= t) continue;
          t = tt; kind = S[4];
          nx = (ox + dx * tt - S[0]) / S[3]; ny = (oy + dy * tt - S[1]) / S[3]; nz = (oz + dz * tt - S[2]) / S[3];
          ar = ag = ab = .73;
        }
        if (kind < 0) break;                                   // left through the open front
        if (kind === 2) { if (spec) { R += tr * LE; G += tg * LE; B += tb * LE; } break; }
        ox += dx * t + nx * 1e-4; oy += dy * t + ny * 1e-4; oz += dz * t + nz * 1e-4;
        if (kind === 1) {                                      // mirror: reflect and keep going
          const dn = dx * nx + dy * ny + dz * nz;
          dx -= 2 * dn * nx; dy -= 2 * dn * ny; dz -= 2 * dn * nz;
          tr *= .92; tg *= .92; tb *= .92;
          continue;
        }
        tr *= ar; tg *= ag; tb *= ab;
        // next-event estimation: a uniform point on the half of the light that faces this hit
        const wz0 = 1 - 2 * Math.random(), wr = Math.sqrt(Math.max(0, 1 - wz0 * wz0)), ph = 6.283185307 * Math.random();
        let wx = wr * Math.cos(ph), wy = wr * Math.sin(ph), wz = wz0;
        if (wx * (ox - lx) + wy * (oy - ly) + wz * (oz - lz) < 0) { wx = -wx; wy = -wy; wz = -wz; }
        let sx = lx + lr * wx - ox, sy = ly + lr * wy - oy, sz = lz + lr * wz - oz;
        const d2 = sx * sx + sy * sy + sz * sz, dl = Math.sqrt(d2);
        sx /= dl; sy /= dl; sz /= dl;
        const cosS = nx * sx + ny * sy + nz * sz, cosL = -(wx * sx + wy * sy + wz * sz);
        if (cosS > 0 && cosL > 0) {
          let vis = true;                                      // only the two spheres can cast shadows in a convex box
          for (let s = 0; s < 2 && vis; s++) {
            const S = SPH[s], cx = ox - S[0], cy = oy - S[1], cz = oz - S[2];
            const bq = cx * sx + cy * sy + cz * sz, disc = bq * bq - (cx * cx + cy * cy + cz * cz - S[3] * S[3]);
            if (disc > 0) { tt = -bq - Math.sqrt(disc); if (tt > 1e-4 && tt < dl - 1e-3) vis = false; }
          }
          if (vis) { const k = LE * 2 * lr * lr * cosS * cosL / d2; R += tr * k; G += tg * k; B += tb * k; }
        }
        // cosine-weighted bounce for the indirect light
        const r1 = Math.random(), sr = Math.sqrt(r1), ph2 = 6.283185307 * Math.random();
        const ax = sr * Math.cos(ph2), ay = sr * Math.sin(ph2), az = Math.sqrt(1 - r1);
        let ux, uy, uz;
        if (Math.abs(nx) > .5) { ux = nz; uy = 0; uz = -nx; } else { ux = 0; uy = -nz; uz = ny; }
        const iu = 1 / Math.sqrt(ux * ux + uy * uy + uz * uz); ux *= iu; uy *= iu; uz *= iu;
        const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
        dx = ax * ux + ay * vx + az * nx; dy = ax * uy + ay * vy + az * ny; dz = ax * uz + ay * vz + az * nz;
        spec = false;
      }
      target[p] += R; target[p + 1] += G; target[p + 2] += B;
    }
  }
  function measure() {
    if (spp < 2 || (spp > 16 && spp % 4)) return;
    const nA = Math.ceil(spp / 2), nB = Math.floor(spp / 2);
    let acc = 0;
    for (let q = 0; q < sumA.length; q += 3) {
      acc += Math.abs(Math.min(3, (sumA[q] + sumA[q + 1] + sumA[q + 2]) / (3 * nA)) - Math.min(3, (sumB[q] + sumB[q + 1] + sumB[q + 2]) / (3 * nB)));
    }
    hist.push([spp, acc / (N * N)]);
  }
  function step() { pass(spp % 2 ? sumB : sumA); spp++; measure(); }
  function reset() { sumA.fill(0); sumB.fill(0); spp = 0; hist = []; doneAt = -1; SPH[2][0] = LIGHTS[round % LIGHTS.length]; }
  function blit() {
    const d = img.data, k = EXPOSURE / Math.max(1, spp);
    for (let q = 0, o = 0; q < sumA.length; q += 3, o += 4) {
      for (let c = 0; c < 3; c++) { const v = (sumA[q + c] + sumB[q + c]) * k; d[o + c] = 255 * Math.sqrt(v / (1 + v)); }
      d[o + 3] = 255;
    }
    bctx.putImageData(img, 0, 0);
  }
  function draw(t) {
    const w = fig.w, h = fig.h;
    const moving = motionOn && t !== lastT;
    lastT = t;
    if (moving) {
      if (spp < TARGET) { step(); if (spp >= TARGET) doneAt = t; }
      else if (doneAt < 0) doneAt = t;
      else if (t - doneAt > HOLD) { round++; reset(); step(); }
    } else while (spp < STILL) step();                         // a still frame needs enough samples to read
    blit();

    ctx.clearRect(0, 0, w, h);
    const pad = Math.max(14, w * .055), fs = clamp(w * .026, 10, 12.5);
    const S = Math.floor(Math.min(h - 2 * pad, w * .5)), rx = pad, ry = Math.round((h - S) / 2);
    ctx.save(); rr(ctx, rx, ry, S, S, 8); ctx.clip();
    ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, rx, ry, S, S);
    ctx.restore();

    // readout and the noise plot beside the render
    const px0 = rx + S + Math.max(16, w * .05), px1 = w - pad, pw = px1 - px0;
    label(ctx, String(spp), px0, ry + fs * 1.9, fs * 2.1, INK, 'left', 600);
    const nw = ctx.measureText(String(spp)).width;
    label(ctx, 'spp', px0 + nw + 6, ry + fs * 1.9, fs, SOFT);
    const pt = ry + fs * 2.1 + fs + 16, pb = ry + S - fs - 9, phh = pb - pt;
    label(ctx, 'Noise', px0, pt - 7, fs, SOFT);
    ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(px0 + .5, pt); ctx.lineTo(px0 + .5, pb + .5); ctx.lineTo(px1, pb + .5); ctx.stroke();
    const X = n => px0 + ((Math.log2(n) - 1) / 7) * pw;
    label(ctx, '2', px0, pb + fs + 4, fs * .92, SOFT);
    label(ctx, '16', X(16), pb + fs + 4, fs * .92, SOFT, 'center');
    label(ctx, '256 spp', px1, pb + fs + 4, fs * .92, SOFT, 'right');
    if (hist.length && phh > 12) {
      const topV = Math.log2(hist[0][1] * 1.3), Y = v => pt + ((topV - Math.log2(Math.max(v, 1e-6))) / 4.4) * phh;
      const g0 = hist[0][1] * Math.sqrt(hist[0][0] / 2);       // the 1/sqrt(n) guide, anchored on the first measurement
      ctx.save(); ctx.beginPath(); ctx.rect(px0, pt - 2, pw, phh + 2); ctx.clip();
      ctx.strokeStyle = ink(.4); ctx.lineWidth = 1.25; ctx.setLineDash([4, 4]); ctx.beginPath();
      ctx.moveTo(X(2), Y(g0)); ctx.lineTo(X(256), Y(g0 / Math.sqrt(128))); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = ACC; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      hist.forEach((m, q) => { if (q) ctx.lineTo(X(m[0]), Y(m[1])); else ctx.moveTo(X(m[0]), Y(m[1])); });
      ctx.stroke();
      const hd = hist[hist.length - 1];
      ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(X(hd[0]), Y(hd[1]), 3.5, 0, 6.2832); ctx.fill();
      ctx.restore();
      label(ctx, '1/\u221An', X(64), Y(g0 / Math.sqrt(32)) - 9, fs * .92, SOFT, 'center');
    }
    setText(out, String(spp));
  }
  return { draw, stillAt: 1 };
}
