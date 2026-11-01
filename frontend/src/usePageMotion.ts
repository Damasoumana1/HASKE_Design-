import { useEffect } from 'react';

// Content is visible by default. Only off-screen elements get a reveal state.
// No scroll listener or animation dependency is needed.
export function usePageMotion(pathname: string) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const elements = Array.from(document.querySelectorAll<HTMLElement>([
      'main .section-heading', 'main .service-line', 'main .service-detail',
      'main .work-duo > a', 'main .process li', 'main .values article',
      'main .location-section > div', 'main .about-layout > div',
      '.footer-columns > *',
    ].join(',')));
    let observer: IntersectionObserver | undefined;

    const reveal = (element: HTMLElement) => {
      element.classList.remove('motion-pending');
      observer?.unobserve(element);
    };
    const configure = () => {
      observer?.disconnect();
      elements.forEach(reveal);
      if (preference.matches) return;
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        }
      }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
      for (const element of elements) {
        if (element.getBoundingClientRect().top < window.innerHeight - 24) continue;
        element.classList.add('motion-reveal', 'motion-pending');
        observer.observe(element);
      }
    };
    const revealFocusedContent = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>('.motion-pending');
      if (element) reveal(element);
    };

    configure();
    preference.addEventListener('change', configure);
    document.addEventListener('focusin', revealFocusedContent);
    return () => {
      observer?.disconnect();
      preference.removeEventListener('change', configure);
      document.removeEventListener('focusin', revealFocusedContent);
      elements.forEach(element => element.classList.remove('motion-reveal', 'motion-pending'));
    };
  }, [pathname]);
}
