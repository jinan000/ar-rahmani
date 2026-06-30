/* ============================================================
   AR-RAHMANI — Gold Particle System
   Lightweight Canvas-based particles
   ============================================================ */

const Particles = {
  canvas: null,
  ctx: null,
  particles: [],
  maxParticles: 40,
  animationFrame: null,
  isRunning: false,

  init(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.createParticles();
    this.isRunning = true;
    this.animate();

    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.offsetWidth;
    this.canvas.height = parent.offsetHeight;

    // Adjust particle count based on viewport
    this.maxParticles = window.innerWidth < 768 ? 20 : 40;
  },

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  },

  createParticle() {
    const size = Math.random() * 2 + 0.5;
    return {
      x: Math.random() * (this.canvas?.width || 1000),
      y: Math.random() * (this.canvas?.height || 800),
      size: size,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: -(Math.random() * 0.5 + 0.1),
      opacity: Math.random() * 0.5 + 0.1,
      opacityDirection: Math.random() > 0.5 ? 1 : -1,
      opacitySpeed: Math.random() * 0.005 + 0.001,
      life: 0,
      maxLife: Math.random() * 400 + 200,
    };
  },

  animate() {
    if (!this.isRunning || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach((p, i) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.life++;

      // Oscillate opacity
      p.opacity += p.opacityDirection * p.opacitySpeed;
      if (p.opacity >= 0.6) { p.opacityDirection = -1; }
      if (p.opacity <= 0.05) { p.opacityDirection = 1; }

      // Reset if out of bounds or expired
      if (p.y < -10 || p.x < -10 || p.x > this.canvas.width + 10 || p.life > p.maxLife) {
        this.particles[i] = this.createParticle();
        this.particles[i].y = this.canvas.height + 10;
      }

      // Draw particle with gold glow
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;

      // Outer glow
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0.3)');
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Core particle
      this.ctx.fillStyle = `rgba(245, 230, 163, ${p.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });

    this.animationFrame = requestAnimationFrame(() => this.animate());
  },

  destroy() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
};
