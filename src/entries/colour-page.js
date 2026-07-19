// COLOUR PAGE ENTRY — include on the colour page, and on any other page that
// uses the colour palette / environment tabs component, via Page Settings >
// Custom Code.
import { onReady } from '../utils/ready.js';
import { initColourTabs } from '../core/colour-tabs.js';

onReady(() => {
  initColourTabs();
});
