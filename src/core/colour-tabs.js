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

        // Fade the whole set of swatches in together.
        //
        // Opacity is forced with `important` priority: this component's
        // own CSS sets `transition: ... !important` on .colour-color-palette-item
        // for its hover effect, which silently wins over a plain (non-
        // important) inline transition and would otherwise block this
        // entrance animation from animating at all.
        swatches.forEach((el) => {
          el.style.setProperty('transition', 'none', 'important');
          el.style.setProperty('opacity', '0', 'important');
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            swatches.forEach((el) => {
              el.style.setProperty('transition', 'opacity 700ms ease', 'important');
              el.style.setProperty('opacity', '1', 'important');
            });
          });
        });

        // Stagger palette cards (reverse order).
        palettes.forEach((palette, i) => {
          palette.style.animation = 'none';
          void palette.offsetHeight; // force reflow so the animation restarts
          palette.style.animation = `paletteIn 0.7s cubic-bezier(0.39, 0.575, 0.565, 1)`;
        });
      } else {
        swatches.forEach((el) => {
          el.style.setProperty('transition', 'none', 'important');
          el.style.setProperty('opacity', '0', 'important');
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
