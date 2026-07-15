/**
 * Scroll-reveal helper for elements marked with [data-reveal].
 * Adds `.revealed` when the element enters the viewport.
 * Respects prefers-reduced-motion by revealing everything immediately.
 */

const REVEAL_SELECTOR = '[data-reveal]';
const REVEALED_CLASS = 'revealed';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function revealImmediately(root: ParentNode = document): void {
  root.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
    el.classList.add(REVEALED_CLASS);
  });
}

/**
 * Initialize IntersectionObserver-based scroll reveals.
 * Safe to call multiple times; re-observes any unrevealed nodes.
 */
export function initReveal(options?: {
  threshold?: number;
  rootMargin?: string;
}): void {
  if (typeof document === 'undefined') return;

  if (prefersReducedMotion()) {
    revealImmediately();
    return;
  }

  const threshold = options?.threshold ?? 0.15;
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px';

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        const delay = parseFloat(el.getAttribute('data-reveal-delay') || '0');
        if (delay > 0) {
          el.style.transitionDelay = `${delay}s`;
        }
        el.classList.add(REVEALED_CLASS);
        observer.unobserve(el);
      }
    },
    { threshold, rootMargin },
  );

  document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
    if (!el.classList.contains(REVEALED_CLASS)) {
      observer.observe(el);
    }
  });
}

/** Auto-init on DOM ready when loaded as a client module. */
export function autoInitReveal(): void {
  if (typeof document === 'undefined') return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initReveal(), {
      once: true,
    });
  } else {
    initReveal();
  }
}

autoInitReveal();
