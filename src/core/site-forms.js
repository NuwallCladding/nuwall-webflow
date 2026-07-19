// Small standalone form/overlay behaviours that don't belong to a specific
// feature: the contact form's custom submit trigger, and the mobile newsletter popup.
export function initSiteForms() {
  try {
    const contactForm = document.getElementById('contact-us-form');
    const contactSubmit = document.getElementById('cta-contact-us-submit');
    if (contactForm && contactSubmit) {
      contactSubmit.addEventListener('click', (e) => {
        e.preventDefault();
        if (!contactForm.checkValidity()) {
          contactForm.reportValidity();
          return;
        }
        contactForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
    }
  } catch (err) {
    console.warn('Contact form error:', err);
  }

  try {
    const newsletterPopup = document.querySelector('.form-newsletter-wrapper-mobile');
    if (newsletterPopup) {
      const closeNewsletter = () => {
        newsletterPopup.classList.remove('is-open');
        document.body.style.overflow = '';
      };

      document.querySelectorAll('[data-form="form-newsletter-popup"]').forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          newsletterPopup.classList.add('is-open');
          document.body.style.overflow = 'hidden';
        });
      });

      const closeBtn = document.querySelector('.form-newsletter-mobile-close-icon');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeNewsletter();
        });
      }
      newsletterPopup.addEventListener('click', (e) => {
        if (e.target === newsletterPopup) closeNewsletter();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && newsletterPopup.classList.contains('is-open')) closeNewsletter();
      });
    }
  } catch (err) {
    console.warn('Newsletter popup error:', err);
  }
}
