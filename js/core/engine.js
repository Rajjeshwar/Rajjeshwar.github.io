/*
 * The drawing engine. Every drawing registers a canvas and a draw(t) function; one
 * requestAnimationFrame loop then redraws only the canvases that are on screen.
 * With motion off, each drawing shows a single still frame instead.
 */
import { root } from './util.js';

export let motionOn = root.classList.contains('motion-on');
export function setMotion(on) { motionOn = on; }

export const figs = [];
export const hasIO = 'IntersectionObserver' in window;

// make(fig) builds a drawing and returns { draw(t), stillAt }.
export function addFig(id, make) {
  const canvas = document.getElementById(id);
  if (!canvas || !canvas.getContext) return;
  const fig = { canvas, ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1, t: 0, visible: true };
  fig.impl = make(fig);
  figs.push(fig);
}

export function paint(fig) { if (fig.w) fig.impl.draw(motionOn ? fig.t : fig.impl.stillAt); }

// Match the canvas's pixel size to its box (sharp on high-density screens), then repaint.
function sizeFig(fig) {
  const r = fig.canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width), h = Math.round(r.height);
  if (!w || !h) return;
  if (w !== fig.w || h !== fig.h || dpr !== fig.dpr) {
    fig.w = w; fig.h = h; fig.dpr = dpr;
    fig.canvas.width = Math.round(w * dpr); fig.canvas.height = Math.round(h * dpr);
    fig.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  paint(fig);
}

let raf = 0, last = 0;
function frame(now) {
  raf = 0;
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  for (const f of figs) if (f.visible && f.w) { f.t += dt; f.impl.draw(f.t); }
  if (motionOn) raf = requestAnimationFrame(frame);
}
export function kick() { if (!raf && motionOn) { last = performance.now(); raf = requestAnimationFrame(frame); } }

// Call once, after every drawing is registered: sizes the canvases, tracks which are visible, starts the loop.
export function startEngine() {
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(es => es.forEach(e => { const f = figs.find(x => x.canvas.parentNode === e.target); if (f) sizeFig(f); }));
    figs.forEach(f => ro.observe(f.canvas.parentNode));
  } else {
    window.addEventListener('resize', () => figs.forEach(sizeFig));
  }
  figs.forEach(sizeFig);
  if (hasIO) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const f = figs.find(x => x.canvas === e.target);
      if (f) { f.visible = e.isIntersecting; if (f.visible) { paint(f); kick(); } }
    }), { rootMargin: '80px' });
    figs.forEach(f => io.observe(f.canvas));
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => figs.forEach(paint));
  kick();
}
