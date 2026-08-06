// ENVIRONMENTS PAGE ENTRY — include only on the environments template page via
// Page Settings > Custom Code.
import { onReady } from '../utils/ready.js';
import { initCsSwipers } from '../core/cs-swiper.js';
import { initCursorFollow } from '../core/cursor-follow.js';

onReady(() => {
  initCsSwipers();
  initCursorFollow();
});
