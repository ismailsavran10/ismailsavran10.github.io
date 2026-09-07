/* Decorative motion progressively enhances content that is visible without JavaScript. */
(() => {
  'use strict';

  const start = () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const toggle = document.querySelector('.motion-toggle');
    const activeReveals = new Set();
    const motionListeners = new Set();
    const storageKey = 'ismail-portfolio-motion';
    let preference = null;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === 'running' || saved === 'paused') preference = saved;
    } catch { /* Private browsing may not provide storage. */ }

    const isRunning = () => preference ? preference === 'running' : !reduceMotion.matches;
    const syncMotion = () => {
      const running = isRunning();
      root.dataset.motion = running ? 'running' : 'paused';
      if (toggle) {
        const label = running ? 'Animasyonları duraklat' : 'Animasyonları başlat';
        toggle.setAttribute('aria-pressed', String(!running));
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        const text = toggle.querySelector('[data-motion-label]');
        if (text) text.textContent = running ? 'Hareket açık' : 'Hareket kapalı';
        const icon = toggle.querySelector('span[aria-hidden="true"]');
        if (icon) icon.textContent = running ? 'Ⅱ' : '▶';
      }
      if (!running) activeReveals.forEach(animation => animation.cancel());
      motionListeners.forEach(listener => listener(running));
      document.dispatchEvent(new CustomEvent("portfolio:motion", { detail: { running } }));
    };
    toggle?.addEventListener('click', () => {
      preference = isRunning() ? 'paused' : 'running';
      try { window.localStorage.setItem(storageKey, preference); } catch { /* Optional preference. */ }
      syncMotion();
    });
    reduceMotion.addEventListener('change', syncMotion);
    syncMotion();

    // Keep the first painted composition intact; motion starts after fonts and the logo settle.
    const brandImage = document.querySelector('.hero-brand img');
    Promise.all([
      document.fonts?.ready || Promise.resolve(),
      brandImage?.decode ? brandImage.decode().catch(() => {}) : Promise.resolve()
    ]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      root.dataset.motionReady = 'true';
    })));
    const initiallyVisible = new WeakSet();
    document.querySelectorAll('[data-reveal]').forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < innerHeight && bounds.bottom > 0) {
        initiallyVisible.add(element);
        element.dataset.initialView = '';
      }
    });

    const heroScene = document.querySelector('.hero-visual');
    let pointerFrame = 0;
    let sceneX = 0, sceneY = 0;
    const resetScene = () => {
      cancelAnimationFrame(pointerFrame); pointerFrame = 0;
      heroScene?.style.removeProperty('--scene-x');
      heroScene?.style.removeProperty('--scene-y');
    };
    heroScene?.addEventListener('pointermove', event => {
      if (!finePointer.matches || !isRunning() || reduceMotion.matches || !root.dataset.motionReady) return;
      const bounds = heroScene.getBoundingClientRect();
      sceneX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
      sceneY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
      if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        heroScene.style.setProperty('--scene-x', sceneX.toFixed(3));
        heroScene.style.setProperty('--scene-y', sceneY.toFixed(3));
      });
    }, {passive:true});
    heroScene?.addEventListener('pointerleave', resetScene);
    motionListeners.add(resetScene);
    document.addEventListener('visibilitychange', () => {
      root.classList.toggle('page-hidden', document.hidden);
      if (document.hidden) resetScene();
    });

    // Line masks preserve the actual heading text and stay visible without motion.
    document.querySelectorAll('.section-title[data-reveal], #contact-title').forEach(heading => {
      heading.setAttribute('data-reveal', '');
      const lines = [];
      let line = document.createDocumentFragment();
      [...heading.childNodes].forEach(node => {
        if (node.nodeName === 'BR') { lines.push(line); line = document.createDocumentFragment(); node.remove(); }
        else line.append(node);
      });
      lines.push(line);
      heading.replaceChildren(...lines.map(fragment => {
        const mask = document.createElement('span');
        const inner = document.createElement('span');
        mask.className = 'line-mask';
        inner.className = 'line-inner';
        inner.append(fragment);
        mask.append(inner);
        return mask;
      }));
    });

    const trackAnimation = animation => {
      activeReveals.add(animation);
      animation.finished.then(() => activeReveals.delete(animation), () => activeReveals.delete(animation));
      return animation;
    };
    if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
      const revealObserver = new IntersectionObserver(entries => {
        const entering = entries.filter(entry => entry.isIntersecting);
        entering.forEach((entry, position) => {
          revealObserver.unobserve(entry.target);
          const element = entry.target;
          element.classList.add('scene-entered');
          if (!isRunning() || reduceMotion.matches || !root.dataset.motionReady || initiallyVisible.has(element) || element.closest('.hero')) return;
          const lineElements = [...element.querySelectorAll(':scope > .line-mask > .line-inner')];
          if (lineElements.length) {
            lineElements.forEach((line, index) => trackAnimation(line.animate([
              { transform: 'translate3d(0,8px,0)', opacity: 0.65 },
              { transform: 'translate3d(0,0,0)', opacity: 1 }
            ], { duration: 600, delay: index * 45, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'backwards' })));
            return;
          }
          trackAnimation(element.animate([
            { opacity: 0.65, transform: 'translate3d(0,12px,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
          ], { duration: 600, delay: Math.min(position, 2) * 35, easing: 'cubic-bezier(.25,.1,.25,1)', fill: 'backwards' }));
        });
      }, { threshold: 0, rootMargin: '0px 0px 100px 0px' });
      document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
    }

    // Pause looping CSS illustrations when they leave the viewport.
    if ('IntersectionObserver' in window) {
      const scenes = document.querySelectorAll('.hero-visual, .project-card, .paper-card');
      const sceneObserver = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
        target.classList.toggle('motion-visible', isIntersecting);
        target.classList.toggle('motion-out-of-view', !isIntersecting);
      }), {rootMargin:'60px'});
      scenes.forEach(scene => sceneObserver.observe(scene));
    }

    // Keep content anchored while the research indicator follows native scrolling.
    const research = document.querySelector('.research-layout');
    const researchCards = [...document.querySelectorAll('.paper-card')];
    const researchLabels = [...document.querySelectorAll('.research-index > span')];
    let scrollFrame = 0;
    const updateDepth = () => {
      scrollFrame = 0;
      if (research) {
        const bounds = research.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight * .65 - bounds.top) / bounds.height));
        research.style.setProperty('--research-progress', progress.toFixed(3));
        let selected = 0;
        researchCards.forEach((card, index) => { if (card.getBoundingClientRect().top < innerHeight * .55) selected = index; });
        researchLabels.forEach((label, index) => label.classList.toggle('active', index === selected));
      }
    };
    const queueDepth = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateDepth); };
    window.addEventListener('scroll', queueDepth, { passive: true });
    window.addEventListener('resize', queueDepth, { passive: true });
    document.addEventListener('visibilitychange', queueDepth);
    motionListeners.add(queueDepth);
    queueDepth();

    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        if (!finePointer.matches || !isRunning() || reduceMotion.matches) return;
        const bounds = card.getBoundingClientRect();
        card.style.setProperty('--pointer-x', (event.clientX - bounds.left) + 'px');
        card.style.setProperty('--pointer-y', (event.clientY - bounds.top) + 'px');
      }, { passive: true });
    });

  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
