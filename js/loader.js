/* ============================================================
   AR-RAHMANI — Loader
   Luxury Loading Screen
   ============================================================ */

const Loader = {
  el: null,
  progressBar: null,
  progress: 0,
  minDisplayTime: 2200,
  startTime: 0,

  init() {
    this.el = document.getElementById('loader');
    this.progressBar = document.getElementById('loader-progress-bar');
    if (!this.el || !this.progressBar) return;

    this.startTime = Date.now();
    document.body.style.overflow = 'hidden';
    this.simulateProgress();
  },

  simulateProgress() {
    const steps = [
      { target: 25, delay: 200 },
      { target: 50, delay: 500 },
      { target: 70, delay: 800 },
      { target: 85, delay: 1200 },
      { target: 95, delay: 1600 },
    ];

    steps.forEach(({ target, delay }) => {
      setTimeout(() => {
        this.setProgress(target);
      }, delay);
    });

    // Final step once window is loaded
    window.addEventListener('load', () => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.minDisplayTime - elapsed);

      setTimeout(() => {
        this.setProgress(100);
        setTimeout(() => this.hide(), 300);
      }, remaining);
    });
  },

  setProgress(value) {
    this.progress = value;
    if (this.progressBar) {
      this.progressBar.style.width = `${value}%`;
    }
  },

  hide() {
    if (this.el) {
      this.el.classList.add('loaded');
      document.body.style.overflow = '';
      // Remove from DOM after animation
      setTimeout(() => {
        this.el.remove();
      }, 1000);
    }
  }
};

// Initialize immediately
Loader.init();
