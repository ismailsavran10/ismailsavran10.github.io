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
              { transform: 'translate3d(0,110%,0) rotate(2deg)', opacity: 0.25 },
              { transform: 'translate3d(0,0,0) rotate(0)', opacity: 1 }
            ], { duration: 1000, delay: index * 125, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' })));
            return;
          }
          const card = element.matches('.project-card, .paper-card');
          const hero = element.closest('.hero-copy');
          // Critical copy renders immediately instead of waiting for an opacity reveal.
          if (hero && element.matches('h1, p')) return;
          const delay = hero ? [...hero.querySelectorAll('[data-reveal]')].indexOf(element) * 75 : Math.min(position, 3) * 80;
          trackAnimation(element.animate(card ? [
            { opacity: 0, transform: 'perspective(1400px) translate3d(0,56px,0) rotateX(4deg) scale(.98)' },
            { opacity: 1, transform: 'perspective(1400px) translate3d(0,0,0) rotateX(0) scale(1)' }
          ] : [
            { opacity: 0, transform: 'translate3d(0,32px,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
          ], { duration: card ? 800 : 650, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
          if (element.classList.contains('research-method')) {
            [...element.children].forEach((child, index) => trackAnimation(child.animate([
              { opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 700, delay: 160 + index * 120, fill: 'backwards', easing: 'cubic-bezier(.16,1,.3,1)' })));
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
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

    // Native scrolling is preserved; depth is applied only to decorative layers.
    const depthLayers = [...document.querySelectorAll('.project-card .project-art, .paper-cover')].map(surface => ({
      surface,
      layer: surface.querySelector('svg, .email-diagram, .series-bars, .sentiment-cloud')
    })).filter(item => item.layer);
    const research = document.querySelector('.research-layout');
    const researchCards = [...document.querySelectorAll('.paper-card')];
    const researchLabels = [...document.querySelectorAll('.research-index > span')];
    const brand = document.querySelector('.hero-brand');
    let scrollFrame = 0;
    const updateDepth = () => {
      scrollFrame = 0;
      const animate = isRunning() && !reduceMotion.matches && !document.hidden;
      depthLayers.forEach(({ surface, layer }) => {
        if (!animate) { layer.style.removeProperty('transform'); return; }
        const bounds = surface.getBoundingClientRect();
        if (bounds.bottom < -50 || bounds.top > innerHeight + 50) return;
        const progress = Math.max(-1, Math.min(1, (bounds.top + bounds.height / 2 - innerHeight / 2) / innerHeight));
        layer.style.transform = 'translate3d(0,' + (progress * (finePointer.matches ? 22 : 10)).toFixed(2) + 'px,0) scale(1.025)';
      });
      if (research) {
        const bounds = research.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight * .65 - bounds.top) / bounds.height));
        research.style.setProperty('--research-progress', progress.toFixed(3));
        let selected = 0;
        researchCards.forEach((card, index) => { if (card.getBoundingClientRect().top < innerHeight * .55) selected = index; });
        researchLabels.forEach((label, index) => label.classList.toggle('active', index === selected));
      }
      if (brand) {
        if (animate && scrollY < innerHeight) brand.style.transform = 'translate(-50%, -48%) translate3d(0,' + Math.min(22, scrollY * .045).toFixed(2) + 'px,0)';
        else brand.style.removeProperty('transform');
      }
    };
    const queueDepth = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateDepth); };
    window.addEventListener('scroll', queueDepth, { passive: true });
    window.addEventListener('resize', queueDepth, { passive: true });
    document.addEventListener('visibilitychange', queueDepth);
    motionListeners.add(queueDepth);
    queueDepth();

    document.querySelectorAll('.tilt-surface').forEach(surface => {
      let frame = 0;
      let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
      let hovering = false;
      const spring = () => {
        frame = 0;
        currentX += (targetX - currentX) * .12;
        currentY += (targetY - currentY) * .12;
        surface.style.transform = 'perspective(1100px) rotateX(' + (-currentY * 5).toFixed(3) + 'deg) rotateY(' + (currentX * 5).toFixed(3) + 'deg)';
        if (Math.abs(currentX - targetX) + Math.abs(currentY - targetY) > .002) frame = requestAnimationFrame(spring);
        else if (!hovering) surface.style.removeProperty('transform');
      };
      const reset = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        targetX = targetY = currentX = currentY = 0;
        surface.style.removeProperty('transform');
      };
      surface.addEventListener('pointermove', event => {
        if (!finePointer.matches || reduceMotion.matches || !isRunning()) return;
        hovering = true;
        const bounds = surface.getBoundingClientRect();
        targetX = (event.clientX - bounds.left) / bounds.width - .5;
        targetY = (event.clientY - bounds.top) / bounds.height - .5;
        if (!frame) frame = requestAnimationFrame(spring);
      }, { passive: true });
      surface.addEventListener('pointerleave', () => {
        hovering = false;
        targetX = targetY = 0;
        if (!frame && isRunning() && !reduceMotion.matches) frame = requestAnimationFrame(spring);
        else if (!isRunning()) reset();
      }, { passive: true });
      surface.addEventListener('pointercancel', reset, { passive: true });
      motionListeners.add(reset);
      finePointer.addEventListener('change', reset);
      reduceMotion.addEventListener('change', reset);
    });
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
