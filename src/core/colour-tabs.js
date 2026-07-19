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

        // Stack the colour swatches on top of the last swatch's resting
        // spot, then slide each one into its own resting slot, staggered
        // left-to-right. (A plain fade-in-place let the swatch underneath
        // show through while the new colour was still fading in — sliding
        // fully in from the last swatch's position avoids that.)
        // A tab panel can hold several colour rows (one per environment
        // card), so swatches are grouped by the row they actually belong
        // to and measured against that row's own last swatch.
        //
        // Styles are forced with `important` priority: this component's
        // own CSS sets `transition: ... !important` on .colour-color-palette-item
        // for its hover effect, which silently wins over a plain (non-
        // important) inline transition and would otherwise block this
        // entrance animation from animating at all.
        swatches.forEach((el) => {
          el.style.setProperty('transition', 'none', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('transform', 'translateX(0)', 'important');
        });

        requestAnimationFrame(() => {
          const rowGroups = new Map();
          swatches.forEach((el) => {
            const row = el.closest('.colour-environment-colours-flex') || content;
            if (!rowGroups.has(row)) rowGroups.set(row, []);
            rowGroups.get(row).push(el);
          });

          const offsetByEl = new Map();
          rowGroups.forEach((els) => {
            const lastRight = els[els.length - 1].getBoundingClientRect().right;
            els.forEach((el) => {
              offsetByEl.set(el, lastRight - el.getBoundingClientRect().right);
            });
          });

          swatches.forEach((el) => {
            el.style.setProperty('transform', `translateX(${offsetByEl.get(el)}px)`, 'important');
          });

          requestAnimationFrame(() => {
            swatches.forEach((el, index) => {
              const delay = index * 150;
              el.style.setProperty(
                'transition',
                `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
                'important'
              );
              el.style.setProperty('opacity', '1', 'important');
              el.style.setProperty('transform', 'translateX(0)', 'important');
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
          el.style.setProperty('transition', 'none', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('transform', 'translateX(0)', 'important');
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
