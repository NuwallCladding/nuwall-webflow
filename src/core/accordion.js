// Generic accordion: any `.accordion-item` opens/closes when its
// `.accordion-trigger` is clicked. Height animates to the content's natural
// height, then releases to `auto` so later reflows (image loads, resize)
// don't get clipped. Reused site-wide — not specific to any one page.
//
// Expected markup:
//   <div class="accordion-item" data-accordion-default="true">
//     <div class="accordion-trigger">
//       ...heading...
//       <div class="accordion-icon">...plus svg...</div>
//     </div>
//     <div class="accordion-content">...panel content...</div>
//   </div>
//
// `.accordion-icon` and `data-accordion-default` are optional.

const TRANSITION = 'height 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 800ms ease';

// Exported so callers that build `.accordion-trigger` markup dynamically
// (e.g. resource-viewer.js) can seed the same collapsed-state icon instead
// of duplicating the SVG.
export const ICON_PLUS =
  '<svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M22.5 11.25L22.5 33.75" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M33.75 22.5L11.25 22.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

const ICON_MINUS =
  '<svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M33.75 22.5L11.25 22.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// Measures the content's natural height without a visible flash: swap off
// the transition, read `auto`, then restore both the prior inline height
// and transition before anything paints.
function getAutoHeight(content) {
  const prevHeight = content.style.height;
  const prevTransition = content.style.transition;
  content.style.transition = 'none';
  content.style.height = 'auto';
  const height = content.offsetHeight;
  content.style.height = prevHeight;
  content.offsetHeight; // force reflow so the reverted height takes effect
  content.style.transition = prevTransition;
  return height;
}

function open(item) {
  if (!item || item.classList.contains('is-open')) return;
  const content = item.querySelector('.accordion-content');
  const icon = item.querySelector('.accordion-icon');
  if (!content) return;

  const targetHeight = getAutoHeight(content);
  content.style.transition = TRANSITION;
  content.style.height = targetHeight + 'px';
  content.style.opacity = '1';
  if (icon) icon.innerHTML = ICON_MINUS;
  item.classList.add('is-open');

  function onEnd(e) {
    if (e.propertyName !== 'height') return;
    content.removeEventListener('transitionend', onEnd);
    if (!item.classList.contains('is-open')) return;

    // Two rAFs: let the browser settle on the fixed height first, then
    // release it to `auto` so dynamic content isn't clipped later.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!item.classList.contains('is-open')) return;
        content.style.transition = 'none';
        content.style.height = 'auto';
        content.offsetHeight; // force reflow
        content.style.transition = TRANSITION;
      });
    });
  }
  content.addEventListener('transitionend', onEnd);
}

function close(item) {
  if (!item || !item.classList.contains('is-open')) return;
  const content = item.querySelector('.accordion-content');
  const icon = item.querySelector('.accordion-icon');
  if (!content) return;

  // Height may currently be `auto` (released post-open) — pin it back to a
  // px value first so the collapse to 0 has something to transition from.
  content.style.transition = 'none';
  content.style.height = content.offsetHeight + 'px';
  content.offsetHeight; // force reflow
  content.style.transition = TRANSITION;
  content.style.height = '0px';
  content.style.opacity = '0';
  if (icon) icon.innerHTML = ICON_PLUS;
  item.classList.remove('is-open');
}

function toggle(item) {
  if (item.classList.contains('is-open')) close(item);
  else open(item);
}

// Used for `data-accordion-default` on load: sets straight to `auto` instead
// of animating through a measured px height. A default-open item may still
// be inside a hidden ancestor at init time (e.g. an inactive tab panel that
// another script reveals later asynchronously) — measuring its height there
// would read 0 and bake that in permanently, since a later `open()` call
// no-ops once `is-open` is already set. `auto` sidesteps the measurement
// entirely and resolves correctly whenever the item actually becomes
// visible. It also matches the expected behaviour better: a default-open
// item shouldn't play an opening animation on page load.
function openInstant(item) {
  if (!item || item.classList.contains('is-open')) return;
  const content = item.querySelector('.accordion-content');
  const icon = item.querySelector('.accordion-icon');
  if (!content) return;

  content.style.height = 'auto';
  content.style.opacity = '1';
  if (icon) icon.innerHTML = ICON_MINUS;
  item.classList.add('is-open');
}

export function initAccordion() {
  // Safe to call more than once (e.g. once on page load, then again after
  // an async render adds new `.accordion-item`s) — already-wired triggers
  // are skipped instead of picking up a second click listener, which would
  // double-fire toggle() and make an item open then immediately re-close.
  document.querySelectorAll('.accordion-item').forEach((item) => {
    const trigger = item.querySelector('.accordion-trigger');
    if (!trigger) {
      console.warn('[accordion] .accordion-trigger not found in:', item);
      return;
    }
    if (trigger.dataset.accordionBound === 'true') return;
    trigger.dataset.accordionBound = 'true';
    trigger.addEventListener('click', () => toggle(item));
  });

  document.querySelectorAll('.accordion-item[data-accordion-default="true"]').forEach(openInstant);
}
