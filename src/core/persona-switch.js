// Persona switch trigger: toggles between "professional" and "homeowner",
// cross-fading the page and persisting the choice that global.js reads on next load.
export function initPersonaSwitch() {
  const triggers = document.querySelectorAll('[data-persona-trigger="switch"]');
  if (!triggers.length) return;

  const FADE_MS = 400;
  const mainWrapper = document.querySelector('.main-wrapper');
  let persona = document.documentElement.getAttribute('data-persona') || 'professional';
  let busy = false;

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (busy) return;
      busy = true;

      const next = persona === 'professional' ? 'homeowner' : 'professional';
      if (mainWrapper) mainWrapper.classList.add('is-persona-fading');

      setTimeout(() => {
        persona = next;
        localStorage.setItem('persona', next);
        document.documentElement.setAttribute('data-persona', next);
        window.dispatchEvent(new CustomEvent('personaChange', { detail: { persona: next } }));
        if (mainWrapper) mainWrapper.classList.remove('is-persona-fading');
        setTimeout(() => {
          busy = false;
        }, FADE_MS);
      }, FADE_MS);
    });
  });
}
