// INSPIRATION PAGE ENTRY — include only on the inspiration page via Page
// Settings > Custom Code.
//
// The Finsweet Attributes filter script itself is NOT bundled here — it's an
// async ES module that self-configures from the `fs-list` attribute on its
// own <script> tag, which is incompatible with this project's IIFE bundles.
// Keep it as its own tag in Page Settings > Custom Code, alongside this file:
//   <script async type="module"
//     src="https://cdn.jsdelivr.net/npm/@finsweet/attributes@2/attributes.js"
//     fs-list>
//   </script>
//
// The filters/grid styling lives in src/styles/site.scss (INSPIRATION PAGE
// section) and is served globally via site.min.css.
//
// Nothing else was pasted alongside the CSS, but the styles reference
// .filter-item.is-active / .is-visible and [data-filter-group].is-open,
// which Finsweet's List Filter doesn't toggle on its own — something has to
// set those classes. If that logic lives in a script that wasn't included,
// paste it here.
import { onReady } from '../utils/ready.js';

onReady(() => {
  // --- paste any inspiration-page-specific interaction logic here ---
});
