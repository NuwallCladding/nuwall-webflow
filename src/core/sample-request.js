// "Request a sample" popup: open/close, persona toggle (shows/hides the company
// field), and injects the chosen persona into the Webflow form before it submits.
export function initSampleRequest() {
  const popup = document.querySelector('.section-popup-form');
  if (!popup) return;

  try {
    const closeBtn = document.querySelector('.close-popup');
    const personaBtns = document.querySelectorAll('.popup-persona-block .button-wrapper');
    const companyFields = document.querySelectorAll('[data-input="company"]');
    const form = document.getElementById('wf-form-Message');
    const submitLink = document.querySelector('.form-submit_button');
    let persona = 'homeowner';

    function open() {
      popup.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      popup.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    function setPersona(p) {
      persona = p;
      personaBtns.forEach((b) => b.classList.remove('is-active-persona'));
      const activeBtn = personaBtns[p === 'homeowner' ? 0 : 1];
      if (activeBtn) activeBtn.classList.add('is-active-persona');

      if (p === 'homeowner') {
        companyFields.forEach((c) => {
          c.classList.add('is-hidden');
          c.removeAttribute('required');
          c.value = '';
        });
      } else {
        companyFields.forEach((c) => {
          c.classList.remove('is-hidden');
          c.setAttribute('required', '');
        });
      }
    }

    setPersona('homeowner');

    document.querySelectorAll('[data-cta="request-sample"]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        open();
      });
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        close();
      });
    }
    popup.addEventListener('click', (e) => {
      if (e.target === popup) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.classList.contains('is-open')) close();
    });

    if (personaBtns[0]) personaBtns[0].addEventListener('click', () => setPersona('homeowner'));
    if (personaBtns[1]) personaBtns[1].addEventListener('click', () => setPersona('professional'));

    if (submitLink) {
      submitLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        let personaInput = form.querySelector('input[name="Persona"]');
        if (!personaInput) {
          personaInput = document.createElement('input');
          personaInput.type = 'hidden';
          personaInput.name = 'Persona';
          form.appendChild(personaInput);
        }
        personaInput.value = persona;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    }
  } catch (err) {
    console.warn('Sample request popup error:', err);
  }
}
