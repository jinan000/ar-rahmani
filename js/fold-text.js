/* ============================================================
   AR-RAHMANI — FoldText (Vanilla JS Port)
   Cinematic 3D fold/unfold text animation using GSAP.
   Ported from React FoldText component to pure vanilla JS.
   ============================================================ */

class FoldText {
  constructor(elementId, options = {}) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;

    this.text = options.text || 'AR-RAHMANI';
    this.splitBy = options.splitBy || 'char';
    this.hinge = options.hinge || 'top';
    this.duration = options.duration || 0.65;
    this.stagger = options.stagger || 0.045;
    this.ease = options.ease || 'power3.out';
    this.perspective = Math.max(120, options.perspective || 700);
    this.creaseShading = Math.min(1, Math.max(0, options.creaseShading || 0.55));
    this.trigger = options.trigger || 'scroll';
    this.parentSelector = options.parentSelector || null;
    this.fontSize = options.fontSize || 80;
    this.fontWeight = options.fontWeight || 800;
    this.color = options.color || '#f7f2e8';
    this.letterSpacing = options.letterSpacing || '-0.04em';

    this.HINGE_CONFIG = {
      top:    { origin: '50% 0%',   rotateX: -92, rotateY: 0 },
      bottom: { origin: '50% 100%', rotateX: 92,  rotateY: 0 },
      left:   { origin: '0% 50%',   rotateX: 0,   rotateY: 92 },
      right:  { origin: '100% 50%', rotateX: 0,   rotateY: -92 }
    };

    this.hingeConfig = this.HINGE_CONFIG[this.hinge] || this.HINGE_CONFIG.top;
    this.pieces = [];
    this.timeline = null;
    this.scrollTrigger = null;

    this.init();
  }

  init() {
    if (typeof gsap === 'undefined') {
      console.warn('[FoldText] GSAP is required.');
      return;
    }

    this.buildDOM();
    this.setupAnimation();
  }

  buildDOM() {
    // Set container CSS variables
    const fsValue = typeof this.fontSize === 'number' ? `${this.fontSize}px` : this.fontSize;
    this.container.style.setProperty('--fold-text-font-size', fsValue);
    this.container.style.setProperty('--fold-text-font-weight', this.fontWeight);
    this.container.style.setProperty('--fold-text-color', this.color);
    this.container.classList.add('fold-text');

    // Screen-reader accessible text (hidden visually)
    const srOnly = document.createElement('span');
    srOnly.className = 'fold-text-sr-only';
    srOnly.textContent = this.text;
    this.container.appendChild(srOnly);

    // Visual container
    const visual = document.createElement('span');
    visual.className = 'fold-text-visual';
    visual.setAttribute('aria-hidden', 'true');
    this.container.appendChild(visual);

    // Build segments based on splitBy mode
    if (this.splitBy === 'line') {
      this.buildLines(visual);
    } else if (this.splitBy === 'word') {
      this.buildWords(visual);
    } else {
      this.buildChars(visual);
    }
  }

  createSegment(content, splitType) {
    const segment = document.createElement('span');
    segment.className = 'fold-text-segment';
    segment.dataset.foldSplit = splitType || this.splitBy;
    segment.style.setProperty('--fold-perspective', `${this.perspective}px`);

    const piece = document.createElement('span');
    piece.className = 'fold-text-piece';
    piece.dataset.foldHinge = this.hinge;
    piece.style.transformOrigin = this.hingeConfig.origin;
    piece.style.setProperty('--fold-crease', '0');
    piece.textContent = content || '\u00A0';

    segment.appendChild(piece);
    this.pieces.push(piece);

    return segment;
  }

  buildChars(parent) {
    const chars = Array.from(this.text);
    chars.forEach(char => {
      if (char === '\n') {
        parent.appendChild(document.createElement('br'));
        return;
      }
      const content = char === ' ' ? '\u00A0' : char;
      parent.appendChild(this.createSegment(content, 'char'));
    });
  }

  buildWords(parent) {
    const parts = this.text.split(/(\s+)/);
    parts.forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) {
        // Whitespace — render as non-breaking spaces
        const ws = document.createElement('span');
        ws.className = 'fold-text-whitespace';
        ws.textContent = part.replace(/ /g, '\u00A0');
        parent.appendChild(ws);
      } else {
        parent.appendChild(this.createSegment(part, 'word'));
      }
    });
  }

  buildLines(parent) {
    const lines = this.text.split('\n');
    lines.forEach(line => {
      const lineWrap = document.createElement('span');
      lineWrap.className = 'fold-text-line';
      lineWrap.appendChild(this.createSegment(line || '\u00A0', 'line'));
      parent.appendChild(lineWrap);
    });
  }

  setupAnimation() {
    if (!this.pieces.length) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const activeDuration = reduceMotion ? Math.min(this.duration, 0.22) : this.duration;
    const activeStagger = reduceMotion ? Math.min(this.stagger, 0.02) : this.stagger;

    this.fromVars = {
      opacity: 0,
      rotateX: reduceMotion ? 0 : this.hingeConfig.rotateX,
      rotateY: reduceMotion ? 0 : this.hingeConfig.rotateY,
      '--fold-crease': reduceMotion ? 0 : this.creaseShading,
      transformOrigin: this.hingeConfig.origin,
      force3D: true
    };

    this.toVars = {
      opacity: 1,
      rotateX: 0,
      rotateY: 0,
      '--fold-crease': 0,
      duration: activeDuration,
      ease: reduceMotion ? 'power1.out' : this.ease,
      stagger: activeStagger,
      clearProps: 'willChange'
    };

    const play = (repeat) => {
      this.killTimeline();
      this.timeline = gsap.timeline({
        repeat: repeat ? -1 : 0,
        repeatDelay: repeat ? 0.75 : 0
      });
      this.timeline.fromTo(this.pieces, { ...this.fromVars }, { ...this.toVars });
      return this.timeline;
    };

    if (this.trigger === 'hover') {
      gsap.set(this.pieces, {
        opacity: 1, rotateX: 0, rotateY: 0,
        '--fold-crease': 0, transformOrigin: this.hingeConfig.origin
      });
      this.container.addEventListener('mouseenter', () => play(false));

    } else if (this.trigger === 'parent') {
      // Watch a parent element for an 'active' class to trigger animation.
      // Perfect for elements inside scroll-pinned/absolutely-positioned overlays
      // where ScrollTrigger/IntersectionObserver cannot detect visibility.
      gsap.set(this.pieces, this.fromVars);
      const parentEl = document.querySelector(this.parentSelector);
      if (parentEl) {
        let isCurrentlyActive = parentEl.classList.contains('active');
        if (isCurrentlyActive) {
          play(false);
        }

        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (m.attributeName === 'class') {
              const nowActive = parentEl.classList.contains('active');
              if (nowActive && !isCurrentlyActive) {
                isCurrentlyActive = true;
                play(false);
              } else if (!nowActive && isCurrentlyActive) {
                isCurrentlyActive = false;
                this.killTimeline();
                gsap.set(this.pieces, this.fromVars);
              }
            }
          }
        });
        observer.observe(parentEl, { attributes: true, attributeFilter: ['class'] });
      }

    } else if (this.trigger === 'scroll') {
      gsap.set(this.pieces, this.fromVars);
      if (typeof ScrollTrigger !== 'undefined') {
        this.scrollTrigger = ScrollTrigger.create({
          trigger: this.container,
          start: 'top 82%',
          once: true,
          onEnter: () => play(false)
        });
      } else {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            play(false);
            observer.disconnect();
          }
        }, { threshold: 0.1 });
        observer.observe(this.container);
      }

    } else if (this.trigger === 'loop') {
      play(true);

    } else {
      // 'mount' — play immediately
      play(false);
    }
  }

  killTimeline() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    gsap.killTweensOf(this.pieces);
  }

  destroy() {
    this.killTimeline();
    if (this.scrollTrigger) {
      this.scrollTrigger.kill();
      this.scrollTrigger = null;
    }
    this.container.innerHTML = '';
    this.pieces = [];
  }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  new FoldText('ar-rahmani-fold', {
    text: 'AR-RAHMANI',
    splitBy: 'char',
    hinge: 'top',
    trigger: 'parent',
    parentSelector: '#story-04',
    duration: 0.65,
    stagger: 0.055,
    ease: 'power3.out',
    perspective: 700,
    creaseShading: 0.55,
    fontSize: 'clamp(48px, 8vw, 110px)',
    fontWeight: 800,
    color: '#f7f2e8',
    letterSpacing: '-0.04em'
  });
});
