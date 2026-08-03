// Series profile slider: for each `.series-slider-item` tab pane, fetches
// that profile's gallery/spec images + optional interactive video from the
// Worker API and builds the main + thumbnail Swiper carousels, plus a
// separate spec-image Swiper. Tab clicks swap which pane (and its sliders)
// is visible.
import Swiper from 'swiper/bundle';

const WORKER_URL = 'https://floral-cake-11c6.lezliem.workers.dev';
const COLLECTION_ID = '69bb35ffbadbe7831efb4785';
const IMAGE_FIELD = 'profile---gallery';
const SPECS_FIELD = 'profile---specifications';

const PLAY_SVG =
  '<svg width="68" height="68" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<rect x="0.5" y="0.5" width="33" height="33" rx="16.5" fill="#2A2D2B"></rect>' +
  '<rect x="0.5" y="0.5" width="33" height="33" rx="16.5" stroke="none"></rect>' +
  '<path d="M13.5 10.8L23.5 17L13.5 23.2V10.8Z" fill="#F3EDE3"></path>' +
  '</svg>';

function thumbWithImage(url) {
  return (
    '<div class="series-profile-swiper-image-wrapper" style="position:relative;">' +
    '<img src="' + url + '" alt="Video thumbnail" class="image--cover">' +
    '<div style="position:absolute;inset:0;display:flex;justify-content:center;align-items:center;pointer-events:none;">' +
    PLAY_SVG +
    '</div></div>'
  );
}

const THUMB_FALLBACK =
  '<div class="series-profile-swiper-image-wrapper series-profile-swiper-image-wrapper--video" ' +
  'style="display:flex;justify-content:center;align-items:center;height:100%;">' +
  PLAY_SVG +
  '</div>';

export function initSeriesProfileSlider() {
  const tabItems = document.querySelectorAll('.series-tab-item');
  const sliderItems = document.querySelectorAll('.series-slider-item');
  const specItems = document.querySelectorAll('.spec-slider-item');
  const tabDetails = document.querySelectorAll('.series-tab-details');
  if (!sliderItems.length) return;

  // ── 1. Fetch & inject images ──
  async function loadProfileImages() {
    const fetchPromises = Array.from(sliderItems).map(async (item) => {
      const slug = item.getAttribute('data-profile-slug');
      if (!slug) return;

      try {
        const res = await fetch(WORKER_URL + '?collectionId=' + COLLECTION_ID + '&slug=' + slug);
        const data = await res.json();
        const profile = data.items?.[0];
        const fieldData = profile?.fieldData;
        if (!fieldData) return;

        const galleryImages = fieldData[IMAGE_FIELD] || [];
        const specImages = fieldData[SPECS_FIELD] || [];
        const videoUrl = fieldData['interactive-video-url'] || null;

        const mainWrapper = item.querySelector('.swiper .swiper-wrapper');
        const thumbWrapper = item.querySelector('.swiper-thumb-wrapper');

        // ── Gallery images ──
        galleryImages.forEach((img) => {
          const url = img.url || img.fileUrl || img;

          const mainSlide = document.createElement('div');
          mainSlide.classList.add('swiper-slide');
          mainSlide.innerHTML =
            '<div class="series-profile-swiper-image-wrapper">' +
            '<img src="' + url + '" alt="' + (img.alt || '') + '" class="image--cover"></div>';
          mainWrapper.appendChild(mainSlide);

          const thumbSlide = document.createElement('div');
          thumbSlide.classList.add('thumb-slide');
          thumbSlide.innerHTML =
            '<div class="series-profile-swiper-image-wrapper">' +
            '<img src="' + url + '" alt="' + (img.alt || '') + '" class="image--cover"></div>';
          thumbWrapper.appendChild(thumbSlide);
        });

        // ── Video slide — after gallery, only if a URL exists ──
        if (videoUrl) {
          const videoSlide = document.createElement('div');
          videoSlide.classList.add('swiper-slide', 'swiper-slide--video');
          videoSlide.innerHTML =
            '<div class="series-profile-swiper-image-wrapper">' +
            '<iframe src="' + videoUrl + '&controls=0&autoplay=1&loop=1&muted=1&background=1" ' +
            'frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media" ' +
            'allowfullscreen style="width:100%;height:100%;"></iframe></div>';
          mainWrapper.appendChild(videoSlide);

          const videoThumb = document.createElement('div');
          videoThumb.classList.add('thumb-slide', 'swiper-slide--video-thumb');

          const vimeoMatch = videoUrl.match(/player\.vimeo\.com\/video\/(\d+)/);
          if (vimeoMatch) {
            const vimeoId = vimeoMatch[1];
            const hashMatch = videoUrl.match(/[?&]h=([a-zA-Z0-9]+)/);
            const hash = hashMatch?.[1];
            const vimeoUrl = hash ? 'https://vimeo.com/' + vimeoId + '/' + hash : 'https://vimeo.com/' + vimeoId;

            try {
              const oembedRes = await fetch('https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(vimeoUrl));
              if (!oembedRes.ok) throw new Error('oEmbed request failed: ' + oembedRes.status);
              const oembedData = await oembedRes.json();
              videoThumb.innerHTML = thumbWithImage(oembedData.thumbnail_url);
            } catch (err) {
              console.warn('[series] could not fetch Vimeo thumbnail, falling back to SVG', err);
              videoThumb.innerHTML = THUMB_FALLBACK;
            }
          } else {
            videoThumb.innerHTML = THUMB_FALLBACK;
          }

          thumbWrapper.appendChild(videoThumb);
        }

        // ── Spec images ──
        const matchingSpecItem = Array.from(specItems).find((si) => si.getAttribute('data-tab-content') === slug);
        if (matchingSpecItem) {
          const specWrapper = matchingSpecItem.querySelector('.swiper-wrapper');
          if (specWrapper) {
            specImages.forEach((img) => {
              const url = img.url || img.fileUrl || img;
              const specSlide = document.createElement('div');
              specSlide.classList.add('swiper-slide');
              specSlide.innerHTML =
                '<div class="series-profile-spec-swiper-image-wrapper">' +
                '<img src="' + url + '" alt="' + (img.alt || '') + '" class="image--cover"></div>';
              specWrapper.appendChild(specSlide);
            });
          }
        }
      } catch (err) {
        console.error('[series] profile fetch failed for slug:', slug, err);
      }
    });

    await Promise.all(fetchPromises);
  }

  // ── 2. Tab switching ──
  // `instant` skips the fade for the initial boot-time activation, where
  // there's no previously-visible panel to crossfade away from.
  function activateTab(tabId, instant) {
    tabItems.forEach((tab) => {
      tab.classList.toggle('is-active', tab.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-content').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-tab-content') === tabId);
    });

    [sliderItems, specItems].forEach((group) => {
      group.forEach((el) => {
        if (el.getAttribute('data-tab-content') !== tabId) return;
        const swiper = el.querySelector('.swiper')?.swiper;
        if (swiper) {
          swiper.update();
          swiper.slideTo(0, 0);
        }
      });
    });

    tabDetails.forEach((el) => {
      const isActive = el.getAttribute('data-tab-details') === tabId;
      el.classList.toggle('is-active', isActive);
      setTabDetailsVisibility(el, isActive, instant);
    });
  }

  // Fades a tab-details panel in/out instead of snapping display on/off. The
  // outgoing panel is fully hidden before the incoming one is shown (rather
  // than crossfading simultaneously), so the two never overlap in the
  // layout — that overlap would otherwise cause a visible jump while both
  // panels occupy space during the transition.
  const TAB_DETAILS_FADE_MS = 200;

  function setTabDetailsVisibility(el, visible, instant) {
    if (instant) {
      el.style.display = visible ? '' : 'none';
      el.style.opacity = visible ? '1' : '0';
      return;
    }

    if (visible) {
      window.setTimeout(() => {
        if (el.style.display === 'none') el.style.display = '';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
      }, TAB_DETAILS_FADE_MS);
    } else {
      el.style.opacity = '0';
      window.setTimeout(() => {
        if (el.style.opacity === '0') el.style.display = 'none';
      }, TAB_DETAILS_FADE_MS);
    }
  }

  tabItems.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.getAttribute('data-tab')));
  });

  // ── 3. Swiper init ──
  function initSwipers() {
    sliderItems.forEach((item) => {
      const mainEl = item.querySelector('.swiper');
      const thumbWrapper = item.querySelector('.swiper-thumb-wrapper');

      if (!mainEl) {
        console.warn('[series] missing .swiper in:', item);
        return;
      }

      function updateActiveThumbs(index) {
        const thumbs = thumbWrapper?.querySelectorAll('.thumb-slide');
        thumbs?.forEach((t, i) => {
          t.classList.toggle('is-active', i === index);
        });
      }

      const mainSwiperInstance = new Swiper(mainEl, {
        slidesPerView: 1,
        spaceBetween: 0,
        observer: true,
        observeParents: true,
        resizeObserver: true,
        navigation: {
          nextEl: item.querySelector('.cs-next-series_profile'),
          prevEl: item.querySelector('.cs-prev-series_profile'),
        },
        on: {
          afterInit: function () {
            updateActiveThumbs(0);
          },
          slideChange: function () {
            updateActiveThumbs(this.activeIndex);

            // Restart video playback whenever its slide becomes active.
            const activeSlide = this.slides[this.activeIndex];
            const iframe = activeSlide?.querySelector('iframe');
            if (iframe) {
              const src = iframe.src;
              iframe.src = '';
              iframe.src = src;
            }
          },
          resize: function () {
            this.slideTo(this.activeIndex, 0);
          },
        },
      });

      thumbWrapper?.querySelectorAll('.thumb-slide').forEach((thumb, i) => {
        thumb.addEventListener('click', () => {
          mainSwiperInstance.slideTo(i);
        });
      });
    });

    specItems.forEach((item) => {
      const specEl = item.querySelector('.swiper');
      if (!specEl) {
        console.warn('[series] missing .swiper in spec item:', item);
        return;
      }
      new Swiper(specEl, {
        slidesPerView: 1,
        spaceBetween: 0,
        observer: true,
        observeParents: true,
        resizeObserver: true,
        navigation: {
          nextEl: item.querySelector('.cs-next-profile_specs'),
          prevEl: item.querySelector('.cs-prev-profile_specs'),
        },
        on: {
          resize: function () {
            this.slideTo(this.activeIndex, 0);
          },
        },
      });
    });
  }

  // ── Boot sequence ──
  loadProfileImages().then(() => {
    const firstTabId = tabItems[0]?.getAttribute('data-tab');
    if (firstTabId) activateTab(firstTabId, true);
    initSwipers();
  });
}
