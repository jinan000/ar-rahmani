/* ============================================================
   AR-RAHMANI — Main
   App initialization, lazy loading, mobile menu
   ============================================================ */

const App = {
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

    this.initLenis();

    this.setupLazyLoading();
    this.setupMobileMenu();
    this.setupNewsletterForm();

    // Prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Particles.destroy();
      if (this.lenis) this.lenis.destroy();
    }
  },

  /* ----------------------------------------------------------
     LENIS SMOOTH SCROLL
     ---------------------------------------------------------- */
  initLenis() {
    try {
      this.lenis = new Lenis({
        duration: 1.8, // Increased duration for super smooth premium feel
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.2,
      });

      // Connect Lenis to GSAP ScrollTrigger
      this.lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    } catch (e) {
      console.warn('Lenis not loaded, using native scroll.');
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
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.addEventListener('load', () => {
              img.classList.add('loaded');
            });
            imgObserver.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });

      images.forEach(img => imgObserver.observe(img));
    } else {
      // Fallback: load all
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
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
