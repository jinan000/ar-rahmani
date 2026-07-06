/* ============================================================
   AR-RAHMANI — Loader
   Luxury Loading Screen
   ============================================================ */

const Loader = {
  el: null,
  progressBar: null,
  progress: 0,
  minDisplayTime: 500,
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
      { target: 40, delay: 100 },
      { target: 80, delay: 250 },
      { target: 95, delay: 400 },
    ];

    steps.forEach(({ target, delay }) => {
      setTimeout(() => {
        this.setProgress(target);
      }, delay);
    });

    // Final step once window is loaded or timeout
    let loaded = false;
    const finishLoader = () => {
      if (loaded) return;
      loaded = true;
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.minDisplayTime - elapsed);

      setTimeout(() => {
        this.setProgress(100);
        setTimeout(() => this.hide(), 300);
      }, remaining);
    };

    window.addEventListener('load', finishLoader);
    // Fallback: if load takes more than 2.5 seconds, dismiss the loader
    setTimeout(finishLoader, 2500);
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
