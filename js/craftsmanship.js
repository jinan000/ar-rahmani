/* ============================================================
   AR-RAHMANI — Craftsmanship Animations (Horizontal Scroll Story)
   PERMANENT BOUNCE-FREE FIX:
   1. anticipatePin: 1 prevents 1-frame entry bounce on smooth scroll.
   2. scrub: 1 provides buttery smooth horizontal scroll momentum.
   3. NO mid-scroll ScrollTrigger.refresh() calls (removed ResizeObserver
      and height polling which were forcing unpin/re-pin during scroll).
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

    // Calculate the total horizontal scroll distance
    const getScrollAmount = () => scrollContainer.scrollWidth - window.innerWidth;

    // 1. Main Pin & Horizontal Scroll Animation
    const tween = gsap.to(scrollContainer, {
      x: () => -getScrollAmount(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${getScrollAmount()}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1, // Eliminates entry bounce on smooth scroll
        scrub: 1,         // Smooth 1s momentum glide (no micro-stutters)
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
          scrub: 1
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
          scrub: 1
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
          scrub: 1
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

      // Build chapter reveal timeline
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: step,
          containerAnimation: tween,
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

    // 4. Handle Window Resize Safely (Debounced, strictly on user window resize)
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 250);
    });

    // Initial calculation after all elements are painted
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);
  }

  // Initialize on window load when images, fonts, and DOM layout are 100% complete
  if (document.readyState === 'complete') {
    initCraftsmanship();
  } else {
    window.addEventListener("load", () => {
      setTimeout(initCraftsmanship, 100);
    });
  }
})();
