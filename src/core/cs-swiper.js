// Data-attribute-driven Swiper carousels (`.cs-swiper`): reads `data-cs-*`
// attributes for config, loop-clones slides when needed, wires nav/pagination/
// scrollbar/thumbnails, and cross-fades hero heading/description/button text
// to match the active slide (for hero sliders using `.cs-hero-*` markup).
import Swiper from 'swiper/bundle';

function parseBool(v, fallback) {
  if (v === undefined || v === null) return fallback;
  return v === 'true' || v === '1' ? true : v === 'false' || v === '0' ? false : fallback;
}

function parseNum(v, fallback) {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function parseSlidesPerView(v) {
  if (!v) return 1;
  if (v === 'auto') return 'auto';
  const n = Number(v);
  return isNaN(n) ? 1 : n;
}

function getSlideContent(slide) {
  if (!slide) return null;
  const data = slide.querySelector('.cs-slide-data');
  if (!data) return null;
  const d = data.dataset;
  return {
    heading: (d.csHeadingOne || '').trim(),
    headingTwo: (d.csHeadingTwo || '').trim(),
    description: (d.csDescription || '').trim(),
    buttonText: (d.csButtonText || '').trim(),
    buttonLink: (d.csButtonLink || '').trim(),
  };
}

// Syncs a `.cs-hero-<name>` block's heading/description/button to the active
// slide's `.cs-slide-data` attributes, cross-fading between changes.
function setupHeroSync(name, swiper) {
  const FADE_MS = 700; // fade duration; keep swap timeout equal to this

  const hero = document.querySelector('.cs-hero-' + name);
  if (!hero) return;

  const headingEls = Array.from(hero.querySelectorAll('.cs-hero-heading-one'));
  const headingTwoEls = Array.from(hero.querySelectorAll('.cs-hero-heading-two'));
  const descEls = Array.from(hero.querySelectorAll('.cs-hero-description'));
  const btnEls = Array.from(hero.querySelectorAll('.cs-hero-button'));
  const fadeTargets = [...headingEls, ...headingTwoEls, ...descEls, ...btnEls];

  // Base state: everything starts invisible until the first paint.
  fadeTargets.forEach((node) => {
    node.style.transition = 'opacity ' + FADE_MS + 'ms ease';
    node.style.opacity = '0';
  });

  // Text/heading/description: toggle display so empty fields collapse.
  function applyText(elArr, value) {
    elArr.forEach((node) => {
      node.textContent = value;
      node.style.display = value ? '' : 'none';
    });
  }

  // Button: keep layout space (visibility, not display) so nothing jumps.
  // Write label into .button_label; toggle href.
  function applyButton(text, link) {
    const shown = !!text;
    btnEls.forEach((node) => {
      const label = node.querySelector('.button_label');
      if (label) label.textContent = text;
      else node.textContent = text;
      if (link) node.setAttribute('href', link);
      else node.removeAttribute('href');
      node.style.visibility = shown ? 'visible' : 'hidden';
      node.style.pointerEvents = shown ? '' : 'none';
    });
  }

  function render(content) {
    applyText(headingEls, content ? content.heading : '');
    applyText(headingTwoEls, content ? content.headingTwo : '');
    applyText(descEls, content ? content.description : '');
    applyButton(content ? content.buttonText : '', content ? content.buttonLink : '');
  }

  // Read content from the actual active slide element in the DOM.
  // This is clone-safe: clones carry the same data attributes.
  function activeContent() {
    return getSlideContent(swiper.slides[swiper.activeIndex]);
  }

  function sig(c) {
    return c ? c.heading + '|' + c.headingTwo + '|' + c.description + '|' + c.buttonText + '|' + c.buttonLink : '';
  }

  let lastSig = null;
  let fadeTimer = null;

  function paintInstant() {
    const content = activeContent();
    lastSig = sig(content);
    if (fadeTimer) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    render(content);
    fadeTargets.forEach((node) => {
      node.style.opacity = '1';
    });
  }

  function paintAnimated() {
    const content = activeContent();
    const s = sig(content);
    if (s === lastSig) return; // same content already shown -> no flash
    lastSig = s;

    fadeTargets.forEach((node) => {
      node.style.opacity = '0';
    });
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = setTimeout(() => {
      render(content);
      requestAnimationFrame(() => {
        fadeTargets.forEach((node) => {
          node.style.opacity = '1';
        });
      });
    }, FADE_MS);
  }

  // First paint happens once, on init, with the correct active slide.
  swiper.on('init', paintInstant);
  // Every genuine slide change after init animates.
  swiper.on('slideChange', paintAnimated);
}

function initThumbnails(swiperInstances) {
  document.querySelectorAll('[data-cs-thumbs-for]').forEach((container) => {
    const targetName = container.dataset.csThumbsFor;
    const swiper = swiperInstances[targetName];
    if (!swiper) return;

    const thumbs = container.querySelectorAll('.cs-thumb');
    const thumbCount = thumbs.length;
    if (thumbCount === 0) return;

    function updateActive(realIndex) {
      const idx = realIndex % thumbCount;
      thumbs.forEach((t, i) => {
        t.classList.toggle('active', i === idx);
      });
    }

    updateActive(swiper.realIndex);
    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => {
        swiper.slideToLoop(i, swiper.params.speed);
      });
    });
    swiper.on('slideChange', () => {
      updateActive(swiper.realIndex);
    });
  });
}

export function initCsSwipers() {
  document.querySelectorAll('.cs-swiper:not([data-cs-name])').forEach((el, i) => {
    el.dataset.csName = 'cms-gallery-' + i;
  });

  const swiperInstances = {};

  document.querySelectorAll('.cs-swiper').forEach((el) => {
    const d = el.dataset;
    const name = d.csName;
    if (!name) return;

    const spv = parseSlidesPerView(d.csSlides);
    const gap = parseNum(d.csGap, 0);
    const speed = parseNum(d.csSpeed, 500);
    const wantsLoop = parseBool(d.csLoop, false);
    const autoplay = d.csAutoplay && d.csAutoplay !== 'false' ? parseNum(d.csAutoplay, false) : false;
    const pauseOnHover = parseBool(d.csPauseHover, true);
    const effect = d.csEffect || 'slide';
    const pagType = d.csPaginationType || 'bullets';
    const direction = d.csDirection || 'horizontal';
    const centered = parseBool(d.csCentered, false);
    const grab = parseBool(d.csGrab, true);
    const keyboard = parseBool(d.csKeyboard, true);
    const mousewheel = parseBool(d.csMousewheel, false);
    const freeMode = parseBool(d.csFreemode, false);

    const wrapper = el.querySelector('.swiper-wrapper');
    if (!wrapper) return;

    const originalSlides = wrapper.querySelectorAll(':scope > .swiper-slide');
    const originalCount = originalSlides.length;

    let didClone = false;
    const minTotal = Math.max(originalCount * 3, 9);
    if (wantsLoop && originalCount > 0 && originalCount < minTotal) {
      let currentCount = originalCount;
      while (currentCount < minTotal) {
        for (let s = 0; s < originalCount && currentCount < minTotal; s++) {
          const clone = originalSlides[s].cloneNode(true);
          clone.setAttribute('data-cs-clone', 'true');
          wrapper.appendChild(clone);
          currentCount++;
        }
      }
      didClone = true;
    }

    function roundSlideWidths() {
      wrapper.querySelectorAll(':scope > .swiper-slide').forEach((slide) => {
        slide.style.width = '';
        slide.style.width = Math.round(slide.getBoundingClientRect().width) + 'px';
      });
    }
    if (spv === 'auto') roundSlideWidths();

    const opts = {
      init: false, // we init manually after wiring events
      slidesPerView: spv,
      spaceBetween: gap,
      speed: speed,
      roundLengths: true,
      direction: direction,
      grabCursor: grab,
      centeredSlides: centered,
      observer: true,
      threshold: 10,
      preventClicks: false,
      preventClicksPropagation: false,
      observeParents: true,
    };
    if (wantsLoop) {
      opts.loop = true;
      opts.loopAdditionalSlides = originalCount;
    }
    if (autoplay) {
      opts.autoplay = { delay: autoplay, disableOnInteraction: false, pauseOnMouseEnter: pauseOnHover };
    }
    if (effect !== 'slide') {
      opts.effect = effect;
      if (effect === 'fade') opts.fadeEffect = { crossFade: true };
      if (effect === 'coverflow') {
        opts.coverflowEffect = { rotate: 30, stretch: 0, depth: 100, modifier: 1, slideShadows: true };
      }
      if (effect === 'creative') {
        opts.creativeEffect = {
          prev: { shadow: true, translate: [0, 0, -400] },
          next: { translate: ['100%', 0, 0] },
        };
      }
    }
    if (keyboard) opts.keyboard = { enabled: true };
    if (mousewheel) opts.mousewheel = { forceToAxis: true };
    if (freeMode) opts.freeMode = { enabled: true, sticky: false };
    opts.a11y = { prevSlideMessage: 'Previous slide', nextSlideMessage: 'Next slide' };
    if (d.csBreakpoints) {
      try {
        opts.breakpoints = JSON.parse(d.csBreakpoints.replace(/'/g, '"'));
      } catch (e) {
        console.warn('cs-swiper: bad breakpoints JSON on "' + name + '"');
      }
    }

    const prevBtn = document.querySelector('.cs-prev-' + name);
    const nextBtn = document.querySelector('.cs-next-' + name);
    const pagEl = document.querySelector('.cs-pagination-' + name);
    const scrEl = document.querySelector('.cs-scrollbar-' + name);
    if (prevBtn && nextBtn) opts.navigation = { prevEl: prevBtn, nextEl: nextBtn };
    if (pagEl) {
      opts.pagination = { el: pagEl, clickable: true, type: pagType };
      if (didClone) {
        opts.pagination.renderBullet = (index, className) =>
          index < originalCount ? '<span class="' + className + '"></span>' : '';
      }
    }
    if (scrEl) opts.scrollbar = { el: scrEl, draggable: true };

    // Create (not yet initialized because init:false)
    const swiper = new Swiper(el, opts);

    // Pagination active-bullet fix for cloned slides
    if (didClone && pagEl) {
      swiper.on('slideChange', () => {
        const real = swiper.realIndex % originalCount;
        pagEl.querySelectorAll('.swiper-pagination-bullet').forEach((b, i) => {
          b.classList.toggle('swiper-pagination-bullet-active', i === real);
        });
      });
    }

    // Wire hero sync BEFORE init so its 'init' handler fires the first paint
    setupHeroSync(name, swiper);

    // Now initialize — this fires 'init', then settles the loop.
    swiper.init();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (spv === 'auto') roundSlideWidths();
        swiper.update();
      }, 200);
    });
    setTimeout(() => {
      swiper.update();
    }, 150);

    swiperInstances[name] = swiper;
    el._swiper = swiper;
  });

  initThumbnails(swiperInstances);
}
