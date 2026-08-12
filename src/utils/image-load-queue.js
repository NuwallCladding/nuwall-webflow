// Shared image-load queue: capped concurrency + a minimum gap between
// request starts + backed-off retries for any request the CMS still
// rate-limits. Used anywhere a page can fire off a burst of image loads at
// once (colour swatches, drawing thumbnails) that would otherwise 429 the
// CMS proxy. State is module-level/global on purpose — every caller shares
// one budget, since only one page's bundle runs at a time anyway.
const MAX_CONCURRENT_IMAGE_LOADS = 4;
const MIN_LOAD_START_GAP_MS = 90;
const LOAD_RETRY_BACKOFF_MS = 800;
const LOAD_MAX_RETRIES = 2;

let activeImageLoads = 0;
let lastLoadStartAt = 0;
let queueTimer = null;
const imageLoadQueue = [];

function pumpImageQueue() {
  if (queueTimer) return;

  while (activeImageLoads < MAX_CONCURRENT_IMAGE_LOADS && imageLoadQueue.length) {
    const wait = MIN_LOAD_START_GAP_MS - (Date.now() - lastLoadStartAt);
    if (wait > 0) {
      queueTimer = setTimeout(() => {
        queueTimer = null;
        pumpImageQueue();
      }, wait);
      return;
    }

    const task = imageLoadQueue.shift();
    activeImageLoads++;
    lastLoadStartAt = Date.now();
    task();
  }
}

// Queues `src` to load through a shared `<img>` (created immediately and
// returned so callers can cache/inspect it before it's actually started),
// with capped concurrency and retry-with-backoff on failure (e.g. a 429).
export function queueImageLoad(src, { onload, onerror } = {}) {
  const img = new Image();
  if (!src) return img;

  function attempt(retriesLeft) {
    img.onload = () => {
      activeImageLoads--;
      onload?.(img);
      pumpImageQueue();
    };
    img.onerror = () => {
      activeImageLoads--;
      if (retriesLeft > 0) {
        setTimeout(() => {
          imageLoadQueue.push(() => attempt(retriesLeft - 1));
          pumpImageQueue();
        }, LOAD_RETRY_BACKOFF_MS);
      } else {
        onerror?.(img);
      }
      pumpImageQueue();
    };
    img.src = src;
  }

  imageLoadQueue.push(() => attempt(LOAD_MAX_RETRIES));
  pumpImageQueue();
  return img;
}
