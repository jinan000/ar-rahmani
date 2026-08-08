/* ============================================================
   AR-RAHMANI — Craftsmanship Animations (Horizontal Scroll Story)
   PERMANENT FIX: Initializes on window.load (not DOMContentLoaded)
   so ALL images, fonts, CSS, and layout are 100% settled before
   GSAP calculates pin positions. Self-heals on any layout change.
   ============================================================ */

(function() {
  "use strict";

  function initCraftsmanship() {
    // Ensure GSAP and ScrollTrigger are available
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const section = document.getElementById('craftsmanship');
    const scrollContainer = document.getElementById('craft-scroll-container');
    const progressBar = document.getElementById('craft-timeline-progress');

    if (!section || !scrollContainer) return;

    // Calculate the total horizontal scroll distance
    const getScrollAmount = () => scrollContainer.scrollWidth - window.innerWidth;

    // 1. Horizontal Scroll & Pinning Tween
    const tween = gsap.to(scrollContainer, {
      x: () => -getScrollAmount(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${getScrollAmount()}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 0,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (progressBar) {
            gsap.set(progressBar, { width: `calc(${self.progress * 100}% - 50vw)` });
          }
        }
      }
    });

    // 2. Cinematic Background Parallax
    const smokeLayer = document.getElementById('craft-bg-smoke');
    const lightLayer = document.getElementById('craft-bg-light');
    const dustLayer = document.getElementById('craft-bg-dust');

    if (smokeLayer) {
      gsap.to(smokeLayer, {
        x: "-10%",
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollAmount()}`,
          scrub: true
        }
      });
    }

    if (lightLayer) {
      gsap.to(lightLayer, {
        x: "-25%",
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollAmount()}`,
          scrub: true
        }
      });
    }

    if (dustLayer) {
      gsap.to(dustLayer, {
        x: "5%",
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${getScrollAmount()}`,
          scrub: true
        }
      });
    }

    // 3. Chapter Reveals (Using containerAnimation)
    const craftSteps = document.querySelectorAll('.craft-step');
    const markers = document.querySelectorAll('.craft-marker');

    craftSteps.forEach((step, index) => {
      const number = step.querySelector('.craft-step-number');
      const title = step.querySelector('.craft-step-title');
      const text = step.querySelector('.craft-step-text');
      const divider = step.querySelector('.craft-divider');
      const bottleImg = step.querySelector('.craft-bottle-img');
      const imageWrapper = step.querySelector('.craft-image-wrapper');
      const connector = step.querySelector('.craft-connector');
      const marker = markers[index];

      // Marker activation trigger
      ScrollTrigger.create({
        trigger: step,
        containerAnimation: tween,
        start: "center center",
        onEnter: () => marker && marker.classList.add('active'),
        onLeaveBack: () => marker && marker.classList.remove('active')
      });

      // Build the reveal timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: step,
          containerAnimation: tween,
          start: "left 70%",
          toggleActions: "play reverse play reverse"
        }
      });

      // Connector line grows
      if (connector) {
        tl.to(connector, { scaleY: 1, duration: 0.3, ease: "power2.out" }, 0);
      }

      // Image reveals
      if (imageWrapper) {
        tl.to(imageWrapper, {
          clipPath: 'polygon(0 0, 150% 0, 100% 100%, -50% 100%)',
          webkitClipPath: 'polygon(0 0, 150% 0, 100% 100%, -50% 100%)',
          duration: 0.6,
          ease: "power3.inOut"
        }, 0.2);
      }

      if (bottleImg) {
        tl.to(bottleImg, {
          opacity: 1, scale: 1, y: 0,
          duration: 0.6, ease: "power3.out",
          onComplete: () => startFloating(bottleImg),
          onReverseComplete: () => stopFloating(bottleImg)
        }, 0.2);
      }

      // Number watermark
      if (number) {
        gsap.set(number, { xPercent: -50, yPercent: -50, y: 40 });
        tl.to(number, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.3);
      }

      // Heading
      if (title) {
        tl.to(title, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.4);
      }

      // Divider
      if (divider) {
        tl.to(divider, { width: '100%', duration: 0.5, ease: "power3.inOut" }, 0.5);
      }

      // Paragraph
      if (text) {
        tl.to(text, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.5);
      }

      // Float animation
      let floatTween;
      function startFloating(element) {
        if (floatTween) floatTween.kill();
        floatTween = gsap.to(element, {
          y: -10,
          duration: 4 + Math.random() * 2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
      }

      function stopFloating(element) {
        if (floatTween) {
          floatTween.kill();
          gsap.to(element, { y: 0, duration: 1, ease: "power2.out" });
        }
      }
    });

    // ============================================================
    // PERMANENT SELF-HEALING: Detect ANY document height change
    // and refresh ScrollTrigger automatically.
    // This prevents bounce/jump no matter what CSS changes happen.
    // ============================================================
    let lastDocHeight = document.documentElement.scrollHeight;
    let refreshTimer;

    const safeRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        ScrollTrigger.refresh();
        lastDocHeight = document.documentElement.scrollHeight;
      }, 200);
    };

    // Resize handler
    window.addEventListener("resize", safeRefresh);

    // Self-healing: poll document height every 500ms for the first 5 seconds.
    // If height changes (due to dynamic content, lazy images, font swap),
    // refresh ScrollTrigger immediately.
    let pollCount = 0;
    const heightPoll = setInterval(() => {
      pollCount++;
      const currentHeight = document.documentElement.scrollHeight;
      if (currentHeight !== lastDocHeight) {
        lastDocHeight = currentHeight;
        ScrollTrigger.refresh();
      }
      if (pollCount >= 10) clearInterval(heightPoll); // Stop after 5 seconds
    }, 500);

    // ResizeObserver on sections above craftsmanship to catch layout shifts
    if (typeof ResizeObserver !== 'undefined') {
      const sectionsAbove = [];
      let sibling = section.previousElementSibling;
      while (sibling) {
        sectionsAbove.push(sibling);
        sibling = sibling.previousElementSibling;
      }

      if (sectionsAbove.length > 0) {
        const ro = new ResizeObserver(safeRefresh);
        sectionsAbove.forEach(el => ro.observe(el));
      }
    }

    console.log('[Craftsmanship] Initialized with permanent self-healing.');
  }

  // ============================================================
  // CRITICAL: Initialize on window.load, NOT DOMContentLoaded.
  // This ensures ALL images, fonts, CSS transitions, and dynamic
  // content are fully rendered before GSAP calculates pin positions.
  // ============================================================
  if (document.readyState === 'complete') {
    // Page already loaded (e.g. script loaded dynamically)
    initCraftsmanship();
  } else {
    window.addEventListener("load", () => {
      // Small delay to let Lenis, reveal animations, and any
      // post-load layout shifts fully settle before pinning.
      setTimeout(initCraftsmanship, 100);
    });
  }
})();
