/*
 * About: the short version as a route. Five stops from Mumbai to Toronto, grouped by country.
 * A pulse runs down the line, each stop lights up as it arrives, and the last one stays lit.
 */
import { clamp, mix, smooth } from '../core/util.js';
import { ramp, ink, INK, SOFT, ACC, PAPER, ONACC } from '../core/palette.js';
import { label, rr, measure } from '../core/canvas.js';

const STOPS = [
  { year: '2018', org: 'L&T Infotech', role: 'Software engineer, ML and .NET', city: 'Mumbai' },
  { year: '2021', org: 'Wipro', role: 'Software engineer, ML and .NET', city: 'Pune' },
  { year: '2022', org: 'Mila, Université de Montréal', role: 'M.Sc. in computer science and ML', city: 'Montréal' },
  { year: '2023', org: 'CRIM', role: 'Computer vision research intern', city: 'Montréal' },
  { year: '2024', org: 'Vivid Machines', role: 'Senior ML research engineer', city: 'Toronto' }
];
// Consecutive stops grouped by country; the line is dashed where it crosses between groups.
const BANDS = [{ name: 'India', from: 0, to: 1 }, { name: 'Canada', from: 2, to: 4 }];

export default function careerPath(fig) {
  const ctx = fig.ctx, N = STOPS.length, C = 12, T0 = .7, SEG = 1.2, HOLD = C - 1.2;
  const arrive = i => T0 + i * SEG, last = arrive(N - 1);
  const sep = '  ·  ';

  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    const tau = t % C, reset = 1 - smooth((tau - HOLD) / 1);

    // Layout: a band per country, a row per stop, and the line down the left.
    const pad = Math.max(12, w * .05), inset = Math.max(10, w * .03);
    const fs = clamp(w * .034, 11.5, 15), fsY = fs * .86, fsB = Math.max(9, fs * .74);
    const headH = fs * 1.6, gapB = Math.max(8, h * .035);
    const rowH = (h - 2 * pad - BANDS.length * headH - (BANDS.length - 1) * gapB) / N;
    const tops = [];
    let yb = pad;
    for (const b of BANDS) { tops.push(yb); yb += headH + (b.to - b.from + 1) * rowH + gapB; }
    const band = i => BANDS.findIndex(b => i >= b.from && i <= b.to);
    const ys = STOPS.map((s, i) => tops[band(i)] + headH + (i - BANDS[band(i)].from + .5) * rowH);
    const yearR = pad + inset + measure(ctx, '2024', fsY, 600), spineX = yearR + Math.max(12, w * .035);
    const m = clamp(fs * .72, 8, 11), textX = spineX + m / 2 + Math.max(10, w * .028);
    const avail = w - pad - inset - textX;

    // Shrink the text to fit narrow screens; below a readable size, drop the role and keep the city.
    const pillFs = fs * .66, pillW = measure(ctx, 'Now', pillFs, 600) + 12;
    const orgW = Math.max(...STOPS.map((s, i) => measure(ctx, s.org, fs, 600) + (i === N - 1 ? pillW + 8 : 0)));
    const fsO = fs * Math.min(1, avail / orgW);
    let subs = STOPS.map(s => s.role + sep + s.city), fsS = fs * .8;
    const subW = Math.max(...subs.map(s => measure(ctx, s, fsS)));
    if (subW > avail) {
      if (fsS * avail / subW >= 8.5) fsS *= avail / subW;
      else subs = STOPS.map(s => s.city);
    }

    // Country bands, named in line with the stops so the label stays clear of the line.
    BANDS.forEach((b, k) => {
      ctx.globalAlpha = .75; ctx.fillStyle = PAPER;
      rr(ctx, pad, tops[k], w - 2 * pad, headH + (b.to - b.from + 1) * rowH, 14); ctx.fill();
      ctx.globalAlpha = 1;
      label(ctx, b.name, textX, tops[k] + headH * .68, fsB, SOFT, 'left', 600);
    });

    // The line: faint in full, then coloured down to wherever the pulse has reached.
    const headY = tt => {
      const pos = clamp((tt - T0) / SEG, 0, N - 1), seg = Math.min(N - 2, Math.floor(pos));
      return mix(ys[seg], ys[seg + 1], smooth(pos - seg));
    };
    const hy = headY(tau), grad = ctx.createLinearGradient(0, ys[0], 0, ys[N - 1]);
    grad.addColorStop(0, ramp(.35)); grad.addColorStop(1, ramp(.8));
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < N - 1; i++) {
      const a = ys[i], b = ys[i + 1], e = Math.min(b, hy);
      ctx.setLineDash(band(i) !== band(i + 1) ? [2, 6] : []);
      ctx.strokeStyle = ink(.16); ctx.beginPath(); ctx.moveTo(spineX, a); ctx.lineTo(spineX, b); ctx.stroke();
      if (e > a && reset > 0) {
        ctx.globalAlpha = reset; ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.moveTo(spineX, a); ctx.lineTo(spineX, e); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.setLineDash([]);

    // Once every stop is lit, a little traffic keeps flowing down the line.
    const done = smooth((tau - last) / .5) * reset;
    if (done > 0) for (let p = 0; p < 4; p++) {
      const u = (t * .11 + p / 4) % 1;
      ctx.globalAlpha = done * .55 * Math.sin(Math.PI * u); ctx.fillStyle = ACC;
      ctx.beginPath(); ctx.arc(spineX, mix(ys[0], ys[N - 1], u), 1.6, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Stops, their years and labels.
    STOPS.forEach((s, i) => {
      const since = tau - arrive(i), on = smooth(since / .35) * reset, y = ys[i];
      const pop = since > 0 && since < .6 ? Math.sin(Math.PI * since / .6) * reset : 0, sz = m * (1 + .4 * pop);
      ctx.fillStyle = PAPER; ctx.strokeStyle = ink(.28); ctx.lineWidth = 1.25;
      rr(ctx, spineX - sz / 2, y - sz / 2, sz, sz, sz * .3); ctx.fill(); ctx.stroke();
      if (on > 0) {
        ctx.globalAlpha = on; ctx.fillStyle = ramp(.35 + .45 * i / (N - 1));
        rr(ctx, spineX - sz / 2, y - sz / 2, sz, sz, sz * .3); ctx.fill();
      }
      ctx.globalAlpha = mix(.42, 1, on);
      label(ctx, s.year, yearR, y + fsY * .35, fsY, on > .5 ? INK : SOFT, 'right', 600);
      label(ctx, s.org, textX, y - fsS * .2, fsO, INK, 'left', 600);
      label(ctx, subs[i], textX, y + fsS * 1.05, fsS, SOFT);
      if (i === N - 1 && on > 0) {
        const px = textX + measure(ctx, s.org, fsO, 600) + 8, ph = fsO * 1.15, py = y - fsS * .2 - fsO * .36 - ph / 2;
        ctx.globalAlpha = on; ctx.fillStyle = ACC; rr(ctx, px, py, pillW, ph, ph / 2); ctx.fill();
        label(ctx, 'Now', px + pillW / 2, py + ph / 2 + pillFs * .36, pillFs, ONACC, 'center', 600);
      }
      ctx.globalAlpha = 1;
    });

    // The pulse travelling down, with a short trail that shrinks away when it pauses at a stop.
    const ha = smooth((tau - T0 + .3) / .3) * (1 - smooth((tau - last) / .25));
    if (ha > 0) {
      for (let q = 4; q >= 0; q--) {
        ctx.globalAlpha = ha * (q ? .5 * (1 - q * .2) : 1); ctx.fillStyle = q ? ramp(.55) : ACC;
        ctx.beginPath(); ctx.arc(spineX, headY(tau - q * .045), q ? 2.2 : 3.6, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // The latest stop breathes while the line holds.
    if (tau > last && tau < HOLD) {
      const u = ((tau - last) % 1.8) / 1.8, r = m / 2 + 2 + u * 10;
      ctx.globalAlpha = (1 - u) * .5 * reset; ctx.strokeStyle = ACC; ctx.lineWidth = 1.5;
      rr(ctx, spineX - r, ys[N - 1] - r, 2 * r, 2 * r, r * .4); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  return { draw, stillAt: 8 };
}
