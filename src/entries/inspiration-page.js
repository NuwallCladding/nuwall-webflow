// INSPIRATION PAGE ENTRY — include only on the inspiration page via Page
// Settings > Custom Code.
//
// The filters/grid styling lives in src/styles/site.scss (INSPIRATION PAGE
// section) and is served globally via site.min.css.
import { onReady } from '../utils/ready.js';
import { initCsSwipers } from '../core/cs-swiper.js';
import { initInspirationFilters } from '../core/inspiration-filters.js';

onReady(() => {
  initCsSwipers();
  initInspirationFilters();
});
