// Colour & finish swatch grid for a profile series page: fetches that
// series' colours from the CMS, filters them into a grid by finish type
// (powdercoating texture / sublimated / anodised), and swaps the product
// preview image + active swatch as the user browses.
import { cms } from '../utils/cms-client.js';
import { queueImageLoad } from '../utils/image-load-queue.js';

const POWDERCOATING = ['Smooth', 'Textured', 'Metallic Textured'];
const TEXTURE_TO_FINISH_TYPE = {
  smooth: 'Smooth',
  textured: 'Textured',
  'metallic-textured': 'Metallic Textured',
};
const FINISH_TYPE_TO_TEXTURE = Object.fromEntries(
  Object.entries(TEXTURE_TO_FINISH_TYPE).map(([texture, finishType]) => [finishType, texture])
);

// Determines the order colours are built/queued in — not just their visual
// grid position (each finish/texture group is still internally sorted by
// the CMS's own "order" field, since this sort is stable). Textured loads
// first, then Smooth, etc., so one whole group's swatches finish loading
// before the next group even starts, instead of every group's images
// racing each other through the shared queue at once.
const FINISH_LOAD_PRIORITY = ['Textured', 'Smooth', 'Metallic Textured', 'Anodised', 'Sublimation'];

function byLoadPriority(colours) {
  return colours.slice().sort((a, b) => {
    const ai = FINISH_LOAD_PRIORITY.indexOf(a.finishType);
    const bi = FINISH_LOAD_PRIORITY.indexOf(b.finishType);
    return (ai === -1 ? FINISH_LOAD_PRIORITY.length : ai) - (bi === -1 ? FINISH_LOAD_PRIORITY.length : bi);
  });
}

export function initColourFinishViewer() {
  const seriesRoot = document.getElementById('series-root');
  const SERIES_ID = seriesRoot ? parseInt(seriesRoot.dataset.seriesId, 10) : null;
  if (!SERIES_ID) {
    console.warn('[colours] no series ID found on page.');
    return;
  }

  const productImg = document.getElementById('product-preview');
  const finishTriggers = Array.from(document.querySelectorAll('.finish-type-trigger'));
  const textureTriggers = Array.from(document.querySelectorAll('.texture-trigger-item'));
  const textureWrapper = document.querySelector('.resources-texture-group');
  const colourGrid = document.querySelector('.colour-grid');
  const prevBtn = document.querySelector('.cs-prev-colour_finish');
  const nextBtn = document.querySelector('.cs-next-colour_finish');

  if (!colourGrid) {
    console.warn('[colours] .colour-grid not found.');
    return;
  }

  const template = colourGrid.querySelector('.colour-item');
  if (!template) {
    console.warn('[colours] no .colour-item template found.');
    return;
  }
  template.setAttribute('data-hidden', 'true');
  template.classList.add('nw-template');

  const state = {
    allColours: [],
    visibleItems: [],
    itemEls: new Map(), // colour object -> its grid <div>, built once and reused across finish/texture switches
    currentIndex: 0,
    currentFinish: 'powdercoating',
    currentTexture: textureTriggers.length ? textureTriggers[0].getAttribute('data-texture') : 'smooth',
  };

  let pendingFade = null;
  const mainImageCache = {};

  function finishKey(finishType) {
    if (POWDERCOATING.includes(finishType)) return 'powdercoating';
    if (finishType === 'Sublimation') return 'sublimated';
    if (finishType === 'Anodised') return 'anodised';
    return null;
  }

  // Fires once per colour's main preview image, right after the fetch
  // resolves — every colour across every finish/texture group is warmed
  // into the browser cache up front, so switching groups or swatches later
  // never waits on a network fetch. Goes through the shared queue so 60+
  // colours don't all hit the CMS at once.
  function preloadAllMainImages() {
    state.allColours.forEach((c) => {
      const src = c.image?.url || '';
      if (src && !mainImageCache[src]) {
        mainImageCache[src] = queueImageLoad(src);
      }
    });
  }

  function isVisible(c) {
    if (finishKey(c.finishType) !== state.currentFinish) return false;
    if (state.currentFinish === 'powdercoating') {
      return c.finishType === (TEXTURE_TO_FINISH_TYPE[state.currentTexture] || 'Smooth');
    }
    return true;
  }

  // Loads a swatch thumbnail off-DOM first, so the visible <img> only ever
  // gets a fully-decoded `src` — it fades in over the base-colour fill
  // instead of popping in blockily mid-download. Queued (not fired
  // directly) so every colour's swatch doesn't hit the CMS at once.
  function loadSwatchImage(imgEl, src) {
    if (!src) return;
    queueImageLoad(src, {
      onload: () => {
        imgEl.src = src;
        requestAnimationFrame(() => imgEl.classList.add('is-loaded'));
      },
      onerror: () => {
        imgEl.src = src;
      },
    });
  }

  function makeItem(c) {
    const item = template.cloneNode(true);
    item.classList.remove('nw-template');
    item.setAttribute('data-hidden', isVisible(c) ? 'false' : 'true');
    item.setAttribute('data-finish', finishKey(c.finishType));
    item.setAttribute('data-texture', FINISH_TYPE_TO_TEXTURE[c.finishType] || '');
    item.setAttribute('data-code', c.code);

    const imageWrapper = item.querySelector('.colour-item-image');
    if (imageWrapper) imageWrapper.style.backgroundColor = c.baseColour || '';

    const img = item.querySelector('.colour-item-image > img');
    if (img) {
      img.removeAttribute('src');
      img.alt = c.title || '';
      loadSwatchImage(img, c.swatchImage?.webURL || c.swatchImage?.url || '');
    }

    const h6 = item.querySelector('.colour-name-wrapper > h6');
    if (h6) {
      h6.textContent = c.title || '';
      h6.style.color = c.isLightColour ? '#2A2D2B' : '#F7F5F5';
    }

    item.addEventListener('click', () => {
      const idx = state.visibleItems.indexOf(c);
      if (idx !== -1) {
        state.currentIndex = idx;
        render({ animate: true });
      }
    });

    return item;
  }

  // Builds every colour's grid item exactly once. Switching finish/texture
  // afterwards only ever toggles `data-hidden` on these existing elements —
  // it never re-fetches or re-decodes an image.
  function buildAllItems() {
    colourGrid.querySelectorAll('.colour-item:not(.nw-template)').forEach((el) => el.remove());
    state.itemEls.clear();
    state.allColours.forEach((c) => {
      const item = makeItem(c);
      state.itemEls.set(c, item);
      colourGrid.appendChild(item);
    });
  }

  function updateVisibility() {
    state.visibleItems = state.allColours.filter(isVisible);
    state.allColours.forEach((c) => {
      const el = state.itemEls.get(c);
      if (el) el.setAttribute('data-hidden', isVisible(c) ? 'false' : 'true');
    });
  }

  // Crossfades #product-preview to `src`: fades the current image out, and
  // only swaps `src` (and starts the fade back in) once the new image has
  // actually finished loading — swapping on a timer alone let the fade-in
  // start over blank/undecoded pixels, which read as the old image
  // "flashing" back before snapping to the new one.
  function swapImage(src, animate) {
    if (!src) return;

    if (pendingFade) {
      clearTimeout(pendingFade);
      pendingFade = null;
    }

    if (!animate) {
      productImg.classList.remove('is-fading');
      productImg.src = src;
      return;
    }

    productImg.classList.add('is-fading');

    pendingFade = setTimeout(() => {
      pendingFade = null;

      const reveal = () => {
        productImg.src = src;
        requestAnimationFrame(() => {
          productImg.classList.remove('is-fading');
        });
      };

      // `cached` may already be mid-load (or mid-retry) via the shared
      // queue — listen instead of overwriting its `onload`, which the
      // queue relies on for its own concurrency bookkeeping.
      let cached = mainImageCache[src];
      if (!cached) {
        cached = queueImageLoad(src);
        mainImageCache[src] = cached;
      }

      if (cached.complete) {
        reveal();
      } else {
        cached.addEventListener('load', reveal, { once: true });
      }
    }, 300); // matches #product-preview's opacity transition duration in site.scss
  }

  function render({ animate = false } = {}) {
    if (!state.visibleItems.length) return;
    if (state.currentIndex >= state.visibleItems.length) state.currentIndex = 0;
    if (state.currentIndex < 0) state.currentIndex = state.visibleItems.length - 1;

    const active = state.visibleItems[state.currentIndex];

    swapImage(active.image?.webURL || active.image?.url || '', animate);

    const nameOuter = document.querySelector('.colour-name-outer');
    if (nameOuter) nameOuter.textContent = active.title || '';

    state.allColours.forEach((c) => {
      const el = state.itemEls.get(c);
      if (el) el.classList.toggle('is-active', c === active);
    });

    finishTriggers.forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-finish') === state.currentFinish);
    });

    if (textureWrapper) {
      textureWrapper.setAttribute('data-hidden', state.currentFinish === 'powdercoating' ? 'false' : 'true');
    }

    textureTriggers.forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-texture') === state.currentTexture);
    });
  }

  finishTriggers.forEach((el) => {
    el.addEventListener('click', () => {
      const f = el.getAttribute('data-finish');
      if (f === state.currentFinish) return;
      state.currentFinish = f;
      state.currentIndex = 0;

      // Same fade/slide as switching texture — all finish groups are
      // already in the DOM and loaded, so this is purely visual.
      colourGrid.setAttribute('data-transitioning', 'true');
      updateVisibility();
      render({ animate: true });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          colourGrid.setAttribute('data-transitioning', 'false');
        })
      );
    });
  });

  textureTriggers.forEach((el) => {
    el.addEventListener('click', () => {
      const t = el.getAttribute('data-texture');
      if (t === state.currentTexture) return;
      state.currentTexture = t;
      state.currentIndex = 0;

      // All swatches for every texture are already in the DOM and loaded —
      // this is purely the visual fade/slide between groups, not a wait for
      // content to become ready.
      colourGrid.setAttribute('data-transitioning', 'true');
      updateVisibility();
      render({ animate: true });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          colourGrid.setAttribute('data-transitioning', 'false');
        })
      );
    });
  });

  function goNext() {
    if (!state.visibleItems.length) return;
    state.currentIndex = (state.currentIndex + 1) % state.visibleItems.length;
    render({ animate: true });
  }
  function goPrev() {
    if (!state.visibleItems.length) return;
    state.currentIndex = (state.currentIndex - 1 + state.visibleItems.length) % state.visibleItems.length;
    render({ animate: true });
  }
  if (prevBtn) prevBtn.addEventListener('click', goPrev);
  if (nextBtn) nextBtn.addEventListener('click', goNext);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  cms.get('/profile-series/' + SERIES_ID + '/colours')
    .then((colours) => {
      state.allColours = byLoadPriority(Array.isArray(colours) ? colours : colours.docs || []);
      // Swatches queue first (in load-priority order) so they don't wait
      // behind every colour's larger main-preview image; those are queued
      // second, in the same priority order.
      buildAllItems();
      preloadAllMainImages();
      updateVisibility();
      render({ animate: false });
    })
    .catch((err) => console.error('[colours] fetch failed:', err));
}
