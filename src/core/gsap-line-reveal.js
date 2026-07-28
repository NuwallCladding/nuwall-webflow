// Splits `.gsap-line` elements into lines and animates them up/in on load.
// Used on the profiles page; safe on any page that has this markup.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export function initGsapLineReveal() {
  const lines = document.querySelectorAll('.gsap-line');
  if (!lines.length) return;

  const split = new SplitText('.gsap-line', { type: 'lines' });

  // Fix clipping on the PARENT element
  gsap.set('.gsap-line', { overflow: 'visible' });

  // AND on the line wrappers
  gsap.set(split.lines, {
    overflow: 'hidden',
    paddingTop: '0.15em',
    paddingBottom: '0.15em',
  });

  gsap.from(split.lines, {
    yPercent: 100,
    opacity: 0,
    stagger: 0.1,
    duration: 0.6,
    ease: 'power2.out',
  });
}
