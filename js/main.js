// Entry point: registers the drawings, then wires up the page (header, reel, theme, motion, photo, email).
import { root, $, $$, clamp } from './core/util.js';
import { isDark, setPalette } from './core/palette.js';
import { motionOn, setMotion, figs, addFig, paint, kick, hasIO, startEngine } from './core/engine.js';
import attention from './figures/attention.js';
import patchPortrait, { setPortraitFrom } from './figures/portrait.js';
import distillation from './figures/distillation.js';
import gpCalibration from './figures/gp-calibration.js';
import ddimInversion from './figures/ddim-inversion.js';
import ocrExtraction from './figures/ocr.js';
import bottleLine from './figures/bottle-line.js';
import rnaFolding from './figures/rna.js';
import nerfRays from './figures/nerf.js';
import pathTracer from './figures/pathtracer.js';

// Each canvas in index.html gets the drawing that belongs to it.
addFig('fig-attn', attention);
addFig('fig-me', patchPortrait);
addFig('fig-distill', distillation);
addFig('fig-gp', gpCalibration);
addFig('fig-ddim', ddimInversion);
addFig('fig-ocr', ocrExtraction);
addFig('fig-line', bottleLine);
addFig('fig-rna', rnaFolding);
addFig('fig-nerf', nerfRays);
addFig('fig-pt', pathTracer);
startEngine();

// Hero: rotating line.
const rot = $('#rot');
if (rot) {
  const words = $$('span', rot);
  let cur = 0;
  setInterval(() => {
    if (!motionOn || document.hidden || words.length < 2) return;
    const prev = words[cur];
    prev.classList.remove('on'); prev.classList.add('out');
    setTimeout(() => prev.classList.remove('out'), 650);
    cur = (cur + 1) % words.length;
    words[cur].classList.add('on');
  }, 2600);
}

// Header: backdrop after scrolling, name after the hero, current section.
const bar = $('#topbar'), nameEl = $('#name');
let ticking = false;
function onScroll() {
  ticking = false;
  if (bar) bar.classList.toggle('scrolled', window.scrollY > 24);
  if (bar && nameEl) bar.classList.toggle('past', nameEl.getBoundingClientRect().bottom < 56);
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
const navLinks = $$('.top-nav a');
if (hasIO && navLinks.length) {
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id ? 'true' : 'false'));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id], footer[id]').forEach(s => spy.observe(s));
}

// Sections settle in as they arrive (always readable, never hidden).
function armReveal() {
  if (!motionOn || !hasIO) return;
  root.classList.add('rv-on');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .08, rootMargin: '0px 0px -6% 0px' });
  $$('.rv:not(.in)').forEach(el => io.observe(el));
  setTimeout(() => $$('.rv:not(.in)').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
  }), 2500);
}
armReveal();

// Experience reel.
const reel = $('#reel');
if (reel) {
  const cards = $$('.job', reel), dots = $$('#dots button'), prev = $('#prev'), next = $('#next');
  const target = i => cards[i].offsetLeft - cards[0].offsetLeft;
  const maxLeft = () => reel.scrollWidth - reel.clientWidth;
  function index() {
    if (reel.scrollLeft >= maxLeft() - 4) return cards.length - 1;
    let best = 0, bd = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(target(i) - reel.scrollLeft); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const go = i => reel.scrollTo({ left: target(clamp(i, 0, cards.length - 1)), behavior: motionOn ? 'smooth' : 'auto' });
  function sync() {
    const i = reel.scrollLeft < 4 ? 0 : index();
    dots.forEach((d, j) => d.setAttribute('aria-current', j === i ? 'true' : 'false'));
    if (prev) prev.disabled = reel.scrollLeft < 4;
    if (next) next.disabled = reel.scrollLeft >= maxLeft() - 4;
  }
  let rs = false;
  reel.addEventListener('scroll', () => { if (!rs) { rs = true; requestAnimationFrame(() => { rs = false; sync(); }); } }, { passive: true });
  if (prev) prev.addEventListener('click', () => go((reel.scrollLeft >= maxLeft() - 4 ? cards.length - 1 : index()) - 1));
  if (next) next.addEventListener('click', () => go(index() + 1));
  dots.forEach((d, j) => d.addEventListener('click', () => go(j)));
  reel.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
  });
  window.addEventListener('resize', sync);
  sync();
}

// Light and dark: the page opens light; the toggle switches and is remembered on this device.
const themeBtn = $('#theme');
function showTheme() {
  if (!themeBtn) return;
  const d = isDark();
  themeBtn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
  themeBtn.setAttribute('aria-pressed', String(d));
}
function retheme() { setPalette(); figs.forEach(paint); showTheme(); }
if (themeBtn) themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  if (next === 'dark') root.setAttribute('data-mode', 'dark'); else root.removeAttribute('data-mode');
  try { localStorage.setItem('rg-mode', next); } catch (e) {}
  retheme();
});
showTheme();

// Pause or resume all motion.
const toggle = $('#motion');
function showMotion() {
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', String(motionOn));
  toggle.textContent = motionOn ? 'Pause animations' : 'Play animations';
}
showMotion();
if (toggle) toggle.addEventListener('click', () => {
  setMotion(!motionOn);
  root.classList.toggle('motion-on', motionOn);
  root.classList.toggle('motion-off', !motionOn);
  try { localStorage.setItem('rg-motion', motionOn ? 'on' : 'off'); } catch (e) {}
  showMotion();
  if (motionOn) { kick(); armReveal(); }
  else { root.classList.remove('rv-on'); figs.forEach(paint); }
});

// Portrait: photo.jpg, next to index.html. Until it loads, or if it is missing, the pixel
// stand-in stays; once it loads, the drawing breaks the photo into patches now and then.
{
  const photo = $('#photo'), tile = $('#me');
  if (photo && tile) {
    photo.onload = () => { photo.hidden = false; setPortraitFrom(photo); tile.classList.add('has-photo'); };
    photo.src = 'photo.jpg';
  }
}

// Copy the email address.
const copy = $('#copy'), email = $('#email');
if (copy && email) copy.addEventListener('click', () => {
  const lab = copy.querySelector('span');
  const say = s => { lab.textContent = s; setTimeout(() => { lab.textContent = 'Copy address'; }, 2200); };
  const select = () => {
    const range = document.createRange(); range.selectNodeContents(email);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    say('Selected');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(email.textContent.trim()).then(() => say('Copied'), select);
  else select();
});
