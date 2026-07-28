// WorkingSpec model preview: opens a linked WorkingSpec 3D model in a
// full-screen iframe overlay. Two entry points share one overlay singleton:
//  - initWorkingSpecLinks(): wires static `.resource-video-wrapper` triggers
//    (Webflow CMS-rendered rows), reading the model code from a
//    `[data-role="model-code"]` element in the same row.
//  - openWorkingSpecPreview(modelCode, fileName): called directly by other
//    modules (e.g. the resources library viewer) that already have the model
//    code from fetched JSON, with no DOM row to read it from.
import scrollerSvg from '../assets/scroller.svg?raw';
import mouseLeftSvg from '../assets/mouse-left.svg?raw';
import mouseRightSvg from '../assets/mouse-right.svg?raw';

const API_EMBED_URL = 'https://workingspec.com/embed/';

const CLOSE_SVG =
  '<svg width="20" height="20" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M30.4551 14.545L14.5452 30.4549" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M30.4551 30.455L14.5452 14.5451" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '</svg>';

// Bundled as inline SVG markup (no hosted asset pipeline for this script),
// so the control icons are embedded directly rather than pointed at a src.
const CONTROLS_HTML =
  '<li m-zoom="">' + scrollerSvg + 'Zoom</li>' +
  '<li m-rotate="">' + mouseLeftSvg + 'Rotate</li>' +
  '<li m-move="">' + mouseRightSvg + 'Move</li>';

// Lazily built once per bundle and reused by every caller in that bundle.
let overlayApi = null;

function getOverlay() {
  if (overlayApi) return overlayApi;

  const overlay = document.createElement('div');
  overlay.className = 'rl-preview-overlay';

  const win = document.createElement('div');
  win.className = 'rl-preview-window';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'rl-preview-close';
  closeBtn.innerHTML = CLOSE_SVG;

  const meta = document.createElement('div');
  meta.className = 'rl-preview-meta';

  const fileNameEl = document.createElement('p');
  fileNameEl.className = 'rl-preview-filename';

  const body = document.createElement('div');
  body.className = 'rl-preview-body';

  const controls = document.createElement('ul');
  controls.setAttribute('m-controls', '');
  controls.innerHTML = CONTROLS_HTML;

  meta.appendChild(fileNameEl);
  win.appendChild(closeBtn);
  win.appendChild(meta);
  win.appendChild(body);
  win.appendChild(controls);
  overlay.appendChild(win);
  document.body.appendChild(overlay);

  function closePreview() {
    overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(() => {
      body.innerHTML = '';
    }, 300);
  }

  closeBtn.addEventListener('click', closePreview);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePreview();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-visible')) closePreview();
  });

  overlayApi = { overlay, body, fileNameEl };
  return overlayApi;
}

// Opens the full-screen WorkingSpec preview for a given model code. Safe to
// call from any module, regardless of whether the trigger came from a static
// CMS row or a dynamically rendered card.
export function openWorkingSpecPreview(modelCode, fileName) {
  const code = (modelCode || '').trim();
  if (!code) return;

  const { overlay, body, fileNameEl } = getOverlay();

  body.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = API_EMBED_URL + code;
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowfullscreen', 'allowfullscreen');
  body.appendChild(iframe);

  fileNameEl.textContent = fileName || 'Installation Video';

  overlay.classList.add('is-visible');
  document.body.style.overflow = 'hidden';
}

export function initWorkingSpecLinks() {
  const triggers = document.querySelectorAll('.resource-video-wrapper');
  if (!triggers.length) return;

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const row = trigger.closest('.w-dyn-item');
      const codeEl = row && row.querySelector('[data-role="model-code"]');
      const fileName = trigger.getAttribute('data-file-name');

      if (codeEl) {
        openWorkingSpecPreview(codeEl.textContent, fileName);
      }
    });
  });
}
