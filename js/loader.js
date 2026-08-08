/* ============================================================
   AR-RAHMANI — Loader
   Luxury Loading Screen with Real-Time Progressive Readout
   ============================================================ */

const Loader = {
  el: null,
  progressBar: null,
  percentEl: null,
  targetProgress: 0,
  currentProgress: 0,
  isCompleting: false,
  isFinished: false,
  startTime: 0,
  minDisplayTime: 2000, // 2 seconds min display time for smooth frame preloading
  rafId: null,

  init() {
    this.el = document.getElementById('loader');
    this.progressBar = document.getElementById('loader-progress-bar');
    this.percentEl = document.getElementById('loader-percent');
    if (!this.el || !this.progressBar) return;

    this.startTime = Date.now();
    document.body.style.overflow = 'hidden';

    // Baseline initial progress
    this.targetProgress = 5;

    // Start continuous smooth animation loop
    this.animate();

    // Fallback: auto complete after 3.5 seconds
    setTimeout(() => {
      this.complete();
    }, 3500);
  },

  animate() {
    if (this.isFinished) return;

    // Smooth incremental step-by-step progress (0% -> 1% -> 2% ... -> 100%)
    if (this.currentProgress < this.targetProgress) {
      const step = Math.min(1.8, (this.targetProgress - this.currentProgress) * 0.12 + 0.4);
      this.currentProgress += step;
    } else if (this.isCompleting && this.currentProgress < 100) {
      this.currentProgress += 1.2;
    }

    if (this.currentProgress > 100) this.currentProgress = 100;

    const rounded = Math.floor(this.currentProgress);
    if (this.progressBar) {
      this.progressBar.style.width = `${rounded}%`;
    }
    if (this.percentEl) {
      this.percentEl.textContent = `${rounded}%`;
    }

    // Hide when 100% reached and min display time passed
    if (rounded >= 100 && (Date.now() - this.startTime) >= this.minDisplayTime) {
      this.hide();
      return;
    }

    this.rafId = requestAnimationFrame(() => this.animate());
  },

  setProgress(val) {
    const clamped = Math.max(0, Math.min(98, val));
    if (clamped > this.targetProgress) {
      this.targetProgress = clamped;
    }
  },

  updateProgress(loadedCount, totalCount) {
    if (totalCount <= 0) return;
    const ratio = Math.min(1, loadedCount / totalCount);
    // Smoothly scale real frame count to 5-92% range
    const pct = 5 + Math.round(ratio * 87);
    this.setProgress(pct);
  },

  complete() {
    if (this.isCompleting) return;
    this.isCompleting = true;
    this.targetProgress = 100;
  },

  hide() {
    if (this.isFinished) return;
    this.isFinished = true;
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.progressBar) this.progressBar.style.width = '100%';
    if (this.percentEl) this.percentEl.textContent = '100%';

    if (this.el) {
      this.el.classList.add('loaded');
      document.body.style.overflow = '';
      setTimeout(() => {
        if (this.el && this.el.parentNode) {
          this.el.remove();
        }
      }, 800);
    }
  }
};

// Initialize immediately
Loader.init();
