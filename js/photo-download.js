/*
 * Hosted copy only: offers the cleaned, metadata-free portrait as a file, so it can be
 * saved next to index.html as photo.jpg. It listens for the event the photo chooser sends.
 */
const row = document.querySelector('.crop-actions');
if (row) {
  const link = document.createElement('a');
  link.className = 'pill';
  link.textContent = 'Download clean copy';
  link.setAttribute('download', 'photo.jpg');
  link.hidden = true;
  row.insertBefore(link, row.firstChild);
  document.addEventListener('rg-photo', e => {
    const url = e.detail && e.detail.url;
    link.hidden = !url;
    if (url) link.href = url;
  });
}
