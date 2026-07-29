// Series prev/next navigation: fetches the full profile-series collection
// via the CMS proxy Worker, resolves the current page's slug from the URL,
// and populates the prev/next series links (plus the standalone "up next"
// promo image) with that neighbour's data.
const WORKER_URL = 'https://floral-cake-11c6.lezliem.workers.dev';
const SERIES_COLLECTION_ID = '69e1bbe774273449665561ff';
const SERIES_BASE_PATH = '/series/';

export function initSeriesNavigation() {
  const prevBtn = document.querySelector('.prev-series-link-wrapper');
  const nextBtn = document.querySelector('.next-series-link-wrapper');
  if (!prevBtn && !nextBtn) return;

  fetch(WORKER_URL + '?collectionId=' + SERIES_COLLECTION_ID)
    .then((res) => res.json())
    .then((data) => {
      const items = data.items;
      const slugs = items.map((i) => i.fieldData.slug);

      const currentSlug = window.location.pathname.replace(SERIES_BASE_PATH, '').replace(/\/$/, '');
      const currentIndex = slugs.indexOf(currentSlug);
      if (currentIndex === -1) return;

      const prevItem = items[(currentIndex - 1 + items.length) % items.length];
      const nextItem = items[(currentIndex + 1) % items.length];

      if (prevBtn && prevItem) {
        prevBtn.href = SERIES_BASE_PATH + prevItem.fieldData.slug;

        const prevName = prevBtn.querySelector('.prev-series-name');
        if (prevName) prevName.textContent = prevItem.fieldData.name;

        const prevImg = prevBtn.querySelector('.next-series-image-wrapper .image--cover');
        if (prevImg && prevItem.fieldData['hero---product-image']) {
          prevImg.src = prevItem.fieldData['hero---product-image'].url;
          prevImg.alt = prevItem.fieldData.name || '';
        }
      }

      if (nextBtn && nextItem) {
        nextBtn.href = SERIES_BASE_PATH + nextItem.fieldData.slug;

        const nextName = nextBtn.querySelector('.next-series-name');
        if (nextName) nextName.textContent = nextItem.fieldData.name;

        const nextImg = nextBtn.querySelector('.next-series-image-wrapper .image--cover');
        if (nextImg && nextItem.fieldData['hero---product-image']) {
          nextImg.src = nextItem.fieldData['hero---product-image'].url;
          nextImg.alt = nextItem.fieldData.name || '';
        }
      }

      // Standalone "up next" promo image (separate element on the page).
      const nextSeriesWrapper = document.querySelector('.next-series-image-wrapper');
      if (nextSeriesWrapper && nextItem?.fieldData['series-featured']) {
        nextSeriesWrapper.href = SERIES_BASE_PATH + nextItem.fieldData.slug;
        nextSeriesWrapper.innerHTML = '';
        const img = document.createElement('img');
        img.src = nextItem.fieldData['series-featured'].url;
        img.alt = nextItem.fieldData.name || '';
        img.className = 'image--cover';
        nextSeriesWrapper.appendChild(img);
      }

      const nextSeriesName = document.querySelector('.next-main-wrapper h5');
      if (nextSeriesName && nextItem) {
        nextSeriesName.textContent = nextItem.fieldData.name;
      }
    })
    .catch((err) => {
      console.error('[series] navigation fetch failed:', err);
    });
}
