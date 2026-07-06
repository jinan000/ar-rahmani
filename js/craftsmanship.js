/* ============================================================
   AR-RAHMANI — Craftsmanship Animations (Horizontal Scroll Story)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Ensure GSAP and ScrollTrigger are available
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  const section = document.getElementById('craftsmanship');
  const scrollContainer = document.getElementById('craft-scroll-container');
  const progressBar = document.getElementById('craft-timeline-progress');
  
  if (!section || !scrollContainer) return;

  // Calculate the total horizontal scroll distance
  // We want to scroll enough so the last element is centered or visible, 
  // but we added padding to the container to handle start/end gracefully.
  const getScrollAmount = () => scrollContainer.scrollWidth - window.innerWidth;

  // 1. Horizontal Scroll & Pinning Tween
  const tween = gsap.to(scrollContainer, {
    x: () => -getScrollAmount(),
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top -15%", // Pin slightly higher to reduce empty space at the top
      end: () => `+=${getScrollAmount()}`,
      pin: true,
      scrub: 1, // Smooth scrubbing
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Animate the gold timeline width based on scrub progress.
        // Subtracting 50vw keeps the tip of the line perfectly centered on the screen, 
        // matching the "left center" trigger for the chapters!
        gsap.set(progressBar, { width: `calc(${self.progress * 100}% - 50vw)` });
      }
    }
  });

  // 2. Cinematic Background Parallax
  // Move the background layers slightly differently to create depth as the user scrolls
  const smokeLayer = document.getElementById('craft-bg-smoke');
  const lightLayer = document.getElementById('craft-bg-light');
  const dustLayer = document.getElementById('craft-bg-dust');

  gsap.to(smokeLayer, {
    x: "-10%",
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top -15%",
      end: () => `+=${getScrollAmount()}`,
      scrub: true
    }
  });

  gsap.to(lightLayer, {
    x: "-25%",
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top -15%",
      end: () => `+=${getScrollAmount()}`,
      scrub: true
    }
  });

  gsap.to(dustLayer, {
    x: "5%",
    ease: "none",
    scrollTrigger: {
      trigger: section,
      start: "top -15%",
      end: () => `+=${getScrollAmount()}`,
      scrub: true
    }
  });

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

    // Marker activation trigger (exactly when center hits center)
    ScrollTrigger.create({
      trigger: step,
      containerAnimation: tween,
      start: "center center",
      onEnter: () => marker && marker.classList.add('active'),
      onLeaveBack: () => marker && marker.classList.remove('active')
    });

    // Build the reveal timeline for this chapter (starts earlier and plays faster)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: step,
        containerAnimation: tween,
        start: "left 70%", // Triggers before the center reaches the center
        toggleActions: "play reverse play reverse"
      }
    });

    // 1. Connector line grows
    if (connector) {
      tl.to(connector, {
        scaleY: 1, // Note: transform-origin is 'bottom' in CSS, so it grows UP to the image
        duration: 0.3,
        ease: "power2.out"
      }, 0);
    }

    // 2. Image reveals
    // Mask reveal for the image wrapper (Diagonal wipe)
    tl.to(imageWrapper, {
      clipPath: 'polygon(0 0, 150% 0, 100% 100%, -50% 100%)',
      webkitClipPath: 'polygon(0 0, 150% 0, 100% 100%, -50% 100%)',
      duration: 0.6,
      ease: "power3.inOut"
    }, 0.2);

    // Reveal bottle image inside the wrapper
    tl.to(bottleImg, {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      y: 0,
      duration: 0.6,
      ease: "power3.out",
      onComplete: () => startFloating(bottleImg),
      onReverseComplete: () => stopFloating(bottleImg)
    }, 0.2);

    // Number watermark
    if (number) {
      // Pre-set the transform values so GSAP doesn't overwrite the CSS centering
      gsap.set(number, { xPercent: -50, yPercent: -50, y: 40 });
      tl.to(number, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power3.out"
      }, 0.3);
    }

    // 3. Heading fades upward
    tl.to(title, {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: "power3.out"
    }, 0.4);

    // Divider
    tl.to(divider, {
      width: '100%',
      duration: 0.5,
      ease: "power3.inOut"
    }, 0.5);

    // 4. Paragraph fades upward
    tl.to(text, {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: "power3.out"
    }, 0.5);

    // Subtle Float Animation Logic for bottles
    let floatTween;
    function startFloating(element) {
      if (floatTween) floatTween.kill();
      floatTween = gsap.to(element, {
        y: -10,
        duration: 4 + Math.random() * 2, // 4-6 seconds
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

  // Recalculate everything on resize
  window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
  });
});
