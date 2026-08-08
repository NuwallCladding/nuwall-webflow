// Nav hide-on-scroll-down / show-on-scroll-up, background colour swap once
// scrolled past the top, and keeping the nav pinned open while a menu panel is open.
export function initNavScroll() {
  const navWrapper = document.querySelector('.nav-wrapper-global');
  if (!navWrapper) return;

  const scrollThreshold = 2;
  const navHeight = '96px';
  const megaWrapper = document.querySelector('.com-mega-wrapper');
  const mobileBar = document.querySelector('.com-mobile-menu--bar');
  let lastScroll = 0;

  // Reads a CSS custom property's resolved colour by applying it to a throwaway element.
  function resolveColor(cssVar) {
    const probe = document.createElement('div');
    probe.style.color = `var(${cssVar})`;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return color;
  }

  const brandBlack = resolveColor('--_brand-colors---brand-black');
  const brandLightGrey = resolveColor('--_brand-colors---brand-light-grey');

  // Given a rendered colour, returns the opposite brand colour (as a CSS var string)
  // so nav content stays legible against the scrolled-state background.
  function oppositeBg(renderedColor) {
    if (renderedColor === brandBlack) return 'var(--_brand-colors---brand-light-grey)';
    if (renderedColor === brandLightGrey) return 'var(--_brand-colors---brand-black)';
    return null;
  }

  // Mega wrapper: opposite of the L1 link colour.
  let megaBgColor = null;
  const navLink = document.querySelector('.com-mega-menu__link-l1 .nav--link');
  if (navLink) megaBgColor = oppositeBg(getComputedStyle(navLink).color);
  if (!megaBgColor) megaBgColor = 'var(--_brand-colors---brand-light-grey)';

  // Mobile bar: opposite of the brand SVG's path fill.
  let mobileBgColor = null;
  const brandPath = document.querySelector('.head--nav--brand.mobile path');
  if (brandPath) mobileBgColor = oppositeBg(getComputedStyle(brandPath).fill);
  if (!mobileBgColor) mobileBgColor = 'var(--_brand-colors---brand-light-grey)';

  if (megaWrapper) megaWrapper.style.transition = 'background-color 600ms';
  if (mobileBar) mobileBar.style.transition = 'background-color 600ms';

  const megaPanel = document.querySelector('.com-mega-menu--panel');
  const mobilePanel = document.querySelector('.com-mobile-menu--panel');
  const panels = [megaPanel, mobilePanel].filter(Boolean);

  const anyOpen = () => panels.some((p) => p.classList.contains('is-active'));

  function syncPanelState() {
    const open = anyOpen();
    navWrapper.classList.toggle('is-panel-open', open);
    // Always clear the inline hide-transform so the nav is visible whenever a
    // panel opens *or* closes; the scroll handler takes over again on next scroll.
    navWrapper.style.transform = 'none';
  }

  // Keeps the nav pinned open the instant a menu panel opens/closes, without waiting for scroll.
  if (panels.length && window.MutationObserver) {
    const observer = new MutationObserver(syncPanelState);
    panels.forEach((p) => observer.observe(p, { attributes: true, attributeFilter: ['class'] }));
  }

  function handleScroll() {
    if (anyOpen()) {
      navWrapper.classList.add('is-panel-open');
      navWrapper.style.transform = 'none';
      lastScroll = window.pageYOffset;
      return;
    }
    navWrapper.classList.remove('is-panel-open');

    const currentScroll = window.pageYOffset;
    if (megaWrapper) megaWrapper.style.backgroundColor = currentScroll === 0 ? '' : megaBgColor;
    if (mobileBar) mobileBar.style.backgroundColor = currentScroll === 0 ? '' : mobileBgColor;

    if (currentScroll === 0) {
      navWrapper.style.transform = 'none';
      lastScroll = currentScroll;
      return;
    }
    // Read viewport height live so resize / orientation changes are respected.
    if (currentScroll <= window.innerHeight * 0.3) {
      navWrapper.style.transform = 'none';
      lastScroll = currentScroll;
      return;
    }

    const delta = currentScroll - lastScroll;
    if (delta > scrollThreshold) navWrapper.style.transform = `translateY(-${navHeight})`;
    else if (delta < -scrollThreshold) navWrapper.style.transform = 'none';
    lastScroll = currentScroll;
  }

  // Throttle to one run per frame, and mark the listener passive since we never preventDefault.
  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
}