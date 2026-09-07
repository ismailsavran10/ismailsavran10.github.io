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

    const canvas = document.querySelector('#neural-canvas');
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      const count = 128;
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const nodes = Array.from({ length: count }, (_, index) => {
        const y = 1 - (index / (count - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const angle = goldenAngle * index;
        return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, index };
      });
      const edges = [];
      const used = new Set();
      nodes.forEach((node, index) => {
        const nearest = nodes.map((other, otherIndex) => ({
          index: otherIndex,
          distance: (node.x - other.x) ** 2 + (node.y - other.y) ** 2 + (node.z - other.z) ** 2
        })).filter(other => other.index !== index).sort((a, b) => a.distance - b.distance).slice(0, 4);
        nearest.forEach(other => {
          const a = Math.min(index, other.index);
          const b = Math.max(index, other.index);
          const key = `${a}:${b}`;
          if (!used.has(key)) {
            used.add(key);
            edges.push({ a, b, phase: ((a * 17 + b * 7) % 101) / 101 });
          }
        });
      });

      let width = 0;
      let height = 0;
      let inView = true;
      let frame = 0;
      let previousTime = 0;
      let elapsed = 0;
      let pointerX = 0;
      let pointerY = 0;
      let smoothX = 0;
      let smoothY = 0;
      const canAnimate = () => isRunning() && inView && !document.hidden && width > 0 && height > 0;
      const project = (point, rotationY, rotationX) => {
        const cosineY = Math.cos(rotationY);
        const sineY = Math.sin(rotationY);
        const x = point.x * cosineY + point.z * sineY;
        const rotatedZ = -point.x * sineY + point.z * cosineY;
        const cosineX = Math.cos(rotationX);
        const sineX = Math.sin(rotationX);
        const y = point.y * cosineX - rotatedZ * sineX;
        const z = point.y * sineX + rotatedZ * cosineX;
        const perspective = 3.8 / (3.8 - z);
        const scale = Math.min(width, height) * 0.315;
        return { x: width * 0.5 + x * scale * perspective, y: height * 0.5 + y * scale * perspective, z, perspective };
      };
      const line = (a, b) => {
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      };

      const draw = () => {
        if (!width || !height) return;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.315;
        context.clearRect(0, 0, width, height);
        const glow = context.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.6);
        glow.addColorStop(0, 'rgba(125, 174, 247, 0.11)');
        glow.addColorStop(0.65, 'rgba(123, 179, 234, 0.04)');
        glow.addColorStop(1, 'rgba(160, 198, 241, 0)');
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);

        // Fine orbital arcs give the network a quiet spatial frame.
        context.save();
        context.translate(centerX, centerY);
        context.rotate(-0.38 + smoothX * 0.05);
        context.lineWidth = 0.75;
        context.strokeStyle = 'rgba(92, 131, 189, 0.14)';
        context.beginPath();
        context.ellipse(0, 0, radius * 1.36, radius * 0.51, 0, Math.PI * 0.06, Math.PI * 0.96);
        context.stroke();
        context.beginPath();
        context.ellipse(0, 0, radius * 1.36, radius * 0.51, 0, Math.PI * 1.12, Math.PI * 1.97);
        context.stroke();
        const orbitAngle = elapsed * 0.16 + 0.6;
        context.fillStyle = 'rgba(55, 139, 157, 0.6)';
        context.beginPath();
        context.arc(Math.cos(orbitAngle) * radius * 1.36, Math.sin(orbitAngle) * radius * 0.51, 2.8, 0, Math.PI * 2);
        context.fill();
        context.restore();

        const rotationY = elapsed * 0.09 + 0.4 + smoothX * 0.2;
        const rotationX = -0.16 + smoothY * 0.12;
        const projected = nodes.map(node => ({ ...project(node, rotationY, rotationX), index: node.index }));
        const orderedEdges = edges.map(edge => ({ ...edge, depth: (projected[edge.a].z + projected[edge.b].z) / 2 })).sort((a, b) => a.depth - b.depth);
        orderedEdges.forEach(edge => {
          const depth = (edge.depth + 1) / 2;
          context.strokeStyle = `rgba(77, 120, 187, ${0.055 + depth * 0.23})`;
          context.lineWidth = 0.55 + depth * 0.35;
          line(projected[edge.a], projected[edge.b]);
        });

        // Only a small subset carries light packets, avoiding a busy particle cloud.
        edges.forEach((edge, index) => {
          if (index % 13 !== 0) return;
          const a = projected[edge.a];
          const b = projected[edge.b];
          const progress = (elapsed * 0.18 + edge.phase) % 1;
          const depth = (a.z + (b.z - a.z) * progress + 1) / 2;
          const fade = Math.sin(progress * Math.PI);
          context.fillStyle = `rgba(43, 144, 168, ${fade * (0.12 + depth * 0.64)})`;
          context.beginPath();
          context.arc(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress, 1 + depth * 1.15, 0, Math.PI * 2);
          context.fill();
        });

        projected.sort((a, b) => a.z - b.z).forEach(node => {
          const depth = (node.z + 1) / 2;
          const featured = node.index % 11 === 0;
          const size = (featured ? 2.8 : 1.65) * node.perspective;
          if (featured && depth > 0.4) {
            context.fillStyle = `rgba(77, 126, 213, ${0.035 + depth * 0.06})`;
            context.beginPath();
            context.arc(node.x, node.y, size * 3, 0, Math.PI * 2);
            context.fill();
          }
          context.fillStyle = featured
            ? `rgba(54, 101, 199, ${0.27 + depth * 0.7})`
            : `rgba(84, 137, 197, ${0.13 + depth * 0.65})`;
          context.beginPath();
          context.arc(node.x, node.y, size, 0, Math.PI * 2);
          context.fill();
          if (featured && depth > 0.7) {
            context.fillStyle = 'rgba(246, 251, 255, 0.85)';
            context.beginPath();
            context.arc(node.x - size * 0.22, node.y - size * 0.22, size * 0.28, 0, Math.PI * 2);
            context.fill();
          }
        });
      };

      const tick = timestamp => {
        frame = 0;
        if (!canAnimate()) { previousTime = 0; return; }
        const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.05) : 0;
        previousTime = timestamp;
        elapsed += delta;
        const smoothing = 1 - Math.exp(-delta * 3.5);
        smoothX += (pointerX - smoothX) * smoothing;
        smoothY += (pointerY - smoothY) * smoothing;
        draw();
        frame = window.requestAnimationFrame(tick);
      };
      const updatePlayback = () => {
        if (canAnimate()) {
          if (!frame) frame = window.requestAnimationFrame(tick);
        } else {
          window.cancelAnimationFrame(frame);
          frame = 0;
          previousTime = 0;
          draw();
        }
      };
      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw();
        updatePlayback();
      };
      const surface = canvas.closest('.hero-visual') || canvas;
      surface.addEventListener('pointermove', event => {
        if (!finePointer.matches || !isRunning() || reduceMotion.matches) return;
        const bounds = surface.getBoundingClientRect();
        pointerX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
        pointerY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      }, { passive: true });
      surface.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, { passive: true });
      if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
      }
      // Window resize also catches DPR changes when moving between displays.
      window.addEventListener('resize', resize, { passive: true });
      if ('IntersectionObserver' in window) {
        const visibilityObserver = new IntersectionObserver(entries => {
          inView = entries[0].isIntersecting;
          updatePlayback();
        }, { rootMargin: '60px' });
        visibilityObserver.observe(canvas);
      }
      motionListeners.add(updatePlayback);
      document.addEventListener('visibilitychange', updatePlayback);
      window.addEventListener('pagehide', () => {
        window.cancelAnimationFrame(frame);
        frame = 0;
        previousTime = 0;
      });
      window.addEventListener('pageshow', updatePlayback);
      resize();
    }

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
          if (!isRunning() || reduceMotion.matches) return;
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
          const delay = hero ? [...hero.querySelectorAll('[data-reveal]')].indexOf(element) * 75 : Math.min(position, 3) * 80;
          trackAnimation(element.animate(card ? [
            { opacity: 0, transform: 'perspective(1400px) translate3d(0,72px,0) rotateX(6deg) scale(.97)', filter: 'blur(3px)' },
            { opacity: 1, transform: 'perspective(1400px) translate3d(0,0,0) rotateX(0) scale(1)', filter: 'blur(0)' }
          ] : [
            { opacity: 0, transform: 'translate3d(0,32px,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
          ], { duration: card ? 1050 : 850, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }));
          if (element.classList.contains('research-method')) {
            [...element.children].forEach((child, index) => trackAnimation(child.animate([
              { opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 700, delay: 160 + index * 120, fill: 'backwards', easing: 'cubic-bezier(.16,1,.3,1)' })));
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
      document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
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
