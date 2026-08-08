// Finishes page tabs (`[data-tabs="component"]`): switches the active
// image/content pane and staggers the active pane's direct children in on
// activation. Generic version of colour-tabs.js — that one is specific to
// the colour page's swatch/palette markup, this one just staggers whatever
// children the active `data-tab-content` pane has.
export function initFinishesTabs() {
  const component = document.querySelector('[data-tabs="component"]');
  if (!component) return;

  const triggers = component.querySelectorAll('[data-tab-trigger]');
  const images = component.querySelectorAll('[data-tab-image]');
  const contents = component.querySelectorAll('[data-tab-content]');

  function activate(tabId) {
    triggers.forEach((trigger) => {
      trigger.classList.toggle('is-active', trigger.getAttribute('data-tab-trigger') === tabId);
    });

    // Images — show/hide via display, no crossfade.
    images.forEach((img) => {
      const isActive = img.getAttribute('data-tab-image') === tabId;
      img.style.display = isActive ? '' : 'none';
    });

    // Content — stagger children in.
    contents.forEach((content) => {
      const children = content.children;

      if (content.getAttribute('data-tab-content') === tabId) {
        content.style.display = '';

        Array.from(children).forEach((el, index) => {
          el.style.transition = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateY(1rem)';

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              el.style.transition = 'opacity 700ms ease, transform 700ms ease';
              el.style.transitionDelay = index * 120 + 'ms';
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            });
          });
        });
      } else {
        // Reset children immediately.
        Array.from(children).forEach((el) => {
          el.style.transition = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateY(1rem)';
          el.style.transitionDelay = '0ms';
        });
        content.style.display = 'none';
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
