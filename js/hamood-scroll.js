/* ============================================================
   HAMOOD — Scroll Engine & Image Sequence Controller
   Drives the cinematic scroll-controlled hero animation
   and story overlay orchestration on index.html.
   ============================================================ */

const HamoodScroll = {
  // Image sequence state
  frames: [],
  totalFrames: 240,
  currentFrame: -1,
  canvas: null,
  ctx: null,
  imagesLoaded: 0,
  isReady: false,

  // Lenis instance
  lenis: null,

  // References
  heroSection: null,
  storyOverlays: {},
  scrollIndicator: null,

  /* ----------------------------------------------------------
     INITIALIZATION
     ---------------------------------------------------------- */
  init() {
    this.canvas = document.getElementById('sequence-canvas');
    this.heroSection = document.querySelector('.hero');
    this.scrollIndicator = document.getElementById('scroll-indicator');

    if (!this.canvas || !this.heroSection) return;

    this.ctx = this.canvas.getContext('2d');

    // Collect story overlay references
    this.storyOverlays = {
      intro: document.getElementById('story-intro'),
      s01: document.getElementById('story-01'),
      s02: document.getElementById('story-02'),
      s03: document.getElementById('story-03'),
      s04: document.getElementById('story-04'),
    };

    // Size the canvas
    this.resizeCanvas();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.resizeCanvas(), 150);
    });

    // Begin preloading frames
    this.preloadFrames();
  },

  /* ----------------------------------------------------------
     CANVAS SIZING
     ---------------------------------------------------------- */
  resizeCanvas() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Re-render current frame after resize
    if (this.currentFrame >= 0 && this.frames[this.currentFrame]) {
      this.renderFrame(this.currentFrame);
    }
  },

  /* ----------------------------------------------------------
     FRAME PRELOADING (Buffered Batch Loading for Smooth Scroll)
     ---------------------------------------------------------- */
  preloadFrames() {
    let loadedCount = 0;
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
    // Wait for all frames to load before lifting the loading screen for maximum smoothness
    const initialTargetBuffer = this.totalFrames;
    const self = this;
    
    // Initialize frames array
    for (let i = 0; i < this.totalFrames; i++) {
      this.frames[i] = null;
    }

    // High priority: load frame 0 immediately for instant display behind loader
    const firstImg = new Image();
    firstImg.onload = () => {
      self.frames[0] = firstImg;
      self.currentFrame = 0;
      self.lastDrawnIndex = 0;
      self.renderFrame(0);
      loadedCount++;
      if (window.Loader && typeof window.Loader.updateProgress === 'function') {
        window.Loader.updateProgress(loadedCount, initialTargetBuffer);
      }
    };
    firstImg.src = `assets/frames/frame_0001.webp`;

    // Concurrently load frames (4 stream connections on mobile to preserve CPU, 8 on desktop)
    let nextToLoad = 1;
    const concurrency = isMobile ? 4 : 8;

    const loadNext = () => {
      if (nextToLoad >= this.totalFrames) return;
      const i = nextToLoad++;
      const img = new Image();
      const frameNum = String(i + 1).padStart(4, '0');

      const onFrameLoaded = () => {
        self.frames[i] = img;
        loadedCount++;

        // Report progress to Loader for the initial buffer
        if (window.Loader && typeof window.Loader.updateProgress === 'function') {
          window.Loader.updateProgress(loadedCount, initialTargetBuffer);
        }

        // When initial buffer is ready, declare site ready and complete loader
        if (loadedCount >= initialTargetBuffer && !self.isReady) {
          self.onReady();
          if (window.Loader && typeof window.Loader.complete === 'function') {
            window.Loader.complete();
          }
        }

        loadNext();
      };

      img.onload = onFrameLoaded;
      img.onerror = onFrameLoaded;
      img.src = `assets/frames/frame_${frameNum}.webp`;
    };

    for (let c = 0; c < concurrency; c++) {
      loadNext();
    }
  },

  /* ----------------------------------------------------------
     READY — Start the Experience
     ---------------------------------------------------------- */
  onReady() {
    if (this.isReady) return;
    this.isReady = true;

    this.initScrollTrigger();

    if (this.scrollIndicator) {
      this.scrollIndicator.classList.add('visible');
    }

    if (this.storyOverlays.intro) {
      this.storyOverlays.intro.style.opacity = '1';
      this.storyOverlays.intro.classList.add('active');
    }
    const glow = document.getElementById('hero-glow');
    if (glow) glow.classList.add('active');
  },

  /* ----------------------------------------------------------
     GSAP SCROLL TRIGGER — Frame Sequence
     ---------------------------------------------------------- */
  initScrollTrigger() {
    gsap.registerPlugin(ScrollTrigger);

    const self = this;

    // Main scroll trigger for the hero image sequence with smooth scrub
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0, // Instant interpolation syncing with scroll
      onUpdate(trigger) {
        const progress = trigger.progress;
        const frameIndex = Math.min(
          Math.floor(progress * (self.totalFrames - 1)),
          self.totalFrames - 1
        );

        if (frameIndex !== self.currentFrame) {
          self.currentFrame = frameIndex;
          self.requestRenderFrame(frameIndex);
        }

        // Update story overlays based on progress
        self.updateStoryOverlays(progress);

        // Hide scroll indicator after initial scroll
        if (progress > 0.02 && self.scrollIndicator) {
          self.scrollIndicator.classList.remove('visible');
        } else if (progress <= 0.02 && self.scrollIndicator) {
          self.scrollIndicator.classList.add('visible');
        }
      }
    });
  },

  requestRenderFrame(index) {
    if (this.rafRenderId) return;
    this.rafRenderId = requestAnimationFrame(() => {
      this.renderFrame(index);
      this.rafRenderId = null;
    });
  },

  /* ----------------------------------------------------------
     RENDER FRAME TO CANVAS
     ---------------------------------------------------------- */
  renderFrame(index) {
    if (!this.ctx) return;
    let img = this.frames[index];

    if (!img || !img.complete || img.naturalWidth === 0) {
      // If target frame is still pending, use last successfully rendered frame
      if (this.lastDrawnIndex >= 0 && this.frames[this.lastDrawnIndex]) {
        img = this.frames[this.lastDrawnIndex];
      } else {
        for (let offset = 1; offset < 30; offset++) {
          const prev = this.frames[index - offset];
          if (prev && prev.complete && prev.naturalWidth > 0) {
            img = prev;
            break;
          }
          const next = this.frames[index + offset];
          if (next && next.complete && next.naturalWidth > 0) {
            img = next;
            break;
          }
        }
      }
    }

    if (img && img.complete && img.naturalWidth > 0) {
      this.lastDrawnIndex = index;
      this.drawCover(img);
    }
  },

  /* ----------------------------------------------------------
     DRAW IMAGE WITH "COVER" SCALING
     ---------------------------------------------------------- */
  drawCover(img) {
    const ctx = this.ctx;
    const cw = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const ch = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    if (!iw || !ih) return;

    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;

    let drawW, drawH, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
      offsetX = 0;
      offsetY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
      offsetX = (cw - drawW) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  },

  /* ----------------------------------------------------------
     STORY OVERLAY ORCHESTRATION
     ---------------------------------------------------------- */
  updateStoryOverlays(progress) {
    const { intro, s01, s02, s03, s04 } = this.storyOverlays;

    // Helper: fade range
    function fadeRange(el, start, peakStart, peakEnd, end, p) {
      if (!el) return;
      let opacity = 0;
      if (p >= start && p < peakStart) {
        opacity = (p - start) / (peakStart - start);
      } else if (p >= peakStart && p <= peakEnd) {
        opacity = 1;
      } else if (p > peakEnd && p <= end) {
        opacity = 1 - (p - peakEnd) / (end - peakEnd);
      }
      el.style.opacity = Math.max(0, Math.min(1, opacity));

      // Add/remove active class for CSS transitions
      if (opacity > 0.1) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }

    // Intro: 0% → 8%
    fadeRange(intro, 0, 0.01, 0.05, 0.10, progress);

    // Story 01: 10% → 25%
    fadeRange(s01, 0.10, 0.13, 0.20, 0.26, progress);

    // Story 02: 30% → 50%
    fadeRange(s02, 0.28, 0.32, 0.45, 0.52, progress);

    // Story 03: 55% → 75%
    fadeRange(s03, 0.55, 0.58, 0.70, 0.77, progress);

    // Story 04: 85% → 100%
    fadeRange(s04, 0.82, 0.86, 0.95, 1.0, progress);
  }
};

/* ============================================================
   BOOT — Initialize everything when DOM is ready
   ============================================================ */
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HamoodScroll.init());
  } else {
    HamoodScroll.init();
  }
})();
