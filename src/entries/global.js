// GLOBAL ENTRY — loaded site-wide via Site Settings > Custom Code > Footer.
// Contains what every page needs: navigation, persona state, and shared forms.
import { onReady } from '../utils/ready.js';
import { initMegaMenu } from '../core/mega-menu.js';
import { initMobileMenu } from '../core/mobile-menu.js';
import { initNavScroll } from '../core/nav-scroll.js';
import { initPersonaSwitch } from '../core/persona-switch.js';
import { initSampleRequest } from '../core/sample-request.js';
import { initSiteForms } from '../core/site-forms.js';
import { initWorkingSpecLinks } from '../core/working-spec-links.js';

// Set the persona on the <html> element immediately, before paint, to avoid a
// flash of the wrong persona.
const persona = localStorage.getItem('persona') || 'professional';
document.documentElement.setAttribute('data-persona', persona);

onReady(() => {
  // Fade whole body in once the DOM is ready, to avoid a flash of unstyled content.
  requestAnimationFrame(() => {
    document.body.classList.add('is-loaded');
  });

  initMegaMenu();
  initMobileMenu();
  initNavScroll();
  initPersonaSwitch();
  initSampleRequest();
  initSiteForms();
  initWorkingSpecLinks();
});
