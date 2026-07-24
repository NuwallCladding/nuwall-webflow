// RESOURCES PAGE ENTRY — include only on the resources library page via
// Page Settings > Custom Code.
import { onReady } from '../utils/ready.js';
import { initResourceViewer } from '../core/resource-viewer.js';

onReady(() => {
  initResourceViewer();
});
