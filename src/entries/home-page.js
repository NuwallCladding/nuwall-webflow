// HOME PAGE ENTRY — include only on the home page via Page Settings > Custom Code.
import { onReady } from '../utils/ready.js';
import { initCsSwipers } from '../core/cs-swiper.js';

onReady(() => {
  initCsSwipers();
});
