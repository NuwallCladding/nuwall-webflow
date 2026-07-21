// Generic inline loading spinner for buttons/links whose action has a
// noticeable delay before anything visible happens (e.g. a fetch that has
// to finish before a download starts). Toggle with setButtonLoading, or
// wrap an async task with withButtonSpinner to have it clear automatically.
export function setButtonLoading(el, isLoading) {
  if (!el) return;

  if (isLoading) {
    if (!el.querySelector(':scope > .nw-spinner')) {
      const spinner = document.createElement('span');
      spinner.className = 'nw-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      el.appendChild(spinner);
    }
    el.classList.add('is-loading');
    el.setAttribute('aria-busy', 'true');
  } else {
    const spinner = el.querySelector(':scope > .nw-spinner');
    if (spinner) spinner.remove();
    el.classList.remove('is-loading');
    el.removeAttribute('aria-busy');
  }
}

// Runs `task`, keeping the spinner on `el` visible until it settles either
// way. Returns the task's promise so callers can still catch errors.
export function withButtonSpinner(el, task) {
  setButtonLoading(el, true);
  return Promise.resolve()
    .then(task)
    .finally(() => setButtonLoading(el, false));
}
