// Multi-level mega menu (L2/L3/L4 hover interactions) with a slide-open panel.
export function initMegaMenu() {
  const ACTIVE = 'is-active';
  const HOVER_DELAY = 80;
  const FADE_MS = 200;
  const SLIDE_MS = 500;
  const SLIDE_EASE = 'cubic-bezier(0.39, 0.575, 0.565, 1)';
  const NAV_CLOSE_MS = 400;

  const SEL = {
    menu: '.com-mega-menu',
    linkL1: '.com-mega-menu__link-l1',
    panel: '.com-mega-menu--panel',
    panelContent: '.com-mega-menu--panel-content',
    colL2: '.com-mega-menu__col-l2',
    linkL2: '.com-mega-menu__link-l2',
    groupL3: '.com-mega-menu__group-l3',
    linkL3: '.com-mega-menu__link-l3',
    groupL4: '.com-mega-menu__group-l4',
    imageDetail: '.com-mega-menu__image-detail',
  };

  const menuRoot = document.querySelector(SEL.menu);
  const panel = document.querySelector(SEL.panel);
  const allL1Links = document.querySelectorAll(SEL.linkL1);
  if (!menuRoot || !panel) {
    console.warn('[MegaMenu] Missing elements');
    return;
  }

  const megaWrapper = document.querySelector('.com-mega-wrapper');
  const personaSwitch = panel.querySelector('.persona-switch');

  let hoverTimerL2 = null;
  let l2FadeTimer = null;
  let isAnimating = false;
  let savedScrollBg = null;

  function lockPageScroll() {
    if (document.body.hasAttribute('data-scroll-locked')) return;
    document.body.setAttribute('data-scroll-locked', '1');
    document.documentElement.style.overflowY = 'hidden';
  }

  function unlockPageScroll() {
    if (!document.body.hasAttribute('data-scroll-locked')) return;
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.style.overflowY = '';
  }

  // Swaps L1 text/underline/logo colours to stay readable against the open panel's background.
  function setMenuOpenColors() {
    menuRoot.querySelectorAll(`${SEL.linkL1} p`).forEach((p) => {
      const c = getComputedStyle(p).color;
      if (c.includes('0, 0, 0') || c.includes('42, 45, 43')) {
        p.style.color = 'var(--_brand-colors---brand-light-grey)';
      }
    });
    menuRoot.querySelectorAll(`${SEL.linkL1} .nav-link-active`).forEach((el) => {
      const c = getComputedStyle(el).backgroundColor;
      if (c.includes('0, 0, 0') || c.includes('42, 45, 43')) {
        el.style.backgroundColor = 'var(--_brand-colors---brand-light-grey)';
      }
    });
    document.querySelectorAll('.com-mega-wrapper [data-persona-trigger="switch"] p').forEach((p) => {
      p.style.color = 'var(--_brand-colors---brand-green)';
    });
    document.querySelectorAll('.com-mega-wrapper [data-persona-trigger="switch"] .underline').forEach((u) => {
      u.style.backgroundColor = 'var(--_brand-colors---brand-green)';
      u.style.borderColor = 'var(--_brand-colors---brand-green)';
    });
    document.querySelectorAll('.com-mega-wrapper .nav-brand_linkblock svg path').forEach((s) => {
      s.style.fill = 'var(--_brand-colors---brand-light-grey)';
    });
    if (megaWrapper && savedScrollBg === null) {
      savedScrollBg = megaWrapper.style.backgroundColor || '';
      megaWrapper.style.backgroundColor = '';
    }
  }

  function clearMenuOpenColors() {
    menuRoot.querySelectorAll(`${SEL.linkL1} p`).forEach((p) => {
      p.style.color = '';
    });
    menuRoot.querySelectorAll(`${SEL.linkL1} .nav-link-active`).forEach((el) => {
      el.style.backgroundColor = '';
    });
    document.querySelectorAll('.com-mega-wrapper [data-persona-trigger="switch"] p').forEach((p) => {
      p.style.color = '';
    });
    document.querySelectorAll('.com-mega-wrapper [data-persona-trigger="switch"] .underline').forEach((u) => {
      u.style.backgroundColor = '';
      u.style.borderColor = '';
    });
    document.querySelectorAll('.com-mega-wrapper .nav-brand_linkblock svg path').forEach((s) => {
      s.style.fill = '';
    });
    if (megaWrapper) megaWrapper.style.backgroundColor = savedScrollBg || '';
    savedScrollBg = null;
  }

  const hide = (el) => el.classList.remove(ACTIVE);
  const hideAll = (sel, scope) => (scope || panel).querySelectorAll(sel).forEach(hide);
  const clearHL = (sel, scope) => (scope || panel).querySelectorAll(sel).forEach((el) => el.classList.remove(ACTIVE));
  const l2Has = (content, target) => {
    const group = content.querySelector(`${SEL.groupL3}[data-group="${target}"]`);
    return group && group.children.length > 0;
  };

  function resetContent(content) {
    hideAll(SEL.groupL3, content);
    hideAll(SEL.groupL4, content);
    hideAll(SEL.imageDetail, panel);
    hideAll('.col-info-content[data-group]', content);
    clearHL(SEL.linkL2, content);
    clearHL(SEL.linkL3, content);
  }

  const getActive = () => panel.querySelector(`${SEL.panelContent}.${ACTIVE}`);

  function openPanelWithContent(panelId) {
    if (isAnimating) return;
    isAnimating = true;
    lockPageScroll();
    panel.style.opacity = '1';
    panel.style.visibility = 'visible';
    panel.style.pointerEvents = 'auto';
    panel.style.height = '0';
    panel.style.overflow = 'hidden';
    panel.classList.add(ACTIVE);
    setMenuOpenColors();
    requestAnimationFrame(() => {
      panel.style.transition = `height ${SLIDE_MS}ms ${SLIDE_EASE}`;
      panel.style.height = '700px';
    });
    setTimeout(() => {
      panel.style.overflow = 'hidden';
      if (personaSwitch) personaSwitch.style.opacity = '1';
      const target = panel.querySelector(`${SEL.panelContent}[data-panel="${panelId}"]`);
      if (target) {
        resetContent(target);
        target.classList.add(ACTIVE);
      }
      isAnimating = false;
    }, SLIDE_MS);
  }

  function closePanelAnimated() {
    if (isAnimating) return;
    isAnimating = true;
    clearTimeout(l2FadeTimer);
    clearTimeout(hoverTimerL2);
    const active = getActive();
    if (active) {
      resetContent(active);
      hide(active);
    }
    if (personaSwitch) personaSwitch.style.opacity = '0';
    setTimeout(() => {
      panel.style.overflow = 'hidden';
      panel.style.transition = `height ${SLIDE_MS}ms ${SLIDE_EASE}, padding ${SLIDE_MS}ms ${SLIDE_EASE}`;
      panel.style.height = '0';
      panel.style.paddingTop = '0';
      panel.style.paddingBottom = '0';
      setTimeout(() => {
        panel.style.opacity = '0';
        panel.style.visibility = 'hidden';
        panel.style.pointerEvents = 'none';
        panel.style.paddingTop = '';
        panel.style.paddingBottom = '';
        panel.style.transition = '';
        panel.classList.remove(ACTIVE);
        clearHL(SEL.linkL1, document);
        isAnimating = false;
        clearMenuOpenColors();
        unlockPageScroll();
      }, SLIDE_MS);
    }, FADE_MS);
  }

  function switchContent(panelId) {
    if (isAnimating) return;
    isAnimating = true;
    clearTimeout(l2FadeTimer);
    clearTimeout(hoverTimerL2);
    const active = getActive();
    const target = panel.querySelector(`${SEL.panelContent}[data-panel="${panelId}"]`);
    if (active) {
      resetContent(active);
      hide(active);
      setTimeout(() => {
        if (target) {
          resetContent(target);
          target.classList.add(ACTIVE);
        }
        isAnimating = false;
      }, FADE_MS);
    } else {
      if (target) {
        resetContent(target);
        target.classList.add(ACTIVE);
      }
      isAnimating = false;
    }
  }

  function navigateWithClose(href) {
    const active = getActive();
    if (active) {
      resetContent(active);
      hide(active);
    }
    if (personaSwitch) personaSwitch.style.opacity = '0';
    panel.style.overflow = 'hidden';
    panel.querySelectorAll('.col-info-content[data-group]').forEach((el) => el.classList.remove(ACTIVE));
    panel.style.transition = `height 300ms ${SLIDE_EASE}, padding 300ms ${SLIDE_EASE}`;
    panel.style.height = '0';
    panel.style.paddingTop = '0';
    panel.style.paddingBottom = '0';
    setTimeout(() => {
      window.location.href = href;
    }, NAV_CLOSE_MS);
  }

  try {
    panel.style.height = '0';
    panel.style.overflow = 'hidden';
    const activeNav = document.body.getAttribute('data-active-nav');
    if (activeNav) {
      const activeL1 = document.querySelector(`${SEL.linkL1}[data-nav-id="${activeNav}"]`);
      if (activeL1) activeL1.classList.add('is-current');
    }
    panel.querySelectorAll('.col-info-content[data-group]').forEach((el) => el.classList.remove(ACTIVE));
    if (personaSwitch) {
      personaSwitch.style.opacity = '0';
      personaSwitch.style.transition = `opacity ${FADE_MS}ms ease`;
    }
  } catch (e) {
    console.error('[MegaMenu Init]', e);
  }

  try {
    allL1Links.forEach((link) => {
      link.addEventListener('click', function (e) {
        const panelId = this.getAttribute('data-panel');
        if (isAnimating) {
          e.preventDefault();
          return;
        }
        if (!panelId) {
          if (panel.classList.contains(ACTIVE)) {
            e.preventDefault();
            const childLink = this.querySelector('a[href]');
            const href = childLink ? childLink.getAttribute('href') : null;
            navigateWithClose(href || window.location.href);
          }
          return;
        }
        e.preventDefault();
        const panelOpen = panel.classList.contains(ACTIVE);
        const thisActive = this.classList.contains(ACTIVE);
        if (panelOpen && thisActive) {
          closePanelAnimated();
        } else if (panelOpen && !thisActive) {
          clearHL(SEL.linkL1, document);
          this.classList.add(ACTIVE);
          switchContent(panelId);
        } else {
          clearHL(SEL.linkL1, document);
          this.classList.add(ACTIVE);
          openPanelWithContent(panelId);
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!panel.classList.contains(ACTIVE)) return;
      if (e.target.closest('.inactive-window-cover')) {
        closePanelAnimated();
        return;
      }
      if (!menuRoot.contains(e.target)) closePanelAnimated();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanelAnimated();
    });
  } catch (e) {
    console.error('[MegaMenu L1]', e);
  }

  try {
    panel.querySelectorAll(SEL.linkL2).forEach((link) => {
      link.addEventListener('mouseenter', function () {
        const self = this;
        clearTimeout(hoverTimerL2);
        clearTimeout(l2FadeTimer);
        hoverTimerL2 = setTimeout(() => {
          const target = self.getAttribute('data-target');
          if (!target) return;
          const content = self.closest(SEL.panelContent);
          if (!content) return;
          const hasVisibleContent =
            content.querySelector(`${SEL.groupL3}.${ACTIVE}`) || panel.querySelector(`${SEL.imageDetail}.${ACTIVE}`);
          clearHL(SEL.linkL2, content);
          self.classList.add(ACTIVE);
          hideAll(SEL.groupL3, content);
          hideAll(SEL.groupL4, content);
          hideAll(SEL.imageDetail, panel);
          hideAll('.col-info-content[data-group]', content);
          clearHL(SEL.linkL3, content);
          const delay = hasVisibleContent ? FADE_MS : 0;
          l2FadeTimer = setTimeout(() => {
            const match = content.querySelector(`${SEL.groupL3}[data-group="${target}"]`);
            if (match) match.classList.add(ACTIVE);
            if (!l2Has(content, target)) {
              const image = panel.querySelector(`${SEL.imageDetail}[data-group="${target}"]`);
              if (image) image.classList.add(ACTIVE);
            }
            const info = content.querySelector(`.col-info-content[data-group="${target}"]`);
            if (info) info.classList.add(ACTIVE);
          }, delay);
        }, HOVER_DELAY);
      });
    });

    panel.querySelectorAll(SEL.linkL3).forEach((link) => {
      link.addEventListener('mouseenter', function () {
        const target = this.getAttribute('data-target');
        if (!target) return;
        const content = this.closest(SEL.panelContent);
        if (!content) return;
        clearHL(SEL.linkL3, content);
        this.classList.add(ACTIVE);
        hideAll(SEL.groupL4, content);
        const match = content.querySelector(`${SEL.groupL4}[data-group="${target}"]`);
        if (match) match.classList.add(ACTIVE);
      });
    });

    panel.querySelectorAll('.com-mega-link-l3-trigger').forEach((trigger) => {
      trigger.addEventListener('click', function (e) {
        const l3Link = this.closest(SEL.linkL3);
        if (!l3Link) return;
        const target = l3Link.getAttribute('data-target');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        const content = l3Link.closest(SEL.panelContent);
        const nestedL4 = l3Link.querySelector(`${SEL.groupL4}[data-group="${target}"]`);
        if (!nestedL4) return;
        const isOpen = l3Link.classList.contains(ACTIVE);
        if (isOpen) {
          l3Link.classList.remove(ACTIVE);
          nestedL4.classList.remove(ACTIVE);
        } else {
          if (content) {
            content.querySelectorAll(`${SEL.linkL3}.${ACTIVE}`).forEach((other) => {
              if (other !== l3Link) {
                other.classList.remove(ACTIVE);
                const otherL4 = other.querySelector(SEL.groupL4);
                if (otherL4) otherL4.classList.remove(ACTIVE);
              }
            });
          }
          l3Link.classList.add(ACTIVE);
          nestedL4.classList.add(ACTIVE);
        }
      });
    });

    panel.querySelectorAll(SEL.colL2).forEach((col) => {
      col.addEventListener('mouseleave', function (e) {
        const content = this.closest(SEL.panelContent);
        if (!content) return;
        const related = e.relatedTarget;
        if (related && (content.contains(related) || related.closest(SEL.imageDetail))) return;
        clearTimeout(hoverTimerL2);
        clearTimeout(l2FadeTimer);
        hideAll(SEL.groupL3, content);
        hideAll(SEL.groupL4, content);
        hideAll(SEL.imageDetail, panel);
        hideAll('.col-info-content[data-group]', content);
        clearHL(SEL.linkL2, content);
        clearHL(SEL.linkL3, content);
      });
    });
  } catch (e) {
    console.error('[MegaMenu L2L3]', e);
  }

  try {
    panel.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || href === '') return;
        if (this.classList.contains('com-mega-menu__link-l3') && this.querySelector(SEL.groupL4)) return;
        e.preventDefault();
        navigateWithClose(href);
      });
    });
  } catch (e) {
    console.error('[MegaMenu Nav]', e);
  }
}
