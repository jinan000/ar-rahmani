/**
 * TextPressure - Vanilla JS Port
 * Ported from React component to Vanilla JS with Ambient Sine Wave Loop.
 */

class TextPressure {
  constructor(elementId, options = {}) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;

    this.text = options.text || 'AR-RAHMANI';
    this.fontFamily = options.fontFamily || '"Roboto Flex", sans-serif';
    
    this.width = options.width !== undefined ? options.width : true;
    this.weight = options.weight !== undefined ? options.weight : true;
    this.italic = options.italic !== undefined ? options.italic : true;
    this.alpha = options.alpha !== undefined ? options.alpha : false;
    this.flex = options.flex !== undefined ? options.flex : true;
    this.scale = options.scale !== undefined ? options.scale : false;
    this.stroke = options.stroke !== undefined ? options.stroke : false;
    
    this.textColor = options.textColor || '#FFFFFF';
    this.strokeColor = options.strokeColor || '#FF0000';
    this.minFontSize = options.minFontSize || 36;
    
    this.chars = this.text.split('');
    this.spans = [];
    
    this.mouse = { x: 0, y: 0 };
    this.cursor = { x: 0, y: 0 };
    this.time = 0;
    this.isMouseActive = false;
    this.rafId = null;

    this.init();
  }

  init() {
    // Build DOM structure
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.background = 'transparent';

    this.titleEl = document.createElement('h2');
    this.titleEl.style.fontFamily = this.fontFamily;
    this.titleEl.style.textTransform = 'uppercase';
    this.titleEl.style.margin = '0';
    this.titleEl.style.textAlign = 'center';
    this.titleEl.style.userSelect = 'none';
    this.titleEl.style.whiteSpace = 'nowrap';
    this.titleEl.style.fontWeight = '100';
    this.titleEl.style.width = '100%';
    
    if (this.flex) {
      this.titleEl.style.display = 'flex';
      this.titleEl.style.justifyContent = 'space-between';
    }

    if (this.stroke) {
      this.titleEl.classList.add('tp-stroke');
    }

    this.chars.forEach(char => {
      const span = document.createElement('span');
      span.dataset.char = char;
      span.textContent = char;
      span.style.display = 'inline-block';
      if (!this.stroke) {
        span.style.color = this.textColor;
      }
      this.spans.push(span);
      this.titleEl.appendChild(span);
    });

    this.container.appendChild(this.titleEl);

    this.setSize();
    requestAnimationFrame(() => this.cacheOffsets());

    // Event listeners
    let mouseTimer;
    this.handleMouseMove = e => {
      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
      this.isMouseActive = true;
      clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        this.isMouseActive = false;
      }, 2500);
    };

    this.handleTouchMove = e => {
      const t = e.touches[0];
      this.cursor.x = t.clientX;
      this.cursor.y = t.clientY;
      this.isMouseActive = true;
      clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        this.isMouseActive = false;
      }, 2500);
    };
    
    let timeoutId;
    this.handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.setSize();
        requestAnimationFrame(() => this.cacheOffsets());
      }, 100);
    };

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    window.addEventListener('resize', this.handleResize);

    // Viewport-aware rendering
    this.isVisible = false;
    const observer = new IntersectionObserver((entries) => {
      this.isVisible = entries[0].isIntersecting;
      if (this.isVisible) {
        this.cacheOffsets();
        if (!this.rafId) {
          this.animate();
        }
      }
    }, { rootMargin: '150px' });
    observer.observe(this.container);
  }

  setSize() {
    if (!this.container || !this.titleEl) return;
    
    const containerW = this.container.getBoundingClientRect().width;
    let newFontSize = containerW / (this.chars.length / 2);
    newFontSize = Math.max(newFontSize, this.minFontSize);
    const maxFontSize = 120; 
    newFontSize = Math.min(newFontSize, maxFontSize);

    this.titleEl.style.fontSize = `${newFontSize}px`;
    this.titleEl.style.lineHeight = '1';
  }

  cacheOffsets() {
    if (!this.titleEl || !this.container) return;
    const containerRect = this.container.getBoundingClientRect();
    if (containerRect.width === 0) return;

    this.cachedMaxDist = containerRect.width / 2;
    this.spanOffsets = this.spans.map(span => {
      const rect = span.getBoundingClientRect();
      return {
        x: (rect.left - containerRect.left) + rect.width / 2,
        y: (rect.top - containerRect.top) + rect.height / 2
      };
    });
  }

  dist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getAttr(distance, maxDist, minVal, maxVal) {
    const val = maxVal - Math.abs((maxVal * distance) / maxDist);
    return Math.max(minVal, val + minVal);
  }

  animate() {
    if (!this.isVisible) {
      this.rafId = null;
      return;
    }

    this.time += 0.025;

    // Get current container position in viewport
    const containerRect = this.container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    // Continuous ambient wave loop position across text
    const maxDist = this.cachedMaxDist || (containerRect.width / 2) || 300;
    const ambientX = centerX + Math.sin(this.time * 1.5) * (maxDist * 0.85);
    const ambientY = centerY + Math.cos(this.time * 1.1) * 25;

    // Target position: mouse when actively hovering/moving, ambient wave loop when idle
    const targetX = this.isMouseActive ? this.cursor.x : ambientX;
    const targetY = this.isMouseActive ? this.cursor.y : ambientY;

    this.mouse.x += (targetX - this.mouse.x) / 10;
    this.mouse.y += (targetY - this.mouse.y) / 10;

    if (!this.spanOffsets || this.spanOffsets.length === 0) {
      this.cacheOffsets();
    }

    if (this.titleEl && this.spanOffsets) {
      this.spans.forEach((span, i) => {
        const offset = this.spanOffsets[i];
        if (!offset) return;

        // Compute char center dynamically in viewport space (scroll-proof!)
        const charCenter = {
          x: containerRect.left + offset.x,
          y: containerRect.top + offset.y
        };

        const d = this.dist(this.mouse, charCenter);

        const wdth = this.width ? Math.floor(this.getAttr(d, maxDist, 25, 150)) : 100;
        const wght = this.weight ? Math.floor(this.getAttr(d, maxDist, 100, 900)) : 400;
        const italVal = this.italic ? this.getAttr(d, maxDist, 0, 1).toFixed(2) : 0;
        const alphaVal = this.alpha ? this.getAttr(d, maxDist, 0.2, 1).toFixed(2) : 1;

        const newFontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;

        if (span.style.fontVariationSettings !== newFontVariationSettings) {
          span.style.fontVariationSettings = newFontVariationSettings;
        }
        if (this.alpha && span.style.opacity !== alphaVal) {
          span.style.opacity = alphaVal;
        }
      });
    }

    this.rafId = requestAnimationFrame(this.animate.bind(this));
  }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  new TextPressure('ar-rahmani-pressure', {
    text: 'AR-RAHMANI',
    fontFamily: '"Roboto Flex", sans-serif',
    flex: true,
    alpha: false,
    stroke: false,
    width: true,
    weight: true,
    italic: false,
    textColor: '#FFFFFF',
    minFontSize: 36
  });
});
