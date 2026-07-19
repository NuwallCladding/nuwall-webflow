// Runs a callback once the DOM is parsed, whether the script is injected in
// <head> (before DOM ready) or before </body> (after). Safe either way.
export function onReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

// Webflow re-runs some interactions on the "Webflow.push" ready queue.
// Use this if you need to wait for Webflow's own IX2 engine to be available.
export function onWebflowReady(fn) {
  if (window.Webflow && typeof window.Webflow.push === 'function') {
    window.Webflow.push(fn);
  } else {
    onReady(fn);
  }
}
