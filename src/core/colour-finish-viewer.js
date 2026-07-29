// Colour & finish swatch grid for a profile series page: fetches that
// series' colours from the CMS, filters them into a grid by finish type
// (powdercoating texture / sublimated / anodised), and swaps the product
// preview image + active swatch as the user browses.
const API = {
  url: 'https://cms.nuwall.co.nz/api',
  key: 'nk_99b79c6d5168840d0b11a35e1953d2c1b5f38c6d0b6970cbaf0e69abfe8424ff',
};

const POWDERCOATING = ['Smooth', 'Textured', 'Metallic Textured'];
const TEXTURE_TO_FINISH_TYPE = {
  smooth: 'Smooth',
  textured: 'Textured',
  'metallic-textured': 'Metallic Textured',
};

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
    currentIndex: 0,
    currentFinish: 'powdercoating',
    currentTexture: textureTriggers.length ? textureTriggers[0].getAttribute('data-texture') : 'smooth',
  };

  let pendingFade = null;
  const preloadCache = {};

  function finishKey(finishType) {
    if (POWDERCOATING.includes(finishType)) return 'powdercoating';
    if (finishType === 'Sublimation') return 'sublimated';
    if (finishType === 'Anodised') return 'anodised';
    return null;
  }

  function preloadVisibleImages() {
    state.visibleItems.forEach((c) => {
      const src = c.image?.url || '';
      if (src && !preloadCache[src]) {
        const img = new Image();
        img.src = src;
        preloadCache[src] = img;
      }
    });
  }

  function buildVisible() {
    state.visibleItems = state.allColours.filter((c) => {
      if (finishKey(c.finishType) !== state.currentFinish) return false;
      if (state.currentFinish === 'powdercoating') {
        return c.finishType === (TEXTURE_TO_FINISH_TYPE[state.currentTexture] || 'Smooth');
      }
      return true;
    });
    preloadVisibleImages();
  }

  function makeItem(c) {
    const item = template.cloneNode(true);
    item.classList.remove('nw-template');
    item.setAttribute('data-hidden', 'false');
    item.setAttribute('data-finish', finishKey(c.finishType));
    item.setAttribute('data-code', c.code);

    const img = item.querySelector('.colour-item-image > img');
    if (img) {
      img.src = c.swatchImage?.webURL || c.swatchImage?.url || '';
      img.alt = c.title || '';
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

  function renderGrid() {
    colourGrid.querySelectorAll('.colour-item:not(.nw-template)').forEach((el) => el.remove());
    state.visibleItems.forEach((c) => colourGrid.appendChild(makeItem(c)));
  }

  function swapImage(src, animate) {
    if (!src) return;

    if (pendingFade) {
      clearTimeout(pendingFade);
      pendingFade = null;
      productImg.classList.remove('is-fading');
    }

    if (animate) {
      productImg.classList.add('is-fading');
      pendingFade = setTimeout(() => {
        productImg.src = src;
        productImg.classList.remove('is-fading');
        pendingFade = null;
      }, 600);
    } else {
      productImg.src = src;
    }
  }

  function render({ animate = false } = {}) {
    if (!state.visibleItems.length) return;
    if (state.currentIndex >= state.visibleItems.length) state.currentIndex = 0;
    if (state.currentIndex < 0) state.currentIndex = state.visibleItems.length - 1;

    const active = state.visibleItems[state.currentIndex];

    swapImage(active.image?.webURL || active.image?.url || '', animate);

    const nameOuter = document.querySelector('.colour-name-outer');
    if (nameOuter) nameOuter.textContent = active.title || '';

    colourGrid.querySelectorAll('.colour-item:not(.nw-template)').forEach((el, i) => {
      el.classList.toggle('is-active', i === state.currentIndex);
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
      buildVisible();
      renderGrid();
      render({ animate: true });
    });
  });

  textureTriggers.forEach((el) => {
    el.addEventListener('click', () => {
      const t = el.getAttribute('data-texture');
      if (t === state.currentTexture) return;
      state.currentTexture = t;
      state.currentIndex = 0;

      colourGrid.setAttribute('data-transitioning', 'true');
      setTimeout(() => {
        buildVisible();
        renderGrid();
        render({ animate: false });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            colourGrid.setAttribute('data-transitioning', 'false');
          })
        );
      }, 250);
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

  fetch(API.url + '/profile-series/' + SERIES_ID + '/colours', {
    headers: { 'Content-Type': 'application/json', 'x-api-key': API.key },
  })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((colours) => {
      state.allColours = Array.isArray(colours) ? colours : colours.docs || [];
      buildVisible();
      renderGrid();
      render({ animate: false });
    })
    .catch((err) => console.error('[colours] fetch failed:', err));
}
