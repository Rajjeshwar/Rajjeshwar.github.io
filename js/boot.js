// Runs before the page paints, so a remembered choice (motion off, dark mode) never flashes.
(function () {
  var m = null, r = false;
  try { m = localStorage.getItem('rg-motion'); } catch (e) {}
  try { r = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  document.documentElement.classList.add((m ? m === 'on' : !r) ? 'motion-on' : 'motion-off');
  var th = null;
  try { th = localStorage.getItem('rg-mode'); } catch (e) {}
  if (th === 'dark') document.documentElement.setAttribute('data-mode', 'dark');
})();
