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
    window.addEventListener('resize', () => this.resizeCanvas());

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
     FRAME PRELOADING
     ---------------------------------------------------------- */
  preloadFrames() {
    let loaded = 0;
    const self = this;
    
    // Initialize frames array
    for (let i = 0; i < this.totalFrames; i++) {
      this.frames[i] = null;
    }

    const loadFrame = (i, callback) => {
      if (i >= this.totalFrames) return;
      const img = new Image();
      const frameNum = String(i + 1).padStart(4, '0');
      
      const onloadOrError = () => {
        loaded++;
        self.imagesLoaded = loaded;
        
        if (i === 0 && self.currentFrame < 0) {
          self.currentFrame = 0;
          self.renderFrame(0);
        }
        
        if (loaded >= 10 && !self.isReady) {
          self.onReady();
        }
        
        if (callback) callback();
      };
      
      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(onloadOrError).catch(onloadOrError);
        } else {
          onloadOrError();
        }
      };
      
      img.onerror = onloadOrError;
      
      this.frames[i] = img;
      img.src = `assets/frames/frame_${frameNum}.webp`;
    };
    
    // Queue configuration for optimal performance
    // Concurrency of 5 prevents network starvation for other lazy-loaded images
    const concurrency = 5;
    let nextToLoad = 0;
    
    const loadNext = () => {
      if (nextToLoad < this.totalFrames) {
        const idx = nextToLoad++;
        loadFrame(idx, loadNext);
      }
    };

    // Start concurrent workers
    for (let i = 0; i < Math.min(concurrency, this.totalFrames); i++) {
      const idx = nextToLoad++;
      loadFrame(idx, loadNext);
    }
  },

  /* ----------------------------------------------------------
     READY — Start the Experience
     ---------------------------------------------------------- */
  onReady() {
    if (this.isReady) return;
    this.isReady = true;

    // Small delay for premium feel
    setTimeout(() => {
      // Initialize GSAP ScrollTrigger
      this.initScrollTrigger();

      // Show scroll indicator
      setTimeout(() => {
        if (this.scrollIndicator) {
          this.scrollIndicator.classList.add('visible');
        }
      }, 1500);

      // Show intro text
      setTimeout(() => {
        if (this.storyOverlays.intro) {
          this.storyOverlays.intro.style.opacity = '1';
          this.storyOverlays.intro.classList.add('active');
        }
        // Activate hero glow
        const glow = document.getElementById('hero-glow');
        if (glow) glow.classList.add('active');
      }, 800);
    }, 600);
  },

  /* ----------------------------------------------------------
     GSAP SCROLL TRIGGER — Frame Sequence
     ---------------------------------------------------------- */
  initScrollTrigger() {
    gsap.registerPlugin(ScrollTrigger);

    const self = this;

    // Main scroll trigger for the hero image sequence
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0,
      onUpdate(trigger) {
        const progress = trigger.progress;
        const frameIndex = Math.min(
          Math.floor(progress * (self.totalFrames - 1)),
          self.totalFrames - 1
        );

        if (frameIndex !== self.currentFrame) {
          self.currentFrame = frameIndex;
          self.renderFrame(frameIndex);
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

  /* ----------------------------------------------------------
     RENDER FRAME TO CANVAS
     ---------------------------------------------------------- */
  renderFrame(index) {
    if (!this.ctx) return;
    const img = this.frames[index];

    if (!img || !img.complete || img.naturalWidth === 0) {
      // Frame not loaded yet — find nearest loaded frame
      for (let offset = 1; offset < 30; offset++) {
        const prev = this.frames[index - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          this.drawCover(prev);
          return;
        }
        const next = this.frames[index + offset];
        if (next && next.complete && next.naturalWidth > 0) {
          this.drawCover(next);
          return;
        }
      }
      return;
    }

    this.drawCover(img);
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
