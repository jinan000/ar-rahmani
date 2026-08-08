/* ============================================================
   AR-RAHMANI — Custom Cursor
   Ultra-Crisp Luxury Cursor
   ============================================================ */

const Cursor = {
  dot: null,
  ring: null,
  mouseX: 0,
  mouseY: 0,
  dotX: 0,
  dotY: 0,
  ringX: 0,
  ringY: 0,
  isHovering: false,
  isTouch: false,

  init() {
    // Don't initialize on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      this.isTouch = true;
      return;
    }

    this.dot = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');
    if (!this.dot && !this.ring) return;

    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', () => {
      if (this.dot) this.dot.classList.add('clicking');
      if (this.ring) this.ring.classList.add('clicking');
    });
    document.addEventListener('mouseup', () => {
      if (this.dot) this.dot.classList.remove('clicking');
      if (this.ring) this.ring.classList.remove('clicking');
    });
    
    this.setupHoverTargets();
    this.animate();
  },

  onMouseMove(e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (this.dotX === 0 && this.dotY === 0) {
      this.dotX = this.mouseX;
      this.dotY = this.mouseY;
      this.ringX = this.mouseX;
      this.ringY = this.mouseY;
    }
  },

  setupHoverTargets() {
    const hoverables = document.querySelectorAll(
      'a, button, .btn, .product-card, .mood-pill, .ingredient-card, .instagram-item, .feature-card, .testimonial-card, .cat-card'
    );

    hoverables.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.isHovering = true;
        if (this.dot) this.dot.classList.add('hovering');
        if (this.ring) this.ring.classList.add('hovering');
      });
      el.addEventListener('mouseleave', () => {
        this.isHovering = false;
        if (this.dot) this.dot.classList.remove('hovering');
        if (this.ring) this.ring.classList.remove('hovering');
      });
    });
  },

  animate() {
    if (this.isTouch) return;

    // Fast follow for inner dot (immediate crisp tracking)
    this.dotX += (this.mouseX - this.dotX) * 0.45;
    this.dotY += (this.mouseY - this.dotY) * 0.45;

    // Smooth trailing follow for outer ring if active
    this.ringX += (this.mouseX - this.ringX) * 0.12;
    this.ringY += (this.mouseY - this.ringY) * 0.12;

    if (this.dot) {
      this.dot.style.transform = `translate3d(${this.dotX}px, ${this.dotY}px, 0) translate(-50%, -50%)`;
    }

    if (this.ring) {
      this.ring.style.transform = `translate3d(${this.ringX}px, ${this.ringY}px, 0) translate(-50%, -50%)`;
    }

    requestAnimationFrame(() => this.animate());
  }
};
