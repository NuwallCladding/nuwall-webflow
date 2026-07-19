// Mobile off-canvas menu: multi-level drill-down, accordions, scroll lock.
export function initMobileMenu() {
  const ACTIVE = 'is-active';
  const MOBILE_FADE = 300;
  let levelHistory = [];

  const mobileMenu = document.querySelector('.com-mobile-menu');
  const mobileTrigger = document.querySelector('.com-mobile-menu--trigger');
  const mobilePanel = document.querySelector('.com-mobile-menu--panel');
  const mobileLevels = document.querySelectorAll('.com-mobile-menu--level');
  const mobileBackBtns = document.querySelectorAll('.com-mobile-menu--back');
  if (!mobileMenu || !mobilePanel) {
    console.warn('[MobileMenu] Missing elements');
    return;
  }

  function setMobileBarColors() {
    document.querySelectorAll('.com-mobile-menu--bar .nav-brand_linkblock svg path').forEach((p) => {
      p.style.fill = 'var(--_brand-colors---brand-light-grey)';
    });
    document.querySelectorAll('.com-mobile-menu--trigger h5').forEach((h) => {
      h.style.color = 'var(--_brand-colors---brand-light-grey)';
    });
  }

  function clearMobileBarColors() {
    document.querySelectorAll('.com-mobile-menu--bar .nav-brand_linkblock svg path').forEach((p) => {
      p.style.fill = '';
    });
    document.querySelectorAll('.com-mobile-menu--trigger h5').forEach((h) => {
      h.style.color = '';
    });
  }

  function lockScroll() {
    if (document.body.hasAttribute('data-scroll-locked')) return;
    document.body.setAttribute('data-scroll-locked', '1');
    document.documentElement.style.overflowY = 'hidden';
  }

  function unlockScroll() {
    if (!document.body.hasAttribute('data-scroll-locked')) return;
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.style.overflowY = '';
  }

  function hideAllLevels() {
    mobileLevels.forEach((l) => {
      l.classList.remove(ACTIVE);
      l.style.display = 'none';
      l.style.opacity = '0';
    });
  }

  function showLevel(level) {
    level.style.display = 'block';
    requestAnimationFrame(() => {
      level.style.opacity = '1';
      level.classList.add(ACTIVE);
    });
  }

  function fadeToLevel(targetLevel) {
    const currentLevel = mobilePanel.querySelector(`.com-mobile-menu--level.${ACTIVE}`);
    if (currentLevel) {
      currentLevel.style.opacity = '0';
      setTimeout(() => {
        currentLevel.classList.remove(ACTIVE);
        currentLevel.style.display = 'none';
        showLevel(targetLevel);
      }, MOBILE_FADE);
    } else {
      showLevel(targetLevel);
    }
  }

  function collapseAllAccordions(container) {
    container.querySelectorAll('.com-mobile-menu--trigger-l2.is-expanded').forEach((trigger) => {
      trigger.classList.remove('is-expanded');
      const arrow = trigger.querySelector('.com-mobile-menu--accordion-arrow');
      if (arrow) {
        arrow.style.transition = '';
        arrow.style.transform = '';
      }
      const child = trigger.nextElementSibling;
      if (child) {
        child.style.display = 'none';
        child.style.height = '';
        child.style.transition = '';
      }
    });
  }

  function expandAccordion(trigger) {
    const child = trigger.nextElementSibling;
    if (!child) return;
    trigger.classList.add('is-expanded');
    const arrow = trigger.querySelector('.com-mobile-menu--accordion-arrow');
    if (arrow) {
      arrow.style.transition = 'transform 300ms ease';
      arrow.style.transform = 'rotate(270deg)';
    }
    child.style.display = 'block';
    child.style.height = '0';
    const targetHeight = child.scrollHeight;
    requestAnimationFrame(() => {
      child.style.transition = 'height 300ms ease';
      child.style.height = `${targetHeight}px`;
      setTimeout(() => {
        child.style.height = 'auto';
        child.style.transition = '';
      }, 310);
    });
  }

  function collapseAccordion(trigger) {
    const child = trigger.nextElementSibling;
    if (!child) return;
    trigger.classList.remove('is-expanded');
    const arrow = trigger.querySelector('.com-mobile-menu--accordion-arrow');
    if (arrow) {
      arrow.style.transition = 'transform 300ms ease';
      arrow.style.transform = '';
    }
    collapseAllAccordions(child);
    child.style.height = `${child.scrollHeight}px`;
    requestAnimationFrame(() => {
      child.style.transition = 'height 300ms ease';
      child.style.height = '0';
      setTimeout(() => {
        child.style.display = 'none';
        child.style.height = '';
        child.style.transition = '';
      }, 310);
    });
  }

  function openMobileMenu() {
    lockScroll();
    setMobileBarColors();
    levelHistory = [];
    hideAllLevels();
    mobilePanel.style.display = '';
    mobilePanel.style.height = '0';
    mobilePanel.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      mobilePanel.style.transition = 'height 400ms cubic-bezier(0.39, 0.575, 0.565, 1)';
      mobilePanel.style.height = '100vh';
      mobilePanel.classList.add(ACTIVE);
    });
    setTimeout(() => {
      mobilePanel.style.overflow = 'auto';
      const l1 = mobilePanel.querySelector('.com-mobile-menu--level[data-level="1"]');
      if (l1) showLevel(l1);
    }, 600);
    if (mobileTrigger) mobileTrigger.classList.add('is-open');
  }

  function closeMobileMenu() {
    const activeLevel = mobilePanel.querySelector(`.com-mobile-menu--level.${ACTIVE}`);
    if (activeLevel) activeLevel.style.opacity = '0';
    setTimeout(() => {
      hideAllLevels();
      mobilePanel.style.overflow = 'hidden';
      mobilePanel.style.transition =
        'height 400ms cubic-bezier(0.39, 0.575, 0.565, 1), padding 400ms cubic-bezier(0.39, 0.575, 0.565, 1)';
      mobilePanel.style.height = '0';
      mobilePanel.style.paddingTop = '0';
      mobilePanel.style.paddingBottom = '0';
      setTimeout(() => {
        mobilePanel.style.display = 'none';
        mobilePanel.style.paddingTop = '';
        mobilePanel.style.paddingBottom = '';
        mobilePanel.classList.remove(ACTIVE);
        levelHistory = [];
        unlockScroll();
        clearMobileBarColors();
      }, 600);
    }, MOBILE_FADE);
    if (mobileTrigger) mobileTrigger.classList.remove('is-open');
  }

  try {
    mobilePanel.style.display = 'none';
    mobilePanel.querySelectorAll('.com-mobile-menu--children').forEach((c) => {
      c.style.display = 'none';
      c.style.height = '';
      c.style.transition = '';
    });
    mobilePanel.querySelectorAll('.com-mobile-menu--trigger-l2').forEach((t) => {
      t.classList.remove('is-expanded');
      const arrow = t.querySelector('.com-mobile-menu--accordion-arrow');
      if (arrow) arrow.style.transform = '';
    });
    if (window.innerWidth < 1200) {
      mobileMenu.style.display = 'flex';
      mobileMenu.style.flexDirection = 'column';
    }
  } catch (e) {
    console.error('[MobileMenu Init]', e);
  }

  try {
    mobilePanel.querySelectorAll('.com-mobile-menu--link[data-panel]').forEach((link) => {
      link.addEventListener('click', function () {
        const targetLevel = mobilePanel.querySelector(
          `.com-mobile-menu--level[data-panel="${this.getAttribute('data-panel')}"]`
        );
        if (!targetLevel) return;
        const currentLevel = mobilePanel.querySelector(`.com-mobile-menu--level.${ACTIVE}`);
        if (currentLevel) levelHistory.push(currentLevel);
        fadeToLevel(targetLevel);
      });
    });
  } catch (e) {
    console.error('[MobileMenu LevelNav]', e);
  }

  try {
    mobilePanel.querySelectorAll('.com-mobile-menu--trigger-l2').forEach((trigger) => {
      trigger.addEventListener('click', function () {
        this.classList.contains('is-expanded') ? collapseAccordion(this) : expandAccordion(this);
      });
    });
  } catch (e) {
    console.error('[MobileMenu Accordion]', e);
  }

  try {
    mobileBackBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const currentLevel = mobilePanel.querySelector(`.com-mobile-menu--level.${ACTIVE}`);
        if (currentLevel) collapseAllAccordions(currentLevel);
        if (levelHistory.length > 0) fadeToLevel(levelHistory.pop());
      });
    });
  } catch (e) {
    console.error('[MobileMenu Back]', e);
  }

  try {
    mobileTrigger.addEventListener('click', () => {
      mobilePanel.classList.contains(ACTIVE) ? closeMobileMenu() : openMobileMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobilePanel.classList.contains(ACTIVE)) closeMobileMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth < 1200) {
        mobileMenu.style.display = 'flex';
        mobileMenu.style.flexDirection = 'column';
      } else {
        mobileMenu.style.display = 'none';
        if (mobilePanel.classList.contains(ACTIVE)) closeMobileMenu();
      }
    });
    mobilePanel.querySelectorAll('a[href]').forEach((a) => {
      a.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || href === '') return;
        e.preventDefault();
        const activeLevel = mobilePanel.querySelector(`.com-mobile-menu--level.${ACTIVE}`);
        if (activeLevel) activeLevel.style.opacity = '0';
        mobilePanel.style.overflow = 'hidden';
        mobilePanel.style.transition = 'height 300ms cubic-bezier(0.39, 0.575, 0.565, 1)';
        mobilePanel.style.height = '0';
        setTimeout(() => {
          window.location.href = href;
        }, 400);
      });
    });
  } catch (e) {
    console.error('[MobileMenu Global]', e);
  }
}
