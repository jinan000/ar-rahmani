/* ============================================================
   AR-RAHMANI — Premium Featured Product Showcase (Cinematic 3D)
   Handles product switching, GSAP 3D cinematic transitions,
   interactive parallax, and hardware-accelerated rendering loop.
   ============================================================ */

const FeaturedShowcase = {
  products: [
    {
      id: 0,
      name: "HAMOOD",
      subtitle: "PARFUM",
      label: "EXTRAIT DE PARFUM",
      desc: "A rich and opulent fragrance that embodies strength, elegance and timeless Arabic heritage.",
      price: "$180.00",
      image: "assets/images/hamood.png",
      scale: 2.2,
      heroSize: "85vh",
      previewSize: "240px",
      glowColor: "rgba(212, 175, 55, 0.08)",
      notes: {
        top: "Bergamot, Saffron, Cinnamon",
        heart: "Oud, Rose, Patchouli",
        base: "Amber, Musk, Vanilla"
      }
    },
    {
      id: 1,
      name: "PARADISE",
      subtitle: "EXOTIC BLEND",
      label: "EXTRAIT DE PARFUM",
      desc: "A paradise of tropical fruits, white flowers, and silky musk.",
      price: "$130.00",
      image: "assets/images/paradisee.png",
      scale: 1.4,
      heroSize: "60vh",
      previewSize: "180px",
      glowColor: "rgba(100, 200, 180, 0.06)",
      notes: {
        top: "Tropical Fruits, Bergamot, Coconut",
        heart: "White Flowers, Jasmine, Tiare",
        base: "Silky Musk, Vanilla, Amber"
      }
    },
    {
      id: 2,
      name: "SABR",
      subtitle: "ORIENTAL",
      label: "EXTRAIT DE PARFUM",
      desc: "Patience distilled — deep amber, sacred incense, and aged sandalwood.",
      price: "$150.00",
      image: "assets/images/sabr.png",
      scale: 1,
      heroSize: "52vh",
      previewSize: "160px",
      glowColor: "rgba(180, 150, 100, 0.06)",
      notes: {
        top: "Incense, Bergamot, Pink Pepper",
        heart: "Amber, Sandalwood, Patchouli",
        base: "Oud, Vetiver, Labdanum"
      }
    }
  ],

  activeId: 0,
  isAnimating: false,

  // Parallax and rendering state
  mouseX: 0,
  mouseY: 0,
  targetX: 0,
  targetY: 0,
  time: 0,
  rafId: null,

  init() {
    this.setupEventListeners();
    this.updateCards(true); // true = initial setup without animation
    this.startRenderLoop();
  },

  setupEventListeners() {
    const leftCard = document.getElementById("preview-left");
    const rightCard = document.getElementById("preview-right");
    const wishlistBtn = document.querySelector(".btn-wishlist");
    const container = document.querySelector(".showcase-container");

    // Click triggers
    if (leftCard) {
      leftCard.addEventListener("click", () => {
        this.switchProduct3D("left");
      });
    }

    if (rightCard) {
      rightCard.addEventListener("click", () => {
        this.switchProduct3D("right");
      });
    }

    if (wishlistBtn) {
      wishlistBtn.addEventListener("click", () => {
        wishlistBtn.classList.toggle("active");
      });
    }

    // --- Interactive Mouse Parallax ---
    if (container) {
      container.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        // Normalize coordinates to -1 to 1
        this.targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.targetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      });
      
      container.addEventListener("mouseleave", () => {
        this.targetX = 0;
        this.targetY = 0;
      });

      // --- Touch Swipe (Mobile) ---
      let touchStartX = 0;
      container.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      
      container.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) this.switchProduct3D("right");
        if (touchEndX - touchStartX > 50) this.switchProduct3D("left");
      });

      // --- Mouse Wheel ---
      let wheelTimeout;
      container.addEventListener("wheel", (e) => {
        // Prevent accidental vertical scrolls triggering side swipes
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
          e.preventDefault();
          if (this.isAnimating) return;
          clearTimeout(wheelTimeout);
          wheelTimeout = setTimeout(() => {
            if (e.deltaX > 0) this.switchProduct3D("right");
            else this.switchProduct3D("left");
          }, 50);
        }
      }, { passive: false });
    }

    // --- Keyboard Arrows ---
    document.addEventListener("keydown", (e) => {
      if (this.isAnimating || !container) return;
      const rect = container.getBoundingClientRect();
      // Only trigger if showcase is visible in viewport
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        if (e.key === "ArrowRight") this.switchProduct3D("right");
        if (e.key === "ArrowLeft") this.switchProduct3D("left");
      }
    });
  },

  startRenderLoop() {
    const heroImage = document.getElementById("showcase-hero-image");
    const reflection = document.getElementById("showcase-reflection-image");
    const shadow = document.getElementById("showcase-shadow");
    const glow = document.getElementById("showcase-glow");
    
    // Continuous hardware-accelerated 60FPS loop
    const render = () => {
      if (!this.isAnimating) {
        this.time += 0.015; // Drives the 7-9s subtle breathing

        // Smoothly interpolate mouse targets (lerp)
        this.mouseX += (this.targetX - this.mouseX) * 0.08;
        this.mouseY += (this.targetY - this.mouseY) * 0.08;

        // 1. Calculate Breathing Motion
        // 8px vertical float, 0.5deg rotation, very subtle scale pulse (0.995 to 1.005)
        const breatheY = Math.sin(this.time) * 8; 
        const breatheRot = Math.cos(this.time * 0.8) * 0.5; 
        const breatheScale = 1 + Math.sin(this.time * 1.2) * 0.005; 

        // 2. Calculate Parallax Motion
        // Max 6deg rotation based on mouse
        const parallaxRotY = this.mouseX * 6; 
        const parallaxRotX = -this.mouseY * 4;
        
        // 3. Apply Transforms to Hero Bottle and Reflection
        const activeProduct = FeaturedShowcase.products.find(p => p.id === FeaturedShowcase.activeId);
        const baseScale = activeProduct ? activeProduct.scale : 2.2;
        const finalScale = baseScale * breatheScale;
        
        const offsetX = 0;
        const transformString = `translate3d(${offsetX}px, ${breatheY}px, 0) rotateX(${parallaxRotX}deg) rotateY(${parallaxRotY}deg) rotateZ(${breatheRot}deg) scale3d(${finalScale}, ${finalScale}, 1)`;
        
        if (heroImage) heroImage.style.transform = transformString;
        if (reflection) reflection.style.transform = transformString;

        // 4. Dynamic Shadow
        // Shadow compresses when bottle is high, expands when low
        const shadowScale = 1 - (breatheY / 40);
        // Shadow shifts slightly opposite to mouse (light source assumption)
        const shadowX = -50 + this.mouseX * -10; 
        
        if (shadow) {
          shadow.style.transform = `translateX(${shadowX}%) scale(${shadowScale})`;
          shadow.style.opacity = 0.8 * shadowScale;
        }

        // 5. Dynamic Glow Shift
        if (glow) {
          glow.style.transform = `translate3d(${this.mouseX * -20}px, ${this.mouseY * -20}px, 0)`;
        }
      }
      this.rafId = requestAnimationFrame(render);
    };
    render();
  },

  switchProduct3D(directionOrId) {
    if (this.isAnimating) return;
    
    let targetId, direction;
    if (typeof directionOrId === "number") {
      targetId = directionOrId;
      direction = targetId > this.activeId ? "right" : "left";
    } else {
      direction = directionOrId;
      if (direction === "left") {
        targetId = this.activeId === 0 ? this.products.length - 1 : this.activeId - 1;
      } else {
        targetId = this.activeId === this.products.length - 1 ? 0 : this.activeId + 1;
      }
    }
    
    if (targetId === this.activeId) return;

    this.isAnimating = true;
    const nextProduct = this.products.find(p => p.id === targetId);
    this.activeId = targetId;

    // Elements
    const heroImage = document.getElementById("showcase-hero-image");
    const reflection = document.getElementById("showcase-reflection-image");
    const shadow = document.getElementById("showcase-shadow");
    const glow = document.getElementById("showcase-glow");
    
    const label = document.getElementById("showcase-label");
    const title = document.getElementById("showcase-title");
    const subtitle = document.getElementById("showcase-subtitle");
    const desc = document.getElementById("showcase-desc");
    const price = document.getElementById("showcase-price");
    const btnBag = document.querySelector(".btn-add-bag");
    const btnWish = document.querySelector(".btn-wishlist");
    
    const leftCard = document.getElementById("preview-left");
    const rightCard = document.getElementById("preview-right");

    // Clear continuous transforms before GSAP takes over
    if (heroImage) heroImage.style.transform = "";
    if (reflection) reflection.style.transform = "";

    const tl = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        // Let rAF take over again cleanly
        gsap.set([heroImage, reflection], { clearProps: "all" });
      }
    });

    const outX = direction === "left" ? 250 : -250;
    const inX = direction === "left" ? -250 : 250;
    const rotY = direction === "left" ? 18 : -18;

    // High-end cinematic easing
    const cineEase = "cubic-bezier(.22,.61,.36,1)";
    
    // Scale factors and Offsets
    const currentProduct = this.products.find(p => p.id === this.activeId);
    const currentScale = currentProduct ? currentProduct.scale : 2.2;
    const targetScale = nextProduct.scale;
    const targetOffsetX = 0;

    // ==========================================
    // PHASE 1: EXIT CURRENT PRODUCT
    // ==========================================
    tl.to([heroImage, reflection], {
      x: outX,
      z: -150, // Move backward diagonally
      rotationY: rotY,
      rotationX: 2,
      rotationZ: 1,
      scale: currentScale * 0.95,
      opacity: 0,
      filter: "blur(8px)",
      duration: 0.35,
      ease: cineEase
    }, 0);

    tl.to(shadow, { opacity: 0, scale: 0.5, duration: 0.3, ease: "power2.inOut" }, 0);
    tl.to(glow, { scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.inOut" }, 0);

    // Staggered text exit
    tl.to([label, title, subtitle, desc, price, ".showcase-notes-section", btnBag, btnWish], {
      y: -15,
      opacity: 0,
      stagger: 0.02,
      duration: 0.3,
      ease: "power2.in"
    }, 0);
    
    // Side cards physically rotate and fade back
    tl.to([leftCard, rightCard], {
      opacity: 0,
      z: -50,
      rotationY: rotY,
      duration: 0.3,
      ease: "power2.in"
    }, 0);

    // ==========================================
    // MIDPOINT: UPDATE DOM CONTENT
    // ==========================================
    tl.add(() => {
      // Update text data
      label.textContent = nextProduct.label;
      title.textContent = nextProduct.name;
      subtitle.textContent = nextProduct.subtitle;
      desc.textContent = nextProduct.desc;
      
      const notesTop = document.getElementById("notes-top");
      const notesHeart = document.getElementById("notes-heart");
      const notesBase = document.getElementById("notes-base");
      if(notesTop) notesTop.textContent = nextProduct.notes.top;
      if(notesHeart) notesHeart.textContent = nextProduct.notes.heart;
      if(notesBase) notesBase.textContent = nextProduct.notes.base;
      
      price.textContent = nextProduct.price;

      if (heroImage) {
        heroImage.src = nextProduct.image;
        heroImage.alt = nextProduct.name;
        // Dynamic hero sizing
        heroImage.style.setProperty('--hero-size', nextProduct.heroSize);
      }
      
      if (reflection) {
        reflection.src = nextProduct.image;
        reflection.style.setProperty('--hero-size', nextProduct.heroSize);
      }

      if (glow) {
        glow.style.background = `radial-gradient(circle at 50% 40%, ${nextProduct.glowColor} 0%, transparent 65%)`;
      }

      this.updateCards(false); 
    }, 0.35);

    // ==========================================
    // PHASE 2: ENTRANCE NEW PRODUCT
    // ==========================================
    // Camera-continuous smooth entry
    tl.fromTo([heroImage, reflection],
      { x: inX, z: -150, rotationY: -rotY, rotationX: 2, rotationZ: 1, scale: targetScale * 0.95, opacity: 0, filter: "blur(8px)" },
      { x: targetOffsetX, z: 0, rotationY: 0, rotationX: 0, rotationZ: 0, scale: targetScale, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: cineEase },
      0.35
    );

    tl.to(shadow, { opacity: 0.8, scale: 1, duration: 0.8, ease: cineEase }, 0.35);
    tl.to(glow, { scale: 1, opacity: 1, duration: 0.8, ease: cineEase }, 0.35);

    // Staggered text entrance
    tl.fromTo(label, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.4);
    tl.fromTo(title, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.45);
    tl.fromTo(subtitle, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.5);
    tl.fromTo(desc, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.55);
    tl.fromTo(".showcase-notes-section", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.6);
    tl.fromTo(price, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.65);
    tl.fromTo([btnBag, btnWish], { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.6, ease: "power3.out" }, 0.7);

    // Side cards slide in
    tl.fromTo([leftCard, rightCard],
      { opacity: 0, z: -50, rotationY: -rotY },
      { opacity: 1, z: 0, rotationY: 0, duration: 0.6, ease: cineEase },
      0.45
    );
  },

  updateCards(isInitial = false) {
    const leftCard = document.getElementById("preview-left");
    const rightCard = document.getElementById("preview-right");

    const leftImg = document.getElementById("preview-left-image");
    const leftName = document.getElementById("preview-left-name");
    const leftPrice = document.getElementById("preview-left-price");

    const rightImg = document.getElementById("preview-right-image");
    const rightName = document.getElementById("preview-right-name");
    const rightPrice = document.getElementById("preview-right-price");

    if (!leftCard || !rightCard) return;

    let leftIndex, rightIndex;
    leftIndex = this.activeId === 0 ? this.products.length - 1 : this.activeId - 1;
    rightIndex = this.activeId === this.products.length - 1 ? 0 : this.activeId + 1;

    const leftProduct = this.products[leftIndex];
    const rightProduct = this.products[rightIndex];

    leftCard.dataset.target = leftProduct.id;
    if(leftImg) {
      leftImg.src = leftProduct.image;
      leftImg.alt = leftProduct.name;
      leftImg.style.setProperty('--preview-size', leftProduct.previewSize);
    }
    if(leftName) leftName.textContent = leftProduct.name;
    if(leftPrice) leftPrice.textContent = leftProduct.price;

    rightCard.dataset.target = rightProduct.id;
    if(rightImg) {
      rightImg.src = rightProduct.image;
      rightImg.alt = rightProduct.name;
      rightImg.style.setProperty('--preview-size', rightProduct.previewSize);
    }
    if(rightName) rightName.textContent = rightProduct.name;
    if(rightPrice) rightPrice.textContent = rightProduct.price;
  }
};

/* ============================================================
   BOOT
   ============================================================ */
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FeaturedShowcase.init());
  } else {
    FeaturedShowcase.init();
  }
})();
