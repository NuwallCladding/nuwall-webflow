// PERSONA PRE-PAINT ENTRY — include via Site Settings > Custom Code > Head,
// as a plain (no defer/async) <script src>, placed ABOVE the site.css link.
//
// global.js also reads this same localStorage value, but global.js is loaded
// from the Footer (see src/entries/global.js) — by the time a footer script
// runs, the browser has already parsed and can paint the whole body, so
// setting the attribute there is too late to stop a flash of the wrong
// persona. This file is the actual fix: it's tiny and dependency-free so it's
// safe to run as a blocking script before any body content exists to paint.
const persona = localStorage.getItem('persona') || 'professional';
document.documentElement.setAttribute('data-persona', persona);
