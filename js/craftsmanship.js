/* ============================================================
   AR-RAHMANI — Craftsmanship Animations (Horizontal Scroll Story)
   NATIVE CSS STICKY SCROLL ENGINE:
   - Outer section #craftsmanship has CSS height: 350vh.
   - Inner container #craft-pin-wrapper has CSS position: sticky; top: 0; height: 100vh.
   - Browser compositor natively handles viewport pinning.
   - GSAP ScrollTrigger purely maps window scroll progress (start: "top top", end: "bottom bottom")
     to translate x from 0 to -getScrollAmount().
   - ZERO GSAP DOM pinning, ZERO pin-spacers, ZERO BFCache/back-button/checkout bugs!
   ============================================================ */

(function() {
  "use strict";

  function initCraftsmanship() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const section = document.getElementById('craftsmanship');
    const scrollContainer = document.getElementById('craft-scroll-container');
    const progressBar = document.getElementById('craft-timeline-progress');

    if (!section || !scrollContainer) return;

    // Total horizontal scroll distance calculation
    const getScrollAmount = () => scrollContainer.scrollWidth - window.innerWidth;

    // Parallax background layers
    const smokeLayer = document.getElementById('craft-bg-smoke');
    const lightLayer = document.getElementById('craft-bg-light');
    const dustLayer = document.getElementById('craft-bg-dust');

    // ============================================================
    // MASTER TIMELINE: Pure scroll-driven translation mapped to
    // native CSS position: sticky track (#craftsmanship)
    // ============================================================
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        refreshPriority: 1,
        onUpdate: (self) => {
          if (progressBar) {
            gsap.set(progressBar, { width: `calc(${self.progress * 100}% - 50vw)` });
          }
        }
      }
    });

    // 1. Primary Horizontal Scroll Translation
    masterTl.to(scrollContainer, {
      x: () => -getScrollAmount(),
      ease: "none"
    }, 0);

    // 2. Parallax Layers
    if (smokeLayer) {
      masterTl.to(smokeLayer, { x: "-10%", ease: "none" }, 0);
    }
    if (lightLayer) {
      masterTl.to(lightLayer, { x: "-25%", ease: "none" }, 0);
    }
    if (dustLayer) {
      masterTl.to(dustLayer, { x: "5%", ease: "none" }, 0);
    }

    // 3. Chapter Reveals (Using containerAnimation mapped to masterTl)
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
        containerAnimation: masterTl,
        start: "center center",
        onEnter: () => marker && marker.classList.add('active'),
        onLeaveBack: () => marker && marker.classList.remove('active')
      });

      // Build chapter reveal timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: step,
          containerAnimation: masterTl,
          start: "left 70%",
          toggleActions: "play reverse play reverse"
        }
      });

      if (connector) {
        tl.to(connector, { scaleY: 1, duration: 0.3, ease: "power2.out" }, 0);
      }

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

      if (number) {
        gsap.set(number, { xPercent: -50, yPercent: -50, y: 40 });
        tl.to(number, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.3);
      }

      if (title) {
        tl.to(title, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.4);
      }

      if (divider) {
        tl.to(divider, { width: '100%', duration: 0.5, ease: "power3.inOut" }, 0.5);
      }

      if (text) {
        tl.to(text, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0.5);
      }

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

    // Window resize handler
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
    });

    // Handle BFCache (back/forward cache) navigation
    window.addEventListener("pageshow", () => {
      setTimeout(() => {
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      }, 150);
    });

    // Initial calculation after paints
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);
  }

  if (document.readyState === 'complete') {
    initCraftsmanship();
  } else {
    window.addEventListener("load", () => {
      setTimeout(initCraftsmanship, 100);
    });
  }
})();
