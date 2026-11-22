/*
 * Portrait photo: chosen, cropped and cleaned entirely in this browser; nothing is uploaded. A
 * hosted copy can also ship a cleaned photo.jpg next to index.html; when that file exists it
 * is used for every visitor and the chooser steps aside.
 */
import { root, $, clamp } from './core/util.js';
import { SOFT } from './core/palette.js';
import { label } from './core/canvas.js';
import { setPortraitFrom, clearPortrait } from './figures/portrait.js';

export function initPhoto() {
  const img = $('#photo'), wrap = $('#me-wrap'), tile = $('#me'), btn = $('#photo-btn');
  const dlg = $('#cropper'), fileIn = $('#photo-file'), stage = $('#crop-stage'), cv = $('#crop-canvas');
  const zoomIn = $('#crop-zoom'), msg = $('#crop-msg'), save = $('#crop-save'), remove = $('#crop-remove');
  if (!img || !wrap || !btn || !dlg || !fileIn || !cv) return;
  const KEY = 'rg-photo', hosted = root.dataset.hosted === 'true';
  let stored = null, src = null, sw = 0, sh = 0, cx = 0, cy = 0, zoom = 2, drag = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored && stored.indexOf('data:image/') !== 0) stored = null;

  function show(url, baked) {
    if (!url) {
      img.hidden = true; img.removeAttribute('src'); clearPortrait();
      wrap.classList.remove('has-photo', 'baked'); tile.classList.remove('has-photo');
      return;
    }
    img.onload = () => {
      img.hidden = false; setPortraitFrom(img);
      wrap.classList.add('has-photo'); tile.classList.add('has-photo'); wrap.classList.toggle('baked', !!baked);
    };
    img.onerror = () => show('');
    img.src = url;
  }
  // A hosted copy can ship a cleaned photo.jpg next to the page; then the chooser steps aside.
  if (hosted) {
    const probe = new Image();
    probe.onload = () => show('photo.jpg', true);
    probe.onerror = () => { if (stored) show(stored); };
    probe.src = 'photo.jpg';
  } else if (stored) show(stored);

  const side = () => Math.min(sw, sh) / zoom;
  function hold() { const s = side() / 2; cx = clamp(cx, s, sw - s); cy = clamp(cy, s, sh - s); }
  function drawCrop() {
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    c.imageSmoothingQuality = 'high';
    if (src) { hold(); const s = side(); c.drawImage(src, cx - s / 2, cy - s / 2, s, s, 0, 0, cv.width, cv.height); }
    else if (stored && !img.hidden) c.drawImage(img, 0, 0, cv.width, cv.height);
    else label(c, 'No photo chosen yet', cv.width / 2, cv.height / 2, 30, SOFT, 'center');
  }
  function refresh(text) {
    save.disabled = !src;
    zoomIn.disabled = !src;
    remove.hidden = !stored;
    document.dispatchEvent(new CustomEvent('rg-photo', { detail: { url: stored && !src ? stored : '' } }));
    msg.textContent = text || (src ? 'Drag to reposition, then zoom to taste.' : stored ? 'This is the photo in use on this device.' : '');
    drawCrop();
  }
  function open() { if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); } refresh(); }
  function close() {
    if (src && src.close) src.close();
    src = null;
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  }
  async function decode(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) {}
    }
    return await new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => res(im);
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
      im.src = url;
    });
  }
  btn.addEventListener('click', () => { if (stored) open(); else fileIn.click(); });
  $('#crop-pick').addEventListener('click', () => fileIn.click());
  $('#crop-cancel').addEventListener('click', close);
  dlg.addEventListener('cancel', () => { if (src && src.close) src.close(); src = null; });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files && fileIn.files[0];
    fileIn.value = '';
    if (!f) return;
    if (src && src.close) src.close();
    src = null;
    open(); refresh('Opening the photo\u2026');
    try { src = await decode(f); } catch (e) { src = null; refresh('This browser cannot open that file. Try a JPEG or PNG.'); return; }
    sw = src.width || src.naturalWidth; sh = src.height || src.naturalHeight;
    if (!sw || !sh) { src = null; refresh('This browser cannot open that file. Try a JPEG or PNG.'); return; }
    zoom = 2; zoomIn.value = '2'; cx = sw / 2; cy = sh * (sh > sw ? .4 : .5);
    refresh();
  });
  zoomIn.addEventListener('input', () => { zoom = clamp(+zoomIn.value || 1, 1, 5); drawCrop(); });
  stage.addEventListener('pointerdown', e => { if (!src) return; drag = [e.clientX, e.clientY, cx, cy]; try { stage.setPointerCapture(e.pointerId); } catch (err) {} });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    const k = side() / Math.max(1, stage.clientWidth);
    cx = drag[2] - (e.clientX - drag[0]) * k; cy = drag[3] - (e.clientY - drag[1]) * k;
    drawCrop();
  });
  ['pointerup', 'pointercancel'].forEach(ev => stage.addEventListener(ev, () => { drag = null; }));
  stage.addEventListener('wheel', e => {
    if (!src) return;
    e.preventDefault();
    zoom = clamp(zoom * Math.exp(-e.deltaY * .0015), 1, 5); zoomIn.value = String(zoom); drawCrop();
  }, { passive: false });
  stage.addEventListener('keydown', e => {
    if (!src) return;
    const step = side() * .04, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault(); cx += d[0] * step; cy += d[1] * step; drawCrop();
  });
  save.addEventListener('click', () => {
    if (!src) return;
    // Drawing onto a fresh canvas and re-encoding keeps the pixels only: no EXIF, GPS, or HDR gain map survives.
    const o = document.createElement('canvas'); o.width = o.height = 512;
    const c = o.getContext('2d'); c.imageSmoothingQuality = 'high';
    hold(); const s = side();
    c.drawImage(src, cx - s / 2, cy - s / 2, s, s, 0, 0, 512, 512);
    let url = '';
    try { url = o.toDataURL('image/jpeg', .88); } catch (e) {}
    if (url.indexOf('data:image/jpeg') !== 0) { refresh('That image could not be processed.'); return; }
    stored = url;
    try { localStorage.setItem(KEY, url); } catch (e) {}
    show(url); close();
  });
  remove.addEventListener('click', () => {
    stored = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    show(''); close();
  });
}
