/*
 * Hero: a patch portrait that distills from fine to coarse and back. With a real photo chosen,
 * the photo shows and only now and then breaks into patches.
 */
import { clamp, mix, smooth, hash } from '../core/util.js';
import { ramp, PAPER } from '../core/palette.js';

let portrait = null;
function samplePortrait(im) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, 16, 16);
    const d = x.getImageData(0, 0, 16, 16).data, fine = new Float32Array(768), coarse = new Float32Array(768);
    for (let q = 0; q < 256; q++) { fine[q * 3] = d[q * 4]; fine[q * 3 + 1] = d[q * 4 + 1]; fine[q * 3 + 2] = d[q * 4 + 2]; }
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) for (let ch = 0; ch < 3; ch++) {
      const a = ((i - (i % 2)) * 16 + (j - (j % 2))) * 3 + ch;
      coarse[(i * 16 + j) * 3 + ch] = (fine[a] + fine[a + 3] + fine[a + 48] + fine[a + 51]) / 4;
    }
    return { fine, coarse };
  } catch (e) { return null; }
}

// The photo chooser calls these when a portrait is picked or removed.
export function setPortraitFrom(img) { portrait = samplePortrait(img); }
export function clearPortrait() { portrait = null; }

export default function patchPortrait(fig) {
  const ctx = fig.ctx, N = 16;
  const fine = new Float32Array(N * N), coarse = new Float32Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u = (j + .5) / N, v = (i + .5) / N;
    const head = 1 - smooth((((u - .5) / .19) ** 2 + ((v - .4) / .24) ** 2 - .75) / .5);
    const sh = 1 - smooth((((u - .5) / .44) ** 2 + ((v - 1.08) / .36) ** 2 - .8) / .4);
    fine[i * N + j] = clamp(.08 + head * (.66 + .28 * (.5 - u)) + (1 - head) * sh * .46 + .05 * (hash(i, j, 8) - .5));
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const a = (i - (i % 2)) * N + (j - (j % 2));
    coarse[i * N + j] = (fine[a] + fine[a + 1] + fine[a + N] + fine[a + N + 1]) / 4;
  }
  function draw(t) {
    const w = fig.w, h = fig.h;
    ctx.clearRect(0, 0, w, h);
    if (portrait) {
      const pp = t % 9, cs2 = w / N, g2 = Math.max(1, cs2 * .12);
      const p = pp < 5 ? 0 : pp < 5.6 ? smooth((pp - 5) / .6) : pp < 7.9 ? 1 : 1 - smooth((pp - 7.9) / .8);
      if (p <= 0) return;
      const mm = pp < 5.8 ? 0 : pp < 6.6 ? smooth((pp - 5.8) / .8) : pp < 7.5 ? 1 : 1 - smooth((pp - 7.5) / .5);
      const F = portrait.fine, K = portrait.coarse;
      ctx.globalAlpha = p; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const q = (i * N + j) * 3;
        ctx.fillStyle = 'rgb(' + Math.round(mix(F[q], K[q], mm)) + ',' + Math.round(mix(F[q + 1], K[q + 1], mm)) + ',' + Math.round(mix(F[q + 2], K[q + 2], mm)) + ')';
        ctx.fillRect(j * cs2 + g2 / 2, i * cs2 + g2 / 2, cs2 - g2 + (j % 2 ? 0 : g2 * mm), cs2 - g2 + (i % 2 ? 0 : g2 * mm));
      }
      ctx.globalAlpha = 1;
      return;
    }
    const ph = t % 7, m = ph < 2.5 ? 0 : ph < 3.4 ? smooth((ph - 2.5) / .9) : ph < 6 ? 1 : 1 - smooth((ph - 6) / .9);
    const cs = w / N, g = Math.max(1, cs * .16);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const q = i * N + j;
      ctx.fillStyle = ramp(mix(fine[q], coarse[q], m) + .02 * Math.sin(t * 1.3 + i * .7 + j * 1.1));
      ctx.fillRect(j * cs + g / 2, i * cs + g / 2, cs - g + (j % 2 ? 0 : g * m), cs - g + (i % 2 ? 0 : g * m));
    }
  }
  return { draw, stillAt: 1 };
}
