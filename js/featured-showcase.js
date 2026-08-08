/* ============================================================
   AR-RAHMANI — Premium Featured Product Showcase (Cinematic 3D)
   Dedicated Showcase for Flagship Perfumes: HAMOOD, PARADISE, SABR
   ============================================================ */

const FeaturedShowcase = {
  products: [
    {
      id: 0,
      name: "HAMOOD",
      subtitle: "PARFUM",
      label: "EXTRAIT DE PARFUM",
      desc: "A rich and opulent fragrance that embodies strength, elegance and timeless Arabic heritage.",
      price: "70",
      currency: "AED",
      image: "assets/images/4.webp",
      scale: 1.35,
      heroSize: "58vh",
      previewSize: "100px",
      glowColor: "rgba(212, 175, 55, 0.08)",
      selectedSize: "60ml",
      shopifyVariantId: null,
      variants: [
        { id: "variant_hamood_60ml", title: "60ml", price: "70.0" },
        { id: "variant_hamood_100ml", title: "100ml", price: "100.0" }
      ],
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
      price: "70",
      currency: "AED",
      image: "assets/images/5.webp",
      scale: 1.35,
      heroSize: "58vh",
      previewSize: "100px",
      glowColor: "rgba(100, 200, 180, 0.06)",
      selectedSize: "60ml",
      shopifyVariantId: null,
      variants: [
        { id: "variant_paradise_60ml", title: "60ml", price: "70.0" },
        { id: "variant_paradise_100ml", title: "100ml", price: "100.0" }
      ],
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
      price: "70",
      currency: "AED",
      image: "assets/images/sabr.webp",
      scale: 1.35,
      heroSize: "58vh",
      previewSize: "100px",
      glowColor: "rgba(180, 150, 100, 0.06)",
      selectedSize: "60ml",
      shopifyVariantId: null,
      variants: [
        { id: "variant_sabr_60ml", title: "60ml", price: "70.0" },
        { id: "variant_sabr_100ml", title: "100ml", price: "100.0" }
      ],
      notes: {
        top: "Incense, Bergamot, Pink Pepper",
        heart: "Amber, Sandalwood, Patchouli",
        base: "Oud, Vetiver, Labdanum"
      }
    }
  ],

  activeId: 0,
  isAnimating: false,
  mouseX: 0,
  mouseY: 0,
  targetX: 0,
  targetY: 0,
  time: 0,
  rafId: null,

  async init() {
    this.setupEventListeners();
    await this.fetchShopifyProducts();
    this.updateCards(true);
    this.startRenderLoop();
  },

  async fetchShopifyProducts() {
    try {
      if (typeof ShopifyAPI === 'undefined') return;
      const shopifyProducts = await ShopifyAPI.getProducts(50);

      if (shopifyProducts && shopifyProducts.length > 0) {
        // Sync live Shopify Storefront API variant IDs and pricing directly to HAMOOD, PARADISE, and SABR
        this.products.forEach(prod => {
          const matched = shopifyProducts.find(sp => 
            sp.title.toLowerCase().includes(prod.name.toLowerCase()) ||
            prod.name.toLowerCase().includes(sp.title.toLowerCase())
          );

          if (matched) {
            prod.shopifyId = matched.id;
            const variants = matched.variants?.edges?.map(e => e.node) || [];
            if (variants.length > 0) {
              prod.variants = variants;
              prod.selectedVariantId = variants[0].id;
              prod.shopifyVariantId = variants[0].id;
              const minPrice = matched.priceRange?.minVariantPrice;
              if (minPrice) {
                prod.price = `${parseFloat(variants[0].price?.amount || minPrice.amount).toFixed(0)}`;
                prod.currency = minPrice.currencyCode || 'AED';
              }
            }
          }
        });
      }
    } catch (e) {
      console.warn('Shopify sync info for showcase:', e);
    }
  },

  setupEventListeners() {
    const leftCard = document.getElementById("preview-left");
    const rightCard = document.getElementById("preview-right");
    const wishlistBtn = document.querySelector(".btn-wishlist");
    const container = document.querySelector(".showcase-container");

    if (leftCard) leftCard.addEventListener("click", () => this.switchProduct3D("left"));
    if (rightCard) rightCard.addEventListener("click", () => this.switchProduct3D("right"));

    if (wishlistBtn) {
      wishlistBtn.addEventListener("click", () => wishlistBtn.classList.toggle("active"));
    }

    // Handle Size Variant Selector Buttons
    document.addEventListener("click", (e) => {
      const sizeBtn = e.target.closest(".size-btn");
      if (sizeBtn) {
        const selectedSize = sizeBtn.dataset.size;
        this.selectVariantSize(selectedSize);
      }
    });

    // Interactive Mouse Parallax
    if (container) {
      container.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        this.targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.targetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      });
      
      container.addEventListener("mouseleave", () => {
        this.targetX = 0;
        this.targetY = 0;
      });

      let touchStartX = 0;
      container.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });
      
      container.addEventListener("touchend", (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50) this.switchProduct3D("right");
        if (touchEndX - touchStartX > 50) this.switchProduct3D("left");
      });
    }

    document.addEventListener("keydown", (e) => {
      if (this.isAnimating || !container) return;
      const rect = container.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        if (e.key === "ArrowRight") this.switchProduct3D("right");
        if (e.key === "ArrowLeft") this.switchProduct3D("left");
      }
    });
  },

  selectVariantSize(sizeTitle) {
    const activeProduct = this.products[this.activeId];
    if (!activeProduct || !activeProduct.variants) return;

    const matchedVariant = activeProduct.variants.find(v => 
      v.title.toLowerCase().includes(sizeTitle.toLowerCase())
    );

    if (matchedVariant) {
      activeProduct.selectedVariantId = matchedVariant.id;
      activeProduct.selectedSize = matchedVariant.title;
      if (matchedVariant.price?.amount) {
        activeProduct.price = `${parseFloat(matchedVariant.price.amount).toFixed(0)}`;
      } else if (matchedVariant.price) {
        activeProduct.price = `${parseFloat(matchedVariant.price).toFixed(0)}`;
      }

      const priceEl = document.getElementById("showcase-price");
      const currencyEl = document.getElementById("showcase-currency");
      if (priceEl) priceEl.textContent = activeProduct.price;
      if (currencyEl) currencyEl.textContent = activeProduct.currency || "AED";

      document.querySelectorAll(".size-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.size.toLowerCase() === sizeTitle.toLowerCase());
      });
    }
  },

  startRenderLoop() {
    const heroImage = document.getElementById("showcase-hero-image");
    const reflection = document.getElementById("showcase-reflection-image");
    const shadow = document.getElementById("showcase-shadow");
    const glow = document.getElementById("showcase-glow");
    const showcaseSection = document.getElementById("showcase");
    
    let isVisible = true;

    if (showcaseSection) {
      const observer = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !this.rafId) {
          this.rafId = requestAnimationFrame(render);
        }
      }, { rootMargin: '200px' });
      observer.observe(showcaseSection);
    }

    const render = () => {
      if (!isVisible) {
        this.rafId = null;
        return;
      }

      if (!this.isAnimating && showcaseSection) {
        this.time += 0.015;

        this.mouseX += (this.targetX - this.mouseX) * 0.08;
        this.mouseY += (this.targetY - this.mouseY) * 0.08;

        const breatheY = Math.sin(this.time) * 8; 
        const breatheRot = Math.cos(this.time * 0.8) * 0.5; 
        const breatheScale = 1 + Math.sin(this.time * 1.2) * 0.005; 

        const parallaxRotY = this.mouseX * 6; 
        const parallaxRotX = -this.mouseY * 4;
        
        const activeProduct = FeaturedShowcase.products.find(p => p.id === FeaturedShowcase.activeId);
        const baseScale = activeProduct ? activeProduct.scale : 1.35;
        const finalScale = baseScale * breatheScale;
        
        const transformString = `translate3d(0px, ${breatheY}px, 0) rotateX(${parallaxRotX}deg) rotateY(${parallaxRotY}deg) rotateZ(${breatheRot}deg) scale3d(${finalScale}, ${finalScale}, 1)`;
        
        if (heroImage) heroImage.style.transform = transformString;
        if (reflection) reflection.style.transform = transformString;

        const shadowScale = 1 - (breatheY / 40);
        const shadowX = -50 + this.mouseX * -10; 
        
        if (shadow) {
          shadow.style.transform = `translateX(${shadowX}%) scale(${shadowScale})`;
          shadow.style.opacity = 0.8 * shadowScale;
        }

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

    const heroImage = document.getElementById("showcase-hero-image");
    const reflection = document.getElementById("showcase-reflection-image");
    const shadow = document.getElementById("showcase-shadow");
    const glow = document.getElementById("showcase-glow");
    
    const label = document.getElementById("showcase-label");
    const title = document.getElementById("showcase-title");
    const subtitle = document.getElementById("showcase-subtitle");
    const desc = document.getElementById("showcase-desc");
    const price = document.getElementById("showcase-price");
    const currency = document.getElementById("showcase-currency");
    const btnBag = document.querySelector(".btn-add-bag");
    const btnWish = document.querySelector(".btn-wishlist");
    
    const leftCard = document.getElementById("preview-left");
    const rightCard = document.getElementById("preview-right");

    if (heroImage) heroImage.style.transform = "";
    if (reflection) reflection.style.transform = "";

    const tl = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        gsap.set([heroImage, reflection], { clearProps: "all" });
      }
    });

    const outX = direction === "left" ? 250 : -250;
    const inX = direction === "left" ? -250 : 250;
    const rotY = direction === "left" ? 18 : -18;
    const cineEase = "cubic-bezier(.22,.61,.36,1)";
    
    const currentProduct = this.products.find(p => p.id === this.activeId);
    const currentScale = currentProduct ? currentProduct.scale : 1.35;
    const targetScale = nextProduct.scale;

    tl.to([heroImage, reflection], {
      x: outX,
      z: -150,
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

    tl.to([label, title, subtitle, desc, price, "#showcase-variant-section", ".showcase-notes-section", btnBag, btnWish], {
      y: -15,
      opacity: 0,
      stagger: 0.02,
      duration: 0.3,
      ease: "power2.in"
    }, 0);
    
    tl.to([leftCard, rightCard], {
      opacity: 0,
      z: -50,
      rotationY: rotY,
      duration: 0.3,
      ease: "power2.in"
    }, 0);

    tl.add(() => {
      if (label) label.textContent = nextProduct.label;
      if (title) title.textContent = nextProduct.name;
      if (subtitle) subtitle.textContent = nextProduct.subtitle;
      if (desc) desc.textContent = nextProduct.desc;
      
      const notesTop = document.getElementById("notes-top");
      const notesHeart = document.getElementById("notes-heart");
      const notesBase = document.getElementById("notes-base");
      if(notesTop) notesTop.textContent = nextProduct.notes?.top || "";
      if(notesHeart) notesHeart.textContent = nextProduct.notes?.heart || "";
      if(notesBase) notesBase.textContent = nextProduct.notes?.base || "";
      
      if (price) price.textContent = nextProduct.price;
      if (currency) currency.textContent = nextProduct.currency || "AED";

      document.querySelectorAll(".size-btn").forEach((btn, i) => {
        btn.classList.toggle("active", i === 0);
      });

      if (heroImage) {
        heroImage.src = nextProduct.image;
        heroImage.alt = nextProduct.name;
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

    tl.fromTo([heroImage, reflection],
      { x: inX, z: -150, rotationY: -rotY, rotationX: 2, rotationZ: 1, scale: targetScale * 0.95, opacity: 0, filter: "blur(8px)" },
      { x: 0, z: 0, rotationY: 0, rotationX: 0, rotationZ: 0, scale: targetScale, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: cineEase },
      0.35
    );

    tl.to(shadow, { opacity: 0.8, scale: 1, duration: 0.8, ease: cineEase }, 0.35);
    tl.to(glow, { scale: 1, opacity: 1, duration: 0.8, ease: cineEase }, 0.35);

    tl.fromTo(label, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.4);
    tl.fromTo(title, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.45);
    tl.fromTo(subtitle, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.5);
    tl.fromTo(desc, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.55);
    tl.fromTo("#showcase-variant-section", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.6);
    tl.fromTo(price, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.65);
    tl.fromTo([btnBag, btnWish], { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.6, ease: "power3.out" }, 0.7);

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

// Boot
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FeaturedShowcase.init());
  } else {
    FeaturedShowcase.init();
  }
})();
