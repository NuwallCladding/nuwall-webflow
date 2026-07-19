// Colour palette tabs (`[data-tabs="component"]`): switches the active
// environment image/content pane and staggers the palette swatches and
// `.color-palette` cards in on activation. Used on the colour page, and
// safe to include on any page that has this component's markup.
export function initColourTabs() {
  const component = document.querySelector('[data-tabs="component"]');
  if (!component) return;

  const triggers = component.querySelectorAll('[data-tab-trigger]');
  const images = component.querySelectorAll('[data-tab-image]');
  const contents = component.querySelectorAll('[data-tab-content]');

  function activate(tabId) {
    triggers.forEach((trigger) => {
      trigger.classList.toggle('is-active', trigger.getAttribute('data-tab-trigger') === tabId);
    });

    images.forEach((img) => {
      img.style.transition = 'opacity 600ms ease';
      const isActive = img.getAttribute('data-tab-image') === tabId;
      img.style.opacity = isActive ? '1' : '0';
      img.style.visibility = isActive ? 'visible' : 'hidden';
    });

    contents.forEach((content) => {
      const swatches = content.querySelectorAll('.colour-color-palette-item');
      const palettes = content.querySelectorAll('.color-palette');

      if (content.getAttribute('data-tab-content') === tabId) {
        content.style.visibility = 'visible';
        content.style.opacity = '1';

        // Stack the colour swatches at the far right of their row, then
        // slide each one left into its resting slot, staggered left-to-right.
        // (A plain fade-in-place let the swatch underneath show through
        // while the new colour was still fading in — sliding fully in from
        // off to the right avoids that.)
        // A tab panel can hold several colour rows (one per environment
        // card), so each swatch's slide distance is measured against the
        // right edge of the row it actually belongs to, not the panel.
        swatches.forEach((el) => {
          el.style.transition = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateX(0)';
        });

        requestAnimationFrame(() => {
          const rowRights = new Map();
          const offsets = Array.from(swatches).map((el) => {
            const row = el.closest('.colour-environment-colours-flex') || content;
            if (!rowRights.has(row)) rowRights.set(row, row.getBoundingClientRect().right);
            return rowRights.get(row) - el.getBoundingClientRect().right;
          });

          swatches.forEach((el, index) => {
            el.style.transform = `translateX(${offsets[index]}px)`;
          });

          requestAnimationFrame(() => {
            swatches.forEach((el, index) => {
              el.style.transition = 'opacity 700ms ease, transform 700ms ease';
              el.style.transitionDelay = index * 150 + 'ms';
              el.style.opacity = '1';
              el.style.transform = 'translateX(0)';
            });
          });
        });

        // Stagger palette cards (reverse order).
        palettes.forEach((palette, i) => {
          palette.style.animation = 'none';
          void palette.offsetHeight; // force reflow so the animation restarts
          const delay = i * 0.2;
          palette.style.animation = `paletteIn 0.7s cubic-bezier(0.39, 0.575, 0.565, 1) ${delay}s forwards`;
        });
      } else {
        swatches.forEach((el) => {
          el.style.transition = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateX(0)';
          el.style.transitionDelay = '0ms';
        });
        content.style.visibility = 'hidden';
        content.style.opacity = '0';

        palettes.forEach((palette) => {
          palette.style.animation = 'none';
          palette.style.opacity = '0';
          palette.style.transform = 'translateX(0rem)';
        });
      }
    });
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      activate(trigger.getAttribute('data-tab-trigger'));
    });
  });

  if (triggers[0]) {
    activate(triggers[0].getAttribute('data-tab-trigger'));
  }
}
