/* ============================================================
   AR-RAHMANI — Animations Controller
   Mobile-Optimized (≤768px 60 FPS Engine)
   ============================================================ */

const Animations = {
  revealObserver: null,
  parallaxElements: [],
  tiltCards: [],
  scrollY: 0,
  lastScrollY: 0,
  ticking: false,

  init() {
    this.isMobile = window.innerWidth <= 768;

    this.setupRevealObserver(this.isMobile);
    
    this.setupNavbar();

    // Only initialize mouse parallax & 3D tilt on desktop screens
    if (!this.isMobile) {
      this.setupParallax();
      this.setupTiltCards();
    }
    
    this.setupSmoothScrollLinks();
    this.setupTestimonialScroll();

    // Passive scroll listener
    window.addEventListener('scroll', () => {
      this.scrollY = window.scrollY;

      if (!this.ticking) {
        requestAnimationFrame(() => {
          this.onScroll();
          this.ticking = false;
        });
        this.ticking = true;
      }
    }, { passive: true });
  },

  /* ----------------------------------------------------------
     INTERSECTION OBSERVER — Scroll Reveal (Mobile 1-Shot)
     ---------------------------------------------------------- */
  setupRevealObserver(isMobile) {
    const options = {
      root: null,
      rootMargin: isMobile ? '0px 0px -40px 0px' : '0px 0px -80px 0px',
      threshold: 0.05
    };

    this.revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');

          // Stagger children if parent has data-stagger
          if (entry.target.hasAttribute('data-stagger')) {
            const children = entry.target.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur');
            children.forEach((child, i) => {
              child.style.transitionDelay = isMobile ? `${i * 0.06}s` : `${i * 0.12}s`;
              setTimeout(() => {
                child.classList.add('revealed');
                // Requirement 10: Clear will-change after animation to free GPU memory
                setTimeout(() => { child.style.willChange = 'auto'; }, 600);
              }, 10);
            });
          }

          // Requirement 10: Clear will-change after animation
          setTimeout(() => { entry.target.style.willChange = 'auto'; }, 600);

          // Requirement 2: Trigger ONCE, never replay repeatedly
          this.revealObserver.unobserve(entry.target);
        }
      });
    }, options);

    // Observe all reveal elements
    document.querySelectorAll('.reveal, .reveal-up, .reveal-down, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur').forEach(el => {
      this.revealObserver.observe(el);
    });

    // Observe stagger containers
    document.querySelectorAll('[data-stagger]').forEach(el => {
      this.revealObserver.observe(el);
    });
  },

  /* ----------------------------------------------------------
     PARALLAX (Desktop Only)
     ---------------------------------------------------------- */
  setupParallax() {
    this.parallaxElements = document.querySelectorAll('[data-parallax]');
  },

  updateParallax() {
    if (!this.parallaxElements.length) return;
    const scrollY = this.scrollY;
    const viewH = window.innerHeight;

    this.parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const elTop = el.offsetTop;
      const elH = el.offsetHeight;
      const top = elTop - scrollY;

      if (top < viewH && top + elH > 0) {
        const offset = (top - viewH / 2) * speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
    });
  },

  /* ----------------------------------------------------------
     3D TILT CARDS (Desktop Only)
     ---------------------------------------------------------- */
  setupTiltCards() {
    this.tiltCards = document.querySelectorAll('.product-card');
    this.tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => this.handleTilt(e, card));
      card.addEventListener('mouseleave', () => this.resetTilt(card));
    });
  },

  handleTilt(e, card) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;
    card.style.setProperty('--glow-x', `${glowX}%`);
    card.style.setProperty('--glow-y', `${glowY}%`);
  },

  resetTilt(card) {
    card.style.transform = '';
  },

  /* ----------------------------------------------------------
     NAVBAR SCROLL BEHAVIOR (Desktop Only)
     ---------------------------------------------------------- */
  setupNavbar() {
    this.navbar = document.getElementById('navbar');
    this.navLinks = document.querySelectorAll('.navbar-links a[href^="#"]');
    this.sections = document.querySelectorAll('section[id]');
  },

  updateNavbar() {
    if (!this.navbar) return;

    if (this.scrollY > 80) {
      this.navbar.classList.add('scrolled');
      
      const delta = this.scrollY - this.lastScrollY;
      if (delta > 15) {
        this.navbar.classList.add('hidden');
      } else if (delta < -15) {
        this.navbar.classList.remove('hidden');
      }
    } else {
      this.navbar.classList.remove('scrolled');
      this.navbar.classList.remove('hidden');
    }

    // Only update lastScrollY if the scroll change was significant enough
    // to trigger a delta calculation, or if we are at the top.
    if (Math.abs(this.scrollY - this.lastScrollY) > 15 || this.scrollY <= 80) {
      this.lastScrollY = this.scrollY;
    }

    if (!this.isMobile) {
      let current = '';
      this.sections.forEach(section => {
        const sectionTop = section.offsetTop - this.scrollY;
        if (sectionTop <= 200) {
          current = section.id;
        }
      });

      this.navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
          link.classList.add('active');
        }
      });
    }
  },

  /* ----------------------------------------------------------
     SMOOTH SCROLL LINKS
     ---------------------------------------------------------- */
  setupSmoothScrollLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
          const offset = 80;
          const y = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: y, behavior: 'smooth' });

          const mobileNav = document.getElementById('mobile-nav');
          const menuToggle = document.getElementById('menu-toggle');
          if (mobileNav && mobileNav.classList.contains('active')) {
            mobileNav.classList.remove('active');
            menuToggle.classList.remove('active');
            document.body.style.overflow = '';
          }
        }
      });
    });
  },

  /* ----------------------------------------------------------
     TESTIMONIAL SCROLL
     ---------------------------------------------------------- */
  setupTestimonialScroll() {
    const track = document.querySelector('.testimonial-track');
    if (!track) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    track.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
    });

    track.addEventListener('mouseleave', () => { isDown = false; });
    track.addEventListener('mouseup', () => { isDown = false; });

    track.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 2;
      track.scrollLeft = scrollLeft - walk;
    });
  },

  onScroll() {
    this.updateNavbar();
    if (!this.isMobile) {
      this.updateParallax();
    }
  }
};
