/* ============================================================
   AR-RAHMANI — Custom Cursor
   Luxury cursor with magnetic button effect
   ============================================================ */

const Cursor = {
  dot: null,
  mouseX: 0,
  mouseY: 0,
  dotX: 0,
  dotY: 0,
  isHovering: false,
  isTouch: false,
  magneticElements: [],

  init() {
    // Don't initialize on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.isTouch = true;
      return;
    }

    this.dot = document.getElementById('cursor-dot');
    if (!this.dot) return;

    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', () => {
      if (this.dot) this.dot.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
      if (this.dot) this.dot.classList.remove('clicking');
    });
    
    this.setupHoverTargets();
    this.setupMagneticButtons();
    this.animate();
  },

  onMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  },

  setupHoverTargets() {
    const hoverables = document.querySelectorAll(
      'a, button, .btn, .product-card, .mood-pill, .ingredient-card, .instagram-item, .feature-card, .testimonial-card'
    );

    hoverables.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.isHovering = true;
        if (this.dot) this.dot.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        this.isHovering = false;
        if (this.dot) this.dot.classList.remove('hovering');
      });
    });
  },

  setupMagneticButtons() {
    this.magneticElements = document.querySelectorAll('.btn, .navbar-links a');
    this.magneticElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.2;
        const deltaY = (e.clientY - centerY) * 0.2;
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  },

  animate() {
    if (this.isTouch) return;

    // Smooth follow
    const dotSpeed = 0.15;

    this.dotX += (this.mouseX - this.dotX) * dotSpeed;
    this.dotY += (this.mouseY - this.dotY) * dotSpeed;

    if (this.dot) {
      this.dot.style.left = `${this.dotX}px`;
      this.dot.style.top = `${this.dotY}px`;
    }

    requestAnimationFrame(() => this.animate());
  }
};
