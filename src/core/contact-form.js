// Contact us form: the CTA button lives outside the Webflow <form> element,
// so this pipes its click into a native submit (triggering Webflow's own
// validation and submit handling) instead of duplicating that logic.
export function initContactForm() {
  const form = document.getElementById('contact-us-form');
  const submitBtn = document.getElementById('cta-contact-us-submit');
  if (!form || !submitBtn) return;

  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}
