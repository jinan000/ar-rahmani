/* ============================================================
   AR-RAHMANI — Main
   App initialization, Lenis smooth scrolling, lazy loading, mobile menu
   ============================================================ */

const App = {
  lenis: null,

  init() {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.boot());
    } else {
      this.boot();
    }
  },

  boot() {
    // Initialize modules
    Particles.init('hero-particles');
    Animations.init();
    Cursor.init();
    FragranceFinder.init();

    // Configure browser scroll restoration for smooth GSAP/Lenis synchronization
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    this.initLenis();

    this.setupLazyLoading();
    this.setupMobileMenu();
    this.setupNewsletterForm();
    this.setupBFCacheRestoration();

    // Prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Particles.destroy();
      if (this.lenis) this.lenis.destroy();
    }
  },

  /* ----------------------------------------------------------
     BFCache & BACK NAVIGATION RESTORATION
     Handles returning from Shopify checkout / external tabs / back button.
     Refreshes GSAP ScrollTrigger pin spacers so sections never bounce.
     ---------------------------------------------------------- */
  setupBFCacheRestoration() {
    // 1. Pageshow handler (fires on back/forward cache navigation)
    window.addEventListener('pageshow', (event) => {
      if (event.persisted || (window.performance && window.performance.navigation && window.performance.navigation.type === 2)) {
        if (this.lenis) {
          this.lenis.start();
        }
        if (typeof ScrollTrigger !== 'undefined') {
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 150);
        }
      }
    });

    // 2. Visibility change handler (fires when returning from checkout tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (typeof ScrollTrigger !== 'undefined') {
          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 150);
        }
      }
    });

    // 3. Image load settlement handler (refreshes ScrollTrigger metrics as images load)
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', () => {
          if (typeof ScrollTrigger !== 'undefined') {
            setTimeout(() => ScrollTrigger.refresh(), 50);
          }
        }, { once: true });
      }
    });
  },

  /* ----------------------------------------------------------
     LENIS SMOOTH SCROLL (Ultra-Luxury Inertia & Smooth Anchor Links)
     ---------------------------------------------------------- */
  initLenis() {
    try {
      if (typeof Lenis === 'undefined') {
        console.warn('Lenis library not loaded.');
        return;
      }

      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);

      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 0,   // Disable touch hijacking on mobile so native touch scroll never freezes
        smoothTouch: false,   // 100% native smooth touch scrolling on iOS & Android
        infinite: false,
      });

      // Expose globally for other modules
      window.lenis = this.lenis;

      // Synchronize Lenis scroll updates with GSAP ScrollTrigger
      this.lenis.on('scroll', () => {
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.update();
        }
      });

      // Tie Lenis RAF loop directly into GSAP's central ticker
      if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => {
          this.lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
      }

      // Smooth scroll handler for all anchor links (#about, #craftsmanship, #catalogue, etc.)
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href');
          if (targetId === '#' || targetId.length <= 1) return;
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            e.preventDefault();
            this.lenis.scrollTo(targetEl, {
              offset: 0,
              duration: 1.4,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
            });
          }
        });
      });
    } catch (e) {
      console.warn('Lenis smooth scroll error:', e);
    }
  },

  /* ----------------------------------------------------------
     LAZY LOADING
     ---------------------------------------------------------- */
  setupLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    if ('IntersectionObserver' in window) {
      const imgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            img.removeAttribute('data-src');

            if ('decode' in img) {
              img.src = src;
              img.decoding = 'async';
              img.decode().then(() => {
                img.classList.add('loaded');
              }).catch(() => {
                img.classList.add('loaded');
              });
            } else {
              img.src = src;
              img.addEventListener('load', () => {
                img.classList.add('loaded');
              }, { once: true });
            }

            imgObserver.unobserve(img);
          }
        });
      }, { rootMargin: '600px' });

      images.forEach(img => imgObserver.observe(img));
    } else {
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }

    document.querySelectorAll('img:not([fetchpriority="high"])').forEach(img => {
      if (!img.hasAttribute('decoding')) {
        img.decoding = 'async';
      }
      if (!img.hasAttribute('loading') && !img.dataset.src) {
        img.loading = 'lazy';
      }
    });
  },

  /* ----------------------------------------------------------
     MOBILE MENU
     ---------------------------------------------------------- */
  setupMobileMenu() {
    const toggle = document.getElementById('menu-toggle');
    const mobileNav = document.getElementById('mobile-nav');
    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile nav when clicking a link
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  },

  /* ----------------------------------------------------------
     NEWSLETTER FORM
     ---------------------------------------------------------- */
  setupNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && input.value) {
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Thank You ✓</span>';
        btn.style.borderColor = 'var(--color-gold)';
        input.value = '';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.borderColor = '';
        }, 3000);
      }
    });
  }
};

// Boot
App.init();
