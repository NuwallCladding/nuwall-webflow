// DRAWINGS VIEWER ENTRY — include only on the technical drawings page via
// Page Settings > Custom Code.
import { onReady } from '../utils/ready.js';
import { initDrawingsViewer } from '../core/drawings-viewer.js';

onReady(() => {
  initDrawingsViewer();
});
