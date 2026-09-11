/* ============================================================
   AR-RAHMANI — Collection Page Module
   Full catalogue experience with navigation to product detail page
   ============================================================ */

const CollectionPage = {
  /* ---- State ---- */
  allProducts: [],
  filteredProducts: [],
  activeFilter: 'all',
  searchQuery: '',
  sortBy: 'newest',
  observers: [],
  dustCanvas: null,
  dustCtx: null,
  dustParticles: [],
  dustRaf: null,
  dustVisible: false,
  _isFetching: false,
  _hasFetched: false,

  /**
   * Shopify CDN Image URL helper
   */
  getOptimizedImageUrl(url, width = 600) {
    if (!url) return 'assets/images/hamood.webp';
    if (url.includes('cdn.shopify.com')) {
      return url.includes('?') ? `${url}&width=${width}` : `${url}?width=${width}`;
    }
    return url;
  },

  /**
   * Preload primary and hover images
   */
  preloadImages(products) {
    const isMobile = window.innerWidth <= 768;
    const limit = isMobile ? 4 : 20;
    products.slice(0, limit).forEach(product => {
      if (product.images[0]?.url) {
        const img1 = new Image();
        img1.src = this.getOptimizedImageUrl(product.images[0].url, 600);
      }
      if (!isMobile && product.images[1]?.url) {
        const img2 = new Image();
        img2.src = this.getOptimizedImageUrl(product.images[1].url, 600);
      }
    });
  },

  /* ============================================================
     INIT
     ============================================================ */
  async init() {
    const section = document.getElementById('catalogue');
    if (!section) return;

    console.log('[CollectionPage] Initializing...');

    this.cacheDOM();
    this.renderSkeletons();
    this.setupEventListeners();
    this.initDustParticles();
    this.observeHeroElements();

    await this.loadProducts();
  },

  /* ============================================================
     DOM CACHE
     ============================================================ */
  cacheDOM() {
    this.grid = document.getElementById('catalogue-grid');
    this.counterNum = document.getElementById('catalogue-counter-num');
    this.counterLabel = document.getElementById('catalogue-counter-label');
    this.filtersWrap = document.getElementById('catalogue-filters');
    this.searchInput = document.getElementById('catalogue-search');
    this.sortSelect = document.getElementById('catalogue-sort');
  },

  /* ============================================================
     PRODUCT LOADING
     ============================================================ */
  async loadProducts() {
    if (this._isFetching) return;
    this._isFetching = true;

    try {
      // Phase 1: Fetch initial batch
      console.log('[CollectionPage] Phase 1: Fetching initial products...');
      const initialResult = await this._fetchProducts(20, null);

      if (initialResult.products.length > 0) {
        this.allProducts = initialResult.products;
        this.filteredProducts = [...this.allProducts];
        this.applyFilters();
        this.renderProducts();
        this.updateCounter();

        // Phase 2: Background fetch
        if (initialResult.hasNextPage) {
          this._fetchRemainingProducts(initialResult.endCursor);
        }
      } else {
        this.renderEmpty('No products are currently available.');
      }
    } catch (err) {
      console.error('[CollectionPage] Fetch failed:', err);
      try {
        const fallback = await this._fetchProductsMinimal(50);
        if (fallback.length > 0) {
          this.allProducts = fallback;
          this.filteredProducts = [...this.allProducts];
          this.applyFilters();
          this.renderProducts();
          this.updateCounter();
        } else {
          this.renderEmpty('No products are currently available.');
        }
      } catch (e) {
        this.renderEmpty('Unable to load products. Please refresh the page.');
      }
    } finally {
      this._isFetching = false;
      this._hasFetched = true;
    }
  },

  /* ============================================================
     SHOPIFY DATA FETCHING
     ============================================================ */
  async _fetchProducts(count, cursor) {
    const query = `
      query GetProducts($first: Int!, $after: String) {
        products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              id
              title
              handle
              description
              productType
              vendor
              tags
              availableForSale
              createdAt
              updatedAt
              featuredImage {
                url
                altText
                width
                height
              }
              images(first: 10) {
                edges {
                  node {
                    url
                    altText
                    width
                    height
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
              compareAtPriceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                    compareAtPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              metafields(identifiers: [
                {namespace: "custom", key: "concentration"},
                {namespace: "custom", key: "fragrance_family"},
                {namespace: "custom", key: "top_notes"},
                {namespace: "custom", key: "heart_notes"},
                {namespace: "custom", key: "base_notes"},
                {namespace: "custom", key: "short_description"}
              ]) {
                namespace
                key
                value
              }
            }
          }
        }
      }
    `;

    const data = await ShopifyAPI.request(query, { first: count, after: cursor });
    if (!data || !data.products) throw new Error('Invalid API response');

    const edges = data.products.edges || [];
    const pageInfo = data.products.pageInfo || {};

    return {
      products: edges.map(edge => this._normalizeProduct(edge.node)),
      hasNextPage: pageInfo.hasNextPage || false,
      endCursor: pageInfo.endCursor || null
    };
  },

  async _fetchProductsMinimal(count) {
    const query = `
      query GetProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              productType
              tags
              availableForSale
              images(first: 5) {
                edges {
                  node { url altText }
                }
              }
              priceRange {
                minVariantPrice { amount currencyCode }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const data = await ShopifyAPI.request(query, { first: count });
    return (data?.products?.edges || []).map(edge => this._normalizeProduct(edge.node));
  },

  async _fetchRemainingProducts(cursor) {
    try {
      let hasMore = true;
      let currentCursor = cursor;

      while (hasMore) {
        const result = await this._fetchProducts(100, currentCursor);
        if (result.products.length > 0) {
          this.allProducts = [...this.allProducts, ...result.products];
          this.filteredProducts = [...this.allProducts];
          this.updateCounter();
        }
        hasMore = result.hasNextPage;
        currentCursor = result.endCursor;
      }

      this.applyFilters();
      this.renderProducts();
    } catch (err) {
      console.warn('[CollectionPage] Background fetch error:', err.message);
    }
  },

  _normalizeProduct(node) {
    const metaMap = {};
    if (node.metafields && Array.isArray(node.metafields)) {
      node.metafields.forEach(mf => {
        if (mf && mf.key && mf.value) metaMap[mf.key] = mf.value;
      });
    }

    let images = [];
    if (node.featuredImage) {
      images.push({
        url: node.featuredImage.url,
        alt: node.featuredImage.altText || node.title,
        width: node.featuredImage.width,
        height: node.featuredImage.height
      });
    }
    if (node.images?.edges) {
      node.images.edges.forEach(imgEdge => {
        const imgUrl = imgEdge.node.url;
        if (!images.some(i => i.url === imgUrl)) {
          images.push({
            url: imgUrl,
            alt: imgEdge.node.altText || node.title,
            width: imgEdge.node.width,
            height: imgEdge.node.height
          });
        }
      });
    }
    if (images.length === 0 && node.images?.edges?.length > 0) {
      images = node.images.edges.map(e => ({
        url: e.node.url,
        alt: e.node.altText || node.title
      }));
    }

    const variants = (node.variants?.edges || []).map(vEdge => ({
      id: vEdge.node.id,
      title: vEdge.node.title,
      available: vEdge.node.availableForSale || false,
      price: parseFloat(vEdge.node.price?.amount || 0).toFixed(2),
      currency: vEdge.node.price?.currencyCode || 'AED',
      compareAtPrice: vEdge.node.compareAtPrice
        ? parseFloat(vEdge.node.compareAtPrice.amount).toFixed(2)
        : null
    }));

    const price = parseFloat(node.priceRange?.minVariantPrice?.amount || 0).toFixed(2);
    const currency = node.priceRange?.minVariantPrice?.currencyCode || 'AED';
    const compareAtPrice = node.compareAtPriceRange?.minVariantPrice?.amount
      ? parseFloat(node.compareAtPriceRange.minVariantPrice.amount).toFixed(2)
      : null;

    return {
      id: node.id,
      title: node.title || 'Untitled',
      handle: node.handle || '',
      description: node.description || '',
      productType: node.productType || '',
      vendor: node.vendor || '',
      tags: node.tags || [],
      available: node.availableForSale !== false,
      createdAt: node.createdAt || '',
      price,
      currency,
      compareAtPrice,
      images,
      variants,
      concentration: metaMap.concentration || '',
      fragranceFamily: metaMap.fragrance_family || '',
      topNotes: metaMap.top_notes || '',
      heartNotes: metaMap.heart_notes || '',
      baseNotes: metaMap.base_notes || '',
      shortDescription: metaMap.short_description || ''
    };
  },

  /* ============================================================
     FILTERING / SEARCH / SORT
     ============================================================ */
  applyFilters() {
    let products = [...this.allProducts];

    if (this.activeFilter !== 'all') {
      const filterLower = this.activeFilter.toLowerCase();
      products = products.filter(p => {
        const conc = (p.concentration || '').toLowerCase();
        const family = (p.fragranceFamily || '').toLowerCase();
        const type = (p.productType || '').toLowerCase();
        const tags = (p.tags || []).map(t => t.toLowerCase());
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();

        return conc.includes(filterLower) ||
               family.includes(filterLower) ||
               type.includes(filterLower) ||
               tags.some(t => t.includes(filterLower)) ||
               title.includes(filterLower) ||
               desc.includes(filterLower);
      });
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      products = products.filter(p => {
        return (p.title || '').toLowerCase().includes(q) ||
               (p.description || '').toLowerCase().includes(q) ||
               (p.shortDescription || '').toLowerCase().includes(q) ||
               (p.fragranceFamily || '').toLowerCase().includes(q) ||
               (p.concentration || '').toLowerCase().includes(q) ||
               (p.tags || []).some(t => t.toLowerCase().includes(q));
      });
    }

    switch (this.sortBy) {
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'alphabetical':
        products.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'price-low':
        products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price-high':
        products.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
    }

    this.filteredProducts = products;
  },

  /* ============================================================
     RENDERING — All products shown (no display limit)
     ============================================================ */
  renderProducts() {
    if (!this.grid) return;

    // Show ALL filtered products on collection page
    const toShow = this.filteredProducts;
    this.grid.innerHTML = '';

    if (toShow.length === 0) {
      this.renderEmpty('No fragrances match your selection.');
      return;
    }

    this.preloadImages(toShow);

    const fragment = document.createDocumentFragment();
    toShow.forEach((product, index) => {
      const card = this.createCard(product, index);
      fragment.appendChild(card);
    });

    this.grid.appendChild(fragment);
    this.setupCardObserver();

    if (window.matchMedia('(hover: hover)').matches) {
      this.setupMouseTracking();
    }
  },

  createCard(product, index) {
    const card = document.createElement('a');
    card.className = 'cat-card';
    card.href = `product.html?handle=${product.handle}`;
    card.style.transitionDelay = `${(index % 20) * 50}ms`;
    card.dataset.productId = product.id;
    card.dataset.handle = product.handle;

    const primaryImgUrl = this.getOptimizedImageUrl(product.images[0]?.url, 600);
    const hoverImgUrl = product.images[1]?.url
      ? this.getOptimizedImageUrl(product.images[1].url, 600)
      : primaryImgUrl;
    const hasHoverImage = product.images.length > 1;

    if (!hasHoverImage) card.classList.add('single-image');

    const imageAlt = product.images[0]?.alt || product.title;
    const concentration = product.concentration || product.productType || 'Extrait de Parfum';
    const family = product.fragranceFamily || '';
    const desc = product.shortDescription || product.description || '';
    const truncatedDesc = desc.length > 90 ? desc.substring(0, 90) + '…' : desc;

    const isZero = parseFloat(product.price) === 0;
    const priceDisplay = isZero ? '180.00' : `${product.price}`;

    const compareAtHTML = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price)
      ? `<span style="text-decoration: line-through; opacity: 0.5; font-size: 0.85em; margin-right: 6px;">${product.compareAtPrice}</span>`
      : '';

    card.innerHTML = `
      <div class="cat-card-image">
        <img class="cat-card-bottle cat-card-bottle--primary" 
             src="${primaryImgUrl}"
             alt="${this._escapeHtml(imageAlt)}"
             loading="${index < 20 ? 'eager' : 'lazy'}"
             decoding="async"
             onerror="this.onerror=null; this.src='assets/images/hamood.webp';">
        ${hasHoverImage ? `
        <img class="cat-card-bottle cat-card-bottle--hover" 
             src="${hoverImgUrl}"
             alt="${this._escapeHtml(imageAlt)}"
             loading="lazy"
             decoding="async"
             onerror="this.onerror=null; this.src='${primaryImgUrl}';">
        ` : ''}
      </div>
      <div class="cat-card-content">
        <div class="cat-card-concentration">${this._escapeHtml(concentration)}</div>
        <h3 class="cat-card-name" title="${this._escapeHtml(product.title)}">${this._escapeHtml(product.title)}</h3>
        ${family ? `<div class="cat-card-family">${this._escapeHtml(family)}</div>` : ''}
        <p class="cat-card-desc">${this._escapeHtml(truncatedDesc)}</p>
        <div class="cat-card-price">${compareAtHTML}${priceDisplay} <span class="cat-card-currency">AED</span></div>
        <div class="cat-card-actions">
          <span class="cat-btn-details">
            <span>VIEW DETAILS</span>
            <span class="btn-arrow">→</span>
          </span>
        </div>
      </div>
    `;

    return card;
  },

  /* ============================================================
     SKELETON LOADING
     ============================================================ */
  renderSkeletons() {
    if (!this.grid) return;
    this.grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 20; i++) {
      const skel = document.createElement('div');
      skel.className = 'cat-skeleton';
      skel.innerHTML = `
        <div class="cat-skeleton-image"></div>
        <div class="cat-skeleton-content">
          <div class="cat-skeleton-line cat-skeleton-line--short"></div>
          <div class="cat-skeleton-line cat-skeleton-line--long"></div>
          <div class="cat-skeleton-line cat-skeleton-line--medium"></div>
          <div class="cat-skeleton-line cat-skeleton-line--price"></div>
        </div>
      `;
      fragment.appendChild(skel);
    }
    this.grid.appendChild(fragment);
  },

  renderEmpty(message) {
    if (!this.grid) return;
    this.grid.innerHTML = `
      <div class="catalogue-empty">
        <svg class="catalogue-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3 class="catalogue-empty-title">No Results Found</h3>
        <p class="catalogue-empty-text">${message}</p>
      </div>
    `;
  },

  /* ============================================================
     COLLECTION COUNTER
     ============================================================ */
  updateCounter() {
    if (this.counterNum) {
      const count = this.allProducts.length;
      this._animateCounter(this.counterNum, count);
    }
    if (this.counterLabel) {
      const count = this.allProducts.length;
      this.counterLabel.textContent = `Luxury Fragrance${count !== 1 ? 's' : ''}`;
    }
  },

  _animateCounter(el, target) {
    let current = 0;
    const duration = 1500;
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      current = Math.round(ease(progress) * target);
      el.textContent = current;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  },

  /* ============================================================
     CARD SCROLL REVEAL OBSERVER
     ============================================================ */
  setupCardObserver() {
    this.observers.forEach(obs => obs.disconnect());
    this.observers = [];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    });

    const cards = this.grid.querySelectorAll('.cat-card');
    cards.forEach(card => {
      observer.observe(card);
    });

    // Immediately reveal visible cards
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100 && rect.bottom > 0) {
        card.classList.add('revealed');
      }
    });

    this.observers.push(observer);
  },

  /* ============================================================
     MOUSE TRACKING — 3D Card Tilt
     ============================================================ */
  setupMouseTracking() {
    const cards = this.grid.querySelectorAll('.cat-card');

    cards.forEach(card => {
      let rafId = null;
      let targetRotateX = 0, targetRotateY = 0;
      let currentRotateX = 0, currentRotateY = 0;
      let targetScale = 1, currentScale = 1;
      let isHovering = false;

      const bottles = card.querySelectorAll('.cat-card-bottle');
      if (!bottles.length) return;

      const onMouseMove = (e) => {
        if (!isHovering) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        targetRotateY = ((x - centerX) / centerX) * 5.5;
        targetRotateX = ((y - centerY) / centerY) * -5.5;

        const glowX = (x / rect.width) * 100;
        const glowY = (y / rect.height) * 100;
        card.style.setProperty('--glow-x', `${glowX.toFixed(1)}%`);
        card.style.setProperty('--glow-y', `${glowY.toFixed(1)}%`);
      };

      const renderFrame = () => {
        const lerpFactor = 0.08;
        currentRotateX += (targetRotateX - currentRotateX) * lerpFactor;
        currentRotateY += (targetRotateY - currentRotateY) * lerpFactor;
        currentScale += (targetScale - currentScale) * lerpFactor;

        card.style.transform = `rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) scale3d(${currentScale.toFixed(4)}, ${currentScale.toFixed(4)}, 1)`;

        const bottleRotateX = currentRotateX * 0.5;
        const bottleRotateY = currentRotateY * 0.5;
        const bottleScale = 1 + (currentScale - 1) * 2.5;
        const bottleTransform = `translate3d(0, 0px, 25px) rotateX(${bottleRotateX.toFixed(2)}deg) rotateY(${bottleRotateY.toFixed(2)}deg) scale3d(${bottleScale.toFixed(4)}, ${bottleScale.toFixed(4)}, 1)`;

        bottles.forEach(bottle => { bottle.style.transform = bottleTransform; });

        const dx = Math.abs(targetRotateX - currentRotateX);
        const dy = Math.abs(targetRotateY - currentRotateY);
        const ds = Math.abs(targetScale - currentScale);

        if (isHovering || dx > 0.005 || dy > 0.005 || ds > 0.005) {
          rafId = requestAnimationFrame(renderFrame);
        } else {
          rafId = null;
          if (!isHovering) {
            card.style.transform = '';
            bottles.forEach(b => { b.style.transform = ''; });
          }
        }
      };

      card.addEventListener('mouseenter', () => {
        isHovering = true;
        targetScale = 1.025;
        card.addEventListener('mousemove', onMouseMove);
        if (!rafId) rafId = requestAnimationFrame(renderFrame);
      });

      card.addEventListener('mouseleave', () => {
        isHovering = false;
        card.removeEventListener('mousemove', onMouseMove);
        targetRotateX = 0;
        targetRotateY = 0;
        targetScale = 1;
        if (!rafId) rafId = requestAnimationFrame(renderFrame);
      });
    });
  },

  /* ============================================================
     EVENT LISTENERS
     ============================================================ */
  setupEventListeners() {
    // Filter chips
    if (this.filtersWrap) {
      this.filtersWrap.addEventListener('click', (e) => {
        const chip = e.target.closest('.catalogue-chip');
        if (!chip) return;
        this.filtersWrap.querySelectorAll('.catalogue-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.dataset.filter || 'all';
        this.applyFilters();
        this.transitionProducts();
      });
    }

    // Search
    if (this.searchInput) {
      let debounceTimer;
      this.searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.searchQuery = this.searchInput.value;
          this.applyFilters();
          this.transitionProducts();
        }, 250);
      });
    }

    // Sort
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', () => {
        this.sortBy = this.sortSelect.value;
        this.applyFilters();
        this.transitionProducts();
      });
    }
  },

  transitionProducts() {
    if (!this.grid) return;
    const cards = this.grid.querySelectorAll('.cat-card');
    cards.forEach(card => {
      card.style.transition = 'opacity 200ms, transform 200ms';
      card.style.opacity = '0';
      card.style.transform = 'translateY(15px) scale(0.97)';
    });
    setTimeout(() => this.renderProducts(), 220);
  },

  /* ============================================================
     HERO ELEMENT OBSERVERS
     ============================================================ */
  observeHeroElements() {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          heroObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const heroEls = document.querySelectorAll(
      '.catalogue-badge, .catalogue-heading, .catalogue-intro, .catalogue-counter, .catalogue-toolbar'
    );
    heroEls.forEach(el => heroObserver.observe(el));
  },

  /* ============================================================
     AMBIENT DUST PARTICLES
     ============================================================ */
  initDustParticles() {
    this.dustCanvas = document.getElementById('catalogue-dust');
    if (!this.dustCanvas) return;

    this.dustCtx = this.dustCanvas.getContext('2d');
    this.dustVisible = false;
    this.resizeDustCanvas();

    let dustResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(dustResizeTimer);
      dustResizeTimer = setTimeout(() => this.resizeDustCanvas(), 200);
    });

    const count = Math.min(40, Math.floor(window.innerWidth / 30));
    for (let i = 0; i < count; i++) {
      this.dustParticles.push({
        x: Math.random() * this.dustCanvas.width,
        y: Math.random() * this.dustCanvas.height,
        size: Math.random() * 1.5 + 0.3,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: -Math.random() * 0.2 - 0.05,
        opacity: Math.random() * 0.3 + 0.05,
        flickerSpeed: Math.random() * 0.02 + 0.005
      });
    }

    const section = document.getElementById('catalogue');
    if (section) {
      const observer = new IntersectionObserver((entries) => {
        this.dustVisible = entries[0].isIntersecting;
        if (this.dustVisible && !this.dustRaf) this.animateDust();
      }, { rootMargin: '200px' });
      observer.observe(section);
    }
  },

  resizeDustCanvas() {
    if (!this.dustCanvas) return;
    const section = document.getElementById('catalogue');
    if (section) {
      this.dustCanvas.width = section.offsetWidth;
      this.dustCanvas.height = section.offsetHeight;
    }
  },

  animateDust() {
    if (!this.dustCtx || !this.dustCanvas || window.innerWidth <= 768) return;
    if (!this.dustVisible) { this.dustRaf = null; return; }

    this.dustCtx.clearRect(0, 0, this.dustCanvas.width, this.dustCanvas.height);
    const time = Date.now() * 0.001;

    this.dustParticles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < -5) p.y = this.dustCanvas.height + 5;
      if (p.x < -5) p.x = this.dustCanvas.width + 5;
      if (p.x > this.dustCanvas.width + 5) p.x = -5;

      const flicker = Math.sin(time * p.flickerSpeed * 60) * 0.15 + 0.85;
      const alpha = p.opacity * flicker;

      this.dustCtx.beginPath();
      this.dustCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.dustCtx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
      this.dustCtx.fill();
    });

    this.dustRaf = requestAnimationFrame(() => this.animateDust());
  },

  /* ============================================================
     UTILITIES
     ============================================================ */
  _escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, m => map[m]);
  }
};

if (typeof window !== 'undefined') {
  window.CollectionPage = CollectionPage;
}

/* ============================================================
   BOOT
   ============================================================ */
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CollectionPage.init());
  } else {
    CollectionPage.init();
  }
})();
