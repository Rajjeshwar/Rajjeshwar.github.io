// Small helpers shared by every module.
export const root = document.documentElement;
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const fract = x => x - Math.floor(x);

// Cheap repeatable noise: the same inputs always give the same value in [0, 1).
export const hash = (a, b = 0, c = 0) => fract(Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 1.3) * 43758.5453);

// Seeded random number generator (mulberry32), for scenes that must look the same on every visit.
export function rng(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Update a readout only when its text actually changes.
export const setText = (el, s) => { if (el && el.textContent !== s) el.textContent = s; };
