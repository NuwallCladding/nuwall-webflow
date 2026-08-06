// FINISHES PAGE ENTRY — include on the finishes page, and on any other page
// that uses the generic tabs component, via Page Settings > Custom Code.
import { onReady } from '../utils/ready.js';
import { initFinishesTabs } from '../core/finishes-tabs.js';

onReady(() => {
  initFinishesTabs();
});
