// Series profile slider: for each `.series-slider-item` tab pane, fetches
// that profile's gallery/spec images + optional interactive video from the
// cms.nuwall.co.nz proxy (direct browser calls to the Webflow API hit CORS)
// and builds the main + thumbnail Swiper carousels, plus a separate
// spec-image Swiper. Tab clicks swap which pane (and its sliders) is visible.
import Swiper from 'swiper/bundle';
import { cms } from '../utils/cms-client.js';

const PROFILE_PATH = '/profile-series/webflow/profile';
const IMAGE_FIELD = 'profile---gallery';
const SPECS_FIELD = 'profile---specifications';
const HERO_IMAGE_FIELD = 'hero---product-image';

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

  // Keyed by profile slug (= data-tab / data-tab-content / data-profile-slug,
  // all the same value across this markup) so activateTab() can look up the
  // hero image for whichever tab just became active.
  const heroImagesBySlug = new Map();
  const HERO_FADE_MS = 300; // matches .series-hero-bg-image img's opacity transition in site.scss
  let pendingHeroFade = null;

  // ── 1. Fetch & inject images ──
  async function loadProfileImages() {
    const fetchPromises = Array.from(sliderItems).map(async (item) => {
      const slug = item.getAttribute('data-profile-slug');
      if (!slug) return;

      try {
        const data = await cms.get(PROFILE_PATH, { params: { slug } });
        const profile = data.items?.[0];
        const fieldData = profile?.fieldData;
        if (!fieldData) return;

        const galleryImages = fieldData[IMAGE_FIELD] || [];
        const specImages = fieldData[SPECS_FIELD] || [];
        const videoUrl = fieldData['interactive-video-url'] || null;
        const heroImage = fieldData[HERO_IMAGE_FIELD] || null;
        if (heroImage && heroImage.url) {
          heroImagesBySlug.set(slug, { url: heroImage.url, alt: heroImage.alt || '' });
        }

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
  // Crossfades the hero image to the active tab's profile image, same
  // fade-out/swap/fade-in shape as profile-switcher.js's image swap —
  // except that's toggling opacity on pre-loaded stacked images, while this
  // is a single <img> whose src changes, so the new image is preloaded
  // before fading back in (otherwise the fade-in would start over
  // blank/undecoded pixels and read as a flash).
  function updateHeroImage(tabId) {
    const hero = heroImagesBySlug.get(tabId);
    if (!hero) return;
    const heroImg = document.querySelector('.series-hero-bg-image img');
    if (!heroImg) return;
    // Markup ships this hidden (display:none) so the wrong static image
    // never flashes before JS has a real one to show — revealed the moment
    // we actually have the correct image in place.
    const heroWrapper = heroImg.closest('.series-hero-bg-image');

    if (heroImg.src === hero.url) {
      if (heroWrapper) heroWrapper.style.display = '';
      return;
    }

    if (pendingHeroFade) {
      clearTimeout(pendingHeroFade);
      pendingHeroFade = null;
    }

    heroImg.classList.add('is-fading');

    pendingHeroFade = setTimeout(() => {
      pendingHeroFade = null;

      const reveal = () => {
        heroImg.src = hero.url;
        heroImg.alt = hero.alt;
        // Webflow's srcset/sizes point at the original static image's size
        // variants — the fetched hero has no equivalents, so drop them
        // rather than let a stale srcset candidate win over the new src.
        heroImg.removeAttribute('srcset');
        heroImg.removeAttribute('sizes');
        if (heroWrapper) heroWrapper.style.display = 'block';

        // Double rAF: on the very first reveal the wrapper is starting from
        // display:none, and a single rAF isn't reliably enough frames for
        // the browser to commit that display change as its own paint before
        // the opacity transition starts — it just snaps straight to
        // opacity:1 instead of fading. Two nested frames guarantee the
        // display:block commits first (matches the same trick in
        // finishes-tabs.js).
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            heroImg.classList.remove('is-fading');
          });
        });
      };

      const preload = new Image();
      preload.onload = reveal;
      preload.onerror = reveal;
      preload.src = hero.url;
    }, HERO_FADE_MS);
  }

  function activateTab(tabId) {
    tabItems.forEach((tab) => {
      tab.classList.toggle('is-active', tab.getAttribute('data-tab') === tabId);
    });

    updateHeroImage(tabId);

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
      el.style.display = isActive ? '' : 'none';
    });
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

  // A profile link on the profiles page (profile-switcher.js) tags its href
  // with ?profile=<slug> so this page knows which tab to land on — only
  // honoured if it actually matches a tab. Left in the URL (not stripped)
  // so the link stays shareable/refreshable at that profile.
  function profileTabIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const profileParam = params.get('profile');
    if (!profileParam) return null;
    const match = Array.from(tabItems).find((tab) => tab.getAttribute('data-tab') === profileParam);
    return match ? profileParam : null;
  }

  // ── Boot sequence ──
  loadProfileImages().then(() => {
    const urlTabId = profileTabIdFromURL();
    const firstTabId = tabItems[0]?.getAttribute('data-tab');
    const initialTabId = urlTabId || firstTabId;
    if (initialTabId) activateTab(initialTabId);
    initSwipers();
  });
}
