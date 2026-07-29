// SERIES PAGE ENTRY — include only on the profile series template page via
// Page Settings > Custom Code.
import { onReady } from '../utils/ready.js';
import { initCsSwipers } from '../core/cs-swiper.js';
import { initResourceViewer } from '../core/resource-viewer.js';
import { initSeriesProfileSlider } from '../core/series-profile-slider.js';
import { initSeriesNavigation } from '../core/series-navigation.js';
import { initColourFinishViewer } from '../core/colour-finish-viewer.js';
import { initCursorFollow } from '../core/cursor-follow.js';

onReady(() => {
  initSeriesProfileSlider();
  initSeriesNavigation();
  initColourFinishViewer();
  initCsSwipers();
  initCursorFollow();
  // Filters to this page's series via a `data-profile-series` attribute on
  // `.resources-wrapper` (see resource-viewer.js) — no-ops if that markup
  // isn't present on the page.
  initResourceViewer();
});
