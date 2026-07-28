// PROFILES PAGE ENTRY — include only on the profiles page via Page Settings >
// Custom Code.
import { onReady } from '../utils/ready.js';
import { initProfileSwitcher } from '../core/profile-switcher.js';
import { initGsapLineReveal } from '../core/gsap-line-reveal.js';

onReady(() => {
  initProfileSwitcher();
  initGsapLineReveal();
});
