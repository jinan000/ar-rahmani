/**
 * TextPressure - Vanilla JS Port
 * Ported from React component to Vanilla JS.
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
    this.rafId = null;

    this.init();
  }

  init() {
    // Build DOM structure
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%'; // let it size dynamically if needed
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

    // Initial positioning
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = rect.left + rect.width / 2;
    this.mouse.y = rect.top + rect.height / 2;
    this.cursor.x = this.mouse.x;
    this.cursor.y = this.mouse.y;

    this.setSize();

    // Event listeners
    this.handleMouseMove = e => {
      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
    };
    this.handleTouchMove = e => {
      const t = e.touches[0];
      this.cursor.x = t.clientX;
      this.cursor.y = t.clientY;
    };
    
    // Resize with debounce
    let timeoutId;
    this.handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        this.setSize();
      }, 100);
    };

    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    window.addEventListener('resize', this.handleResize);

    this.animate();
  }

  setSize() {
    if (!this.container || !this.titleEl) return;
    
    const containerW = this.container.getBoundingClientRect().width;
    let newFontSize = containerW / (this.chars.length / 2);
    newFontSize = Math.max(newFontSize, this.minFontSize);
    
    // Let's cap font size so it doesn't get ridiculously large on ultrawide
    const maxFontSize = 120; 
    newFontSize = Math.min(newFontSize, maxFontSize);

    this.titleEl.style.fontSize = `${newFontSize}px`;
    this.titleEl.style.lineHeight = '1';

    if (this.scale) {
      requestAnimationFrame(() => {
        const textRect = this.titleEl.getBoundingClientRect();
        const containerH = this.container.getBoundingClientRect().height;
        if (textRect.height > 0) {
          const yRatio = containerH / textRect.height;
          this.titleEl.style.transform = `scale(1, ${yRatio})`;
          this.titleEl.style.transformOrigin = 'center top';
        }
      });
    }
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
    this.mouse.x += (this.cursor.x - this.mouse.x) / 15;
    this.mouse.y += (this.cursor.y - this.mouse.y) / 15;

    if (this.titleEl) {
      const titleRect = this.titleEl.getBoundingClientRect();
      const maxDist = titleRect.width / 2;

      this.spans.forEach(span => {
        const rect = span.getBoundingClientRect();
        const charCenter = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2
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
