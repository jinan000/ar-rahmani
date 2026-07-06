/* ============================================================
   STORYTELLING SCROLL (Anna Twelve Inspired)
   GSAP ScrollTrigger Animation
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  // Helper function to animate text lines in an editorial style
  function createTextReveal(timeline, linesArray, startTime) {
    timeline.to(linesArray, {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 1.2,
      stagger: 0.15,
      ease: "power3.out"
    }, startTime);
  }

  // Helper function to animate text lines out
  function createTextHide(timeline, linesArray, startTime) {
    timeline.to(linesArray, {
      y: -20,
      opacity: 0,
      filter: "blur(5px)",
      duration: 1,
      stagger: 0.1,
      ease: "power2.inOut"
    }, startTime);
  }

  const slides = {
    hamood: {
      el: document.getElementById('anna-slide-hamood'),
      img: document.querySelector('#anna-slide-hamood .anna-perfume-img'),
      lines: document.querySelectorAll('#anna-slide-hamood .anna-line')
    },
    sabr: {
      el: document.getElementById('anna-slide-sabr'),
      img: document.querySelector('#anna-slide-sabr .anna-perfume-img'),
      lines: document.querySelectorAll('#anna-slide-sabr .anna-line')
    },
    paradise: {
      el: document.getElementById('anna-slide-paradise'),
      img: document.querySelector('#anna-slide-paradise .anna-perfume-img'),
      lines: document.querySelectorAll('#anna-slide-paradise .anna-line')
    }
  };

  // Main Master Timeline pinned to the section
  const masterTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#story-scroll",
      start: "top top",
      end: "+=400%", // 400vh duration
      scrub: 1, // Smooth scrubbing (1 second delay for buttery feel)
      pin: ".anna-sticky-container",
      anticipatePin: 1
    }
  });

  /* ----------------------------------------------------------
     PHASE 1: HAMOOD ENTER & HOLD
     ---------------------------------------------------------- */
  // Initial state setup (managed by CSS but enforced by GSAP)
  gsap.set(slides.sabr.el, { autoAlpha: 0 });
  gsap.set(slides.paradise.el, { autoAlpha: 0 });

  // HAMOOD Text Reveal
  createTextReveal(masterTl, slides.hamood.lines, 0);

  // HAMOOD Image Scale Up
  masterTl.to(slides.hamood.img, {
    scale: 1,
    y: -10, // subtle float
    duration: 2,
    ease: "none" // scrubbed, so linear is best
  }, 0);

  // Hold phase
  masterTl.to({}, { duration: 1 });

  /* ----------------------------------------------------------
     PHASE 2: HAMOOD OUT -> SABR IN
     ---------------------------------------------------------- */
  const tSabrIn = masterTl.duration(); // get current time

  // HAMOOD Fade Out
  createTextHide(masterTl, slides.hamood.lines, tSabrIn);
  masterTl.to(slides.hamood.img, {
    scale: 0.95,
    opacity: 0,
    filter: "blur(10px)",
    duration: 1.5,
    ease: "power2.inOut"
  }, tSabrIn);

  // Show SABR container
  masterTl.to(slides.sabr.el, { autoAlpha: 1, duration: 0.1 }, tSabrIn);

  // SABR Image Reveal (Morphing feel)
  masterTl.fromTo(slides.sabr.img, 
    { scale: 0.9, opacity: 0, filter: "blur(10px)", y: 20 },
    { scale: 1, opacity: 1, filter: "blur(0px)", y: -10, duration: 2, ease: "power2.out" },
    tSabrIn + 0.5
  );

  // SABR Text Reveal
  createTextReveal(masterTl, slides.sabr.lines, tSabrIn + 1);

  // Hold phase
  masterTl.to({}, { duration: 1 });

  /* ----------------------------------------------------------
     PHASE 3: SABR OUT -> PARADISE IN
     ---------------------------------------------------------- */
  const tParadiseIn = masterTl.duration();

  // SABR Fade Out
  createTextHide(masterTl, slides.sabr.lines, tParadiseIn);
  masterTl.to(slides.sabr.img, {
    scale: 0.95,
    opacity: 0,
    filter: "blur(10px)",
    duration: 1.5,
    ease: "power2.inOut"
  }, tParadiseIn);

  // Show PARADISE container
  masterTl.to(slides.paradise.el, { autoAlpha: 1, duration: 0.1 }, tParadiseIn);

  // PARADISE Image Reveal
  masterTl.fromTo(slides.paradise.img, 
    { scale: 0.9, opacity: 0, filter: "blur(10px)", y: 20 },
    { scale: 1, opacity: 1, filter: "blur(0px)", y: -10, duration: 2, ease: "power2.out" },
    tParadiseIn + 0.5
  );

  // PARADISE Text Reveal
  createTextReveal(masterTl, slides.paradise.lines, tParadiseIn + 1);

  // Hold phase at the end so user can read before it unpins
  masterTl.to({}, { duration: 1 });

});
