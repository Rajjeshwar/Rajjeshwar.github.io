/*
 * The drawing palette: one colour ramp and a few inks, in a light and a dark version.
 * The exported colours are live: setPalette() swaps them and every drawing picks up
 * the new values on its next frame.
 */
import { root, clamp } from './util.js';

const PALETTES = {
  light: { stops: ['E7ECEC', 'D5EBD3', 'B2DEC1', '7FCBBF', '4CB1C2', '2D8DBC', '2B63A8', '293E91', '1C2360'],
    ink: '30,36,51', acc: '43,78,162', teal: '47,158,154', paper: '#FFFFFF', onAcc: '#FFFFFF', cls: ['43,99,168', '63,181,158'] },
  dark: { stops: ['242B3A', '273659', '2B4C8C', '2E6FB0', '3594BF', '4FB6BE', '83D0BC', 'B9E6C6', 'E6F6DC'],
    ink: '232,236,244', acc: '143,176,255', teal: '92,200,191', paper: '#232A3A', onAcc: '#0F131B', cls: ['122,168,240', '99,214,188'] }
};
const LUT = new Array(256);
let PAL = PALETTES.light;
export let INK, SOFT, FAINT, EMPTY, ACC, TEAL, PAPER, ONACC, COL;

// Ink, accent and teal at any opacity.
export const ink = a => 'rgba(' + PAL.ink + ',' + a + ')';
export const acc = a => 'rgba(' + PAL.acc + ',' + a + ')';
export const teal = a => 'rgba(' + PAL.teal + ',' + a + ')';

export const isDark = () => root.getAttribute('data-mode') === 'dark';

export function setPalette() {
  PAL = isDark() ? PALETTES.dark : PALETTES.light;
  const st = PAL.stops.map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * (st.length - 1), a = Math.floor(x), b = Math.min(st.length - 1, a + 1), f = x - a;
    LUT[i] = 'rgb(' + st[a].map((v, k) => Math.round(v + (st[b][k] - v) * f)).join(',') + ')';
  }
  INK = 'rgb(' + PAL.ink + ')'; SOFT = ink(.55); FAINT = ink(.13); EMPTY = ink(.06);
  ACC = 'rgb(' + PAL.acc + ')'; TEAL = 'rgb(' + PAL.teal + ')'; PAPER = PAL.paper; ONACC = PAL.onAcc; COL = PAL.cls;
}
setPalette();

// Map a value in [0, 1] onto the ramp.
export const ramp = v => LUT[clamp(Math.round(v * 255), 0, 255)];
