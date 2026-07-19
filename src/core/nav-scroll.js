// Nav hide-on-scroll-down / show-on-scroll-up, background colour swap once
// scrolled past the top, and keeping the nav pinned open while a menu panel is open.
export function initNavScroll() {
  const navWrapper = document.querySelector('.nav-wrapper-global');
  if (!navWrapper) return;

  const scrollThreshold = 2;
  const navHeight = '96px';
  const viewportHeight = window.innerHeight;
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
  let scrollBgColor = null;

  // Picks the scrolled-state background as the opposite of whatever the L1 links render in,
  // so nav text stays legible against it.
  const navLink = document.querySelector('.com-mega-menu__link-l1 .nav--link');
  if (navLink) {
    const linkColor = getComputedStyle(navLink).color;
    if (linkColor === brandBlack) scrollBgColor = 'var(--_brand-colors---brand-light-grey)';
    else if (linkColor === brandLightGrey) scrollBgColor = 'var(--_brand-colors---brand-black)';
  }
  if (!scrollBgColor) scrollBgColor = 'var(--_brand-colors---brand-light-grey)';

  if (megaWrapper) megaWrapper.style.transition = 'background-color 600ms';
  if (mobileBar) mobileBar.style.transition = 'background-color 600ms';

  const megaPanel = document.querySelector('.com-mega-menu--panel');
  const mobilePanel = document.querySelector('.com-mobile-menu--panel');
  const panels = [megaPanel, mobilePanel].filter(Boolean);

  const anyOpen = () => panels.some((p) => p.classList.contains('is-active'));

  function syncPanelState() {
    const open = anyOpen();
    navWrapper.classList.toggle('is-panel-open', open);
    if (open) navWrapper.style.transform = 'none';
  }

  // Keeps the nav pinned open the instant a menu panel opens/closes, without waiting for scroll.
  if (panels.length && window.MutationObserver) {
    const observer = new MutationObserver(syncPanelState);
    panels.forEach((p) => observer.observe(p, { attributes: true, attributeFilter: ['class'] }));
  }

  window.addEventListener('scroll', () => {
    if (anyOpen()) {
      navWrapper.classList.add('is-panel-open');
      navWrapper.style.transform = 'none';
      lastScroll = window.pageYOffset;
      return;
    }
    navWrapper.classList.remove('is-panel-open');

    const currentScroll = window.pageYOffset;
    if (megaWrapper) megaWrapper.style.backgroundColor = currentScroll === 0 ? '' : scrollBgColor;
    if (mobileBar) mobileBar.style.backgroundColor = currentScroll === 0 ? '' : scrollBgColor;

    if (currentScroll === 0) {
      navWrapper.style.transform = 'none';
      lastScroll = currentScroll;
      return;
    }
    if (currentScroll <= viewportHeight * 0.3) {
      navWrapper.style.transform = 'none';
      lastScroll = currentScroll;
      return;
    }

    const delta = currentScroll - lastScroll;
    if (delta > scrollThreshold) navWrapper.style.transform = `translateY(-${navHeight})`;
    else if (delta < -scrollThreshold) navWrapper.style.transform = 'none';
    lastScroll = currentScroll;
  });
}
