/* ============================================================
   HAMOOD — Atmospheric Effects
   Gold particle system, smoke overlays, ambient lighting for index.html
   ============================================================ */

const HamoodAtmosphere = {
  canvas: null,
  ctx: null,
  particles: [],
  maxParticles: 20,
  animationFrame: null,
  isRunning: false,
  scrollProgress: 0,
  width: 0,
  height: 0,

  /* ----------------------------------------------------------
     INITIALIZATION
     ---------------------------------------------------------- */
  init() {
    this.canvas = document.getElementById('particles-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.createParticles();
    this.isRunning = true;
    this.animate();

    window.addEventListener('resize', () => this.resize());

    // Track scroll progress for particle density
    window.addEventListener('scroll', () => {
      const hero = document.querySelector('.hero');
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      const total = hero.offsetHeight - window.innerHeight;
      if (total > 0) {
        this.scrollProgress = Math.max(0, Math.min(1, -rect.top / total));
      }
    }, { passive: true });
  },

  /* ----------------------------------------------------------
     CANVAS RESIZE
     ---------------------------------------------------------- */
  resize() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Adjust particle count for mobile
    this.maxParticles = this.width < 768 ? 10 : 20;
  },

  /* ----------------------------------------------------------
     PARTICLE CREATION
     ---------------------------------------------------------- */
  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  },

  createParticle() {
    const size = Math.random() * 2 + 0.3;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      size: size,
      baseSize: size,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.3 + 0.05),
      opacity: Math.random() * 0.4 + 0.05,
      maxOpacity: Math.random() * 0.4 + 0.1,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      opacitySpeed: Math.random() * 0.003 + 0.0005,
      life: 0,
      maxLife: Math.random() * 600 + 300,
      // Gold color variation
      hue: 38 + Math.random() * 15, // 38-53 (warm gold range)
      saturation: 60 + Math.random() * 30,
      lightness: 55 + Math.random() * 25,
    };
  },

  /* ----------------------------------------------------------
     ANIMATION LOOP
     ---------------------------------------------------------- */
  animate() {
    if (!this.isRunning || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Adjust particle visibility based on scroll
    const densityFactor = this.getDensityFactor();

    this.particles.forEach((p, i) => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Gentle wind effect tied to scroll
      p.x += Math.sin(p.life * 0.008) * 0.1;

      // Oscillate opacity
      p.opacity += p.opacityDir * p.opacitySpeed;
      if (p.opacity >= p.maxOpacity) { p.opacityDir = -1; }
      if (p.opacity <= 0.02) { p.opacityDir = 1; }

      // Reset if out of bounds or expired
      if (p.y < -20 || p.x < -20 || p.x > this.width + 20 || p.life > p.maxLife) {
        this.particles[i] = this.createParticle();
        this.particles[i].y = this.height + 10;
        return;
      }

      // Skip rendering if density is low
      if (i > this.maxParticles * densityFactor) return;

      // Draw particle
      const effectiveOpacity = p.opacity * densityFactor;
      if (effectiveOpacity < 0.01) return;

      this.ctx.save();
      this.ctx.globalAlpha = effectiveOpacity;

      // Outer glow
      const gradient = this.ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size * 5
      );
      gradient.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0.25)`);
      gradient.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
      this.ctx.fill();

      // Core particle
      this.ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 15}%, ${effectiveOpacity})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });

    this.animationFrame = requestAnimationFrame(() => this.animate());
  },

  /* ----------------------------------------------------------
     DENSITY FACTOR
     Controls particle visibility through the scroll journey
     ---------------------------------------------------------- */
  getDensityFactor() {
    const p = this.scrollProgress;
    if (p < 0.1) return 1.0;         // Hero intro
    if (p < 0.3) return 0.6;         // Birth story
    if (p < 0.55) return 0.3;        // Macro (less particles)
    if (p < 0.75) return 0.5;        // Hero reveal
    return 0.8;                       // Final composition
  },

  /* ----------------------------------------------------------
     CLEANUP
     ---------------------------------------------------------- */
  destroy() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
};

/* ============================================================
   BOOT
   ============================================================ */
(function () {
  function boot() {
    HamoodAtmosphere.init();

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      HamoodAtmosphere.destroy();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
