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

// Hero background images, keyed by profile slug — hardcoded rather than
// fetched so the hero can render immediately on load instead of waiting on
// the cms.nuwall.co.nz → Webflow round trip the rest of the profile data
// (gallery/specs/video) still needs.
const HERO_IMAGES = [
  { slug: 'ss400', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b509703e682c57900a2_SS_400.001_3000x2000px.webp' },
  { slug: 'ss-random', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b5eb19262e6732fee79_SS_Random.001_3000x2000px.webp' },
  { slug: 'mono-random', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b6781e06df31ab27acf_Mono_Random.001_3000x2000px.webp' },
  { slug: 'e-random', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b733be5eaaccb3dd192_E_Random.001_2000x2000px.webp' },
  { slug: 'e-70-130', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b7c0acae936c0dcf64e_E_70-130.001_3000x2000px.webp' },
  { slug: 'e-200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b833be5eaaccb3dd85b_E_200.001_3000x2000px.webp' },
  { slug: 'e-100', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b8b692671e90ffba193_E_100.001_3000x2000px.webp' },
  { slug: 'louvre-150', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b91128fb0c4eaca6528_Louvre_150.001_3000x2000px.webp' },
  { slug: 'louvre-120', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b967f08f9f5fbdc1e71_Louvre_120.001_3000x2000px.webp' },
  { slug: 'louvre-60', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573b9ca5d669f3e1107d3c_Louvre_60.001_3000x2000px.webp' },
  { slug: 'ss200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573ba2b4a42289ef34ecb0_SS_200.001_3000x2000px.webp' },
  { slug: 'shiplap-150', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573ba83484344c65f0e881_Shiplap_150.001_3000x2000px.webp' },
  { slug: 'classique', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bb1973f330684236464_Classique_136.001_3000x2000px.webp' },
  { slug: 'v-130', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bb983a3bb2c95e30a3d_V_130.001_3000x2000px.webp' },
  { slug: 'n-200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bc0ad567f21e0b34afa_N_200.001_3000x2000px.webp' },
  { slug: 'zz200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bc761f12e9fdd525ee4_ZZ_200.001_3000x2000px.webp' },
  { slug: 'ripple-200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bd381e06df31ab2ad2c_Ripple_200.001_3000x2000pxx.webp' },
  { slug: 'ripple-150', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bdb3be5eaaccb3e0a45_Ripple_150.001_3000x2000px.webp' },
  { slug: 'barcode', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573be602674aac1dacc4d0_Barcode_200.001_3000x2000px.webp' },
  { slug: 'aero-200s', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bed0acae936c0dd2c7c_Aero_200S.001_3000x2000px.webp' },
  { slug: 'aero-200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573bf59225b88585539262_Aero_200.001_3000x2000px.webp' },
  { slug: 'aero-115', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573c0005a7994eb5b305d5_Aero_115.001_3000x2000px.webp' },
  { slug: 'mono-200', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573c0d02674aac1dacd25e_Mono_200.001_3000x2000px.webp' },
  { slug: 'aero-70', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573c18b4a42289ef353b0b_Aero_70.001_3000x2000px.webp' },
  { slug: 'mono-400', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573c20136987eae98a1b45_Mono_400.001_3000x2000px.webp' },
  { slug: 'mono-250', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573c2705a7994eb5b3300a_Mono_250.001_3000x2000px.webp' },
  { slug: 'mono-100', heroBg: 'https://cdn.prod.website-files.com/6a443bd52368da66b3b96414/6a573c2e5653459f9f512f23_Mono_100.001_3000x2000px.webp' },
];

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
  // hero image for whichever tab just became active. Seeded synchronously
  // from HERO_IMAGES — no fetch to wait on.
  const heroImagesBySlug = new Map(HERO_IMAGES.map((h) => [h.slug, { url: h.heroBg, alt: '' }]));
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
  // Activate the initial tab right away — hero image + tab/pane visibility
  // only need the static HERO_IMAGES data and markup already on the page,
  // so they shouldn't wait on the profile fetch. Swiper init still needs
  // loadProfileImages() to have populated the slides first.
  const urlTabId = profileTabIdFromURL();
  const firstTabId = tabItems[0]?.getAttribute('data-tab');
  const initialTabId = urlTabId || firstTabId;
  if (initialTabId) activateTab(initialTabId);

  loadProfileImages().then(() => {
    initSwipers();
  });
}
