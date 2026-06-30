/* ============================================================
   AR-RAHMANI — Animations Controller
   Scroll reveals, parallax, 3D tilt, counter animations
   ============================================================ */

const Animations = {
  revealObserver: null,
  parallaxElements: [],
  tiltCards: [],
  scrollY: 0,
  lastScrollY: 0,
  ticking: false,

  init() {
    this.setupRevealObserver();
    this.setupParallax();
    this.setupTiltCards();
    this.setupNavbar();
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
     INTERSECTION OBSERVER — Scroll Reveal
     ---------------------------------------------------------- */
  setupRevealObserver() {
    const options = {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.1
    };

    this.revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');

          // Stagger children if parent has data-stagger
          if (entry.target.hasAttribute('data-stagger')) {
            const children = entry.target.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale, .reveal-blur');
            children.forEach((child, i) => {
              child.style.transitionDelay = `${i * 0.12}s`;
              setTimeout(() => child.classList.add('revealed'), 10);
            });
          }

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
     PARALLAX
     ---------------------------------------------------------- */
  setupParallax() {
    this.parallaxElements = document.querySelectorAll('[data-parallax]');
  },

  updateParallax() {
    this.parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;

      if (visible) {
        const offset = (rect.top - window.innerHeight / 2) * speed;
        el.style.transform = `translateY(${offset}px)`;
      }
    });
  },

  /* ----------------------------------------------------------
     3D TILT CARDS
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

    // Move the glow effect
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;
    card.style.setProperty('--glow-x', `${glowX}%`);
    card.style.setProperty('--glow-y', `${glowY}%`);
  },

  resetTilt(card) {
    card.style.transform = '';
  },

  /* ----------------------------------------------------------
     NAVBAR SCROLL BEHAVIOR
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
      
      // Hide when scrolling down, show when scrolling up
      if (this.scrollY > this.lastScrollY) {
        this.navbar.classList.add('hidden');
      } else {
        this.navbar.classList.remove('hidden');
      }
    } else {
      this.navbar.classList.remove('scrolled');
      this.navbar.classList.remove('hidden');
    }

    this.lastScrollY = this.scrollY;

    // Active section tracking
    let current = '';
    this.sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= 200) {
        current = section.id;
      }
    });

    this.navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
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

          // Close mobile nav if open
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
     TESTIMONIAL AUTO-SCROLL
     ---------------------------------------------------------- */
  setupTestimonialScroll() {
    const track = document.getElementById('testimonial-track');
    if (!track) return;

    let scrollAmount = 0;
    const speed = 0.5;
    let isPaused = false;

    track.addEventListener('mouseenter', () => isPaused = true);
    track.addEventListener('mouseleave', () => isPaused = false);

    const autoScroll = () => {
      if (!isPaused) {
        scrollAmount += speed;
        if (scrollAmount >= track.scrollWidth / 2) {
          scrollAmount = 0;
        }
        track.scrollLeft = scrollAmount;
      }
      requestAnimationFrame(autoScroll);
    };

    autoScroll();
  },

  /* ----------------------------------------------------------
     MAIN SCROLL HANDLER
     ---------------------------------------------------------- */
  onScroll() {
    this.updateNavbar();
    this.updateParallax();
  }
};
