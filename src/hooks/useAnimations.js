'use client';
// GSAP scroll animations (ported from the prototype's anim.js). Runs once per page change, not on re-renders.
// Uses gsap.from(), so if anything fails the page still shows normally.
import { useEffect } from 'react';

export default function useAnimations(pathname, ready) {
  useEffect(() => {
    if (!ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let ctx, cancelled = false;
    (async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const reveal = (selector, opts = {}) => {
          const els = gsap.utils.toArray(selector);
          if (!els.length) return;
          ScrollTrigger.batch(els, {
            start: opts.start || 'top 88%', once: true,
            onEnter: (batch) => gsap.from(batch, {
              y: opts.y ?? 40, x: opts.x ?? 0, scale: opts.scale ?? 1, rotate: opts.rotate ?? 0, opacity: 0,
              duration: opts.duration || 0.8, ease: opts.ease || 'power3.out', stagger: opts.stagger ?? 0.1, clearProps: 'transform,opacity',
            }),
          });
        };
        if (pathname === '/') {
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.from('.dr-hero h1', { y: 40, opacity: 0, duration: 0.9 })
            .from('.dr-hero .lead', { y: 20, opacity: 0, duration: 0.7 }, '-=0.55')
            .from('.dr-btns .dr-pill', { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.45')
            .from('.dr-card', { yPercent: 70, opacity: 0, duration: 0.9, stagger: { each: 0.07, from: 'center' }, clearProps: 'transform,opacity' }, '-=0.3');
          reveal('.sx-usp > div', { y: 24, stagger: 0.08 });
          reveal('.sx-title', { y: 20 });
          reveal('.sx-car .tile', { y: 40, stagger: 0.08 });
          reveal('.sx-mosaic > *', { y: 40, stagger: 0.1 });
          reveal('.faq-list details.faq', { y: 20, stagger: 0.06 });
        } else {
          reveal('#app .crumbs, #app h1', { y: 20, stagger: 0.06 });
          reveal('#app .tile', { y: 40, stagger: 0.07 });
          reveal('#app .pd-art', { scale: 0.94, y: 20 });
          reveal('#app .card, #app .stat, #app .table-wrap, #app .notice', { y: 30, stagger: 0.07 });
        }
        if (!document.getElementById('footer')?.hidden) {
          gsap.from('.newsletter', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.footer', start: 'top 95%', once: true } });
          reveal('.footer-cols > div', { y: 30, stagger: 0.08, start: 'top 95%' });
        }
      });
      ScrollTrigger.refresh();
    })();
    return () => { cancelled = true; ctx?.revert(); };
  }, [pathname, ready]);
}
