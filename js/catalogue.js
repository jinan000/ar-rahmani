/* ============================================================
   AR-RAHMANI — Luxury Fragrance Catalogue
   Dynamic Shopify collection with cinematic interactions
   ============================================================ */

const Catalogue = {
  /* ---- State ---- */
  allProducts: [],
  filteredProducts: [],
  /* ---- State ---- */
  allProducts: [],
  filteredProducts: [],
  displayedCount: 13,
  showAll: false,
  activeFilter: 'all',
  searchQuery: '',
  sortBy: 'newest',
  modalProduct: null,
  modalImageIndex: 0,
  observers: [],
  dustCanvas: null,
  dustCtx: null,
  dustParticles: [],
  dustRaf: null,

  /**
   * Shopify CDN Image URL helper to request optimized sizes (e.g. 600px width).
   * Avoids downloading large 4000px original images.
   */
  getOptimizedImageUrl(url, width = 600) {
    if (!url) return 'assets/images/hamood.webp';
    if (url.includes('cdn.shopify.com')) {
      return url.includes('?') ? `${url}&width=${width}` : `${url}?width=${width}`;
    }
    return url;
  },

  /**
   * Preload primary and hover images for rapid hover response.
   */
  preloadImages(products) {
    const isMobile = window.innerWidth <= 768;
    const limit = isMobile ? 4 : 16;
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
  _isFetching: false,
  _hasFetched: false,

  async init() {
    const section = document.getElementById('catalogue');
    if (!section) return;

    console.log('[Catalogue] Initializing...');

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
    this.exploreWrap = document.getElementById('catalogue-explore-wrap');
    this.exploreBtn = document.getElementById('catalogue-explore-btn');
    this.modalOverlay = document.getElementById('cat-modal-overlay');
    this.modalEl = document.getElementById('cat-modal');
  },

  /**
   * Main product loading orchestrator.
   * Phase 1: Fetch first 16 products (4x4 grid) and render immediately.
   * Phase 2: Fetch all remaining products in background.
   * Never uses collections — only direct product queries.
   */
  async loadProducts() {
    if (this._isFetching) {
      console.log('[Catalogue] Fetch already in progress, skipping duplicate request.');
      return;
    }
    this._isFetching = true;

    const config = window.SHOPIFY_CONFIG || SHOPIFY_CONFIG;
    console.log('[Catalogue] Using Shopify config:', {
      domain: config.storeDomain,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion
    });

    try {
      // Phase 1: Fetch first 16 products and render immediately
      console.log('[Catalogue] Phase 1: Fetching initial 16 products...');
      const initialResult = await this._fetchProducts(16, null);

      if (initialResult.products.length > 0) {
        console.log(`[Catalogue] Phase 1 complete: ${initialResult.products.length} products loaded.`);
        this.allProducts = initialResult.products;
        this.filteredProducts = [...this.allProducts];
        this.applyFilters();
        this.renderProducts();
        this.updateCounter();

        // Phase 2: If there are more products, fetch them in background
        if (initialResult.hasNextPage) {
          console.log('[Catalogue] Phase 2: Fetching remaining products in background...');
          this._fetchRemainingProducts(initialResult.endCursor);
        }
      } else {
        console.warn('[Catalogue] No products returned from Shopify.');
        this.renderEmpty('No products are currently available.');
      }

    } catch (err) {
      console.error('[Catalogue] Phase 1 failed:', err.message, err);

      // Retry once with an even simpler query
      console.log('[Catalogue] Retrying with minimal query...');
      try {
        const fallbackResult = await this._fetchProductsMinimal(16);
        if (fallbackResult.length > 0) {
          console.log(`[Catalogue] Fallback succeeded: ${fallbackResult.length} products loaded.`);
          this.allProducts = fallbackResult;
          this.filteredProducts = [...this.allProducts];
          this.applyFilters();
          this.renderProducts();
          this.updateCounter();
        } else {
          this.renderEmpty('No products are currently available.');
        }
      } catch (fallbackErr) {
        console.error('[Catalogue] Fallback also failed:', fallbackErr.message, fallbackErr);
        this.renderEmpty('Unable to load products. Please refresh the page.');
      }
    } finally {
      this._isFetching = false;
      this._hasFetched = true;
    }
  },

  /* ============================================================
     SHOPIFY DATA FETCHING — Direct Products (No Collections)
     ============================================================ */

  /**
   * Core product fetch using Shopify Storefront API.
   * Queries published products directly — never uses collections.
   * Includes metafields inline (gracefully null if not configured).
   */
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
              seo {
                title
                description
              }
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
                    image {
                      url
                      altText
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
                {namespace: "custom", key: "scent_profile"},
                {namespace: "custom", key: "longevity"},
                {namespace: "custom", key: "projection"},
                {namespace: "custom", key: "sillage"},
                {namespace: "custom", key: "occasion"},
                {namespace: "custom", key: "season"},
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

    const variables = { first: count, after: cursor };
    const data = await ShopifyAPI.request(query, variables);

    if (!data || !data.products) {
      console.error('[Catalogue] Unexpected API response structure:', data);
      throw new Error('Invalid response from Shopify API');
    }

    const edges = data.products.edges || [];
    const pageInfo = data.products.pageInfo || {};

    const products = edges.map(edge => this._normalizeProduct(edge.node));

    return {
      products,
      hasNextPage: pageInfo.hasNextPage || false,
      endCursor: pageInfo.endCursor || null
    };
  },

  /**
   * Ultra-minimal fallback query — no metafields, no SEO, no compare-at-price.
   * Used only if the primary query fails (e.g., API version incompatibility).
   */
  async _fetchProductsMinimal(count) {
    console.log('[Catalogue] Using minimal fallback query...');

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
                  node {
                    url
                    altText
                  }
                }
              }
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await ShopifyAPI.request(query, { first: count });
    const edges = data?.products?.edges || [];

    return edges.map(edge => this._normalizeProduct(edge.node));
  },

  /**
   * Fetch remaining products after initial 12 are displayed.
   * Runs in background — does not block the UI.
   */
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
          console.log(`[Catalogue] Background fetch: ${this.allProducts.length} total products loaded.`);
        }

        hasMore = result.hasNextPage;
        currentCursor = result.endCursor;
      }

      console.log(`[Catalogue] All products loaded: ${this.allProducts.length} total.`);

      // Re-apply current filters with the full dataset
      this.applyFilters();
      // Only re-render if user hasn't expanded yet (to avoid disrupting their view)
      if (!this.showAll) {
        // Update the explore button visibility
        if (this.exploreWrap && this.filteredProducts.length > this.displayedCount) {
          this.exploreWrap.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.warn('[Catalogue] Background fetch error (non-critical):', err.message);
      // Non-critical — initial 12 products are already displayed
    }
  },

  /**
   * Normalize a Shopify product node into our internal format.
   * Handles missing fields gracefully — never throws.
   */
  _normalizeProduct(node) {
    // Extract metafields into a key-value map
    const metaMap = {};
    if (node.metafields && Array.isArray(node.metafields)) {
      node.metafields.forEach(mf => {
        if (mf && mf.key && mf.value) {
          metaMap[mf.key] = mf.value;
        }
      });
    }

    // Build images array — use featuredImage first, then gallery
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
        // Avoid duplicating the featured image
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

    // If no featured image but gallery has images, use first gallery image
    if (images.length === 0 && node.images?.edges?.length > 0) {
      images = node.images.edges.map(e => ({
        url: e.node.url,
        alt: e.node.altText || node.title,
        width: e.node.width,
        height: e.node.height
      }));
    }

    // Variants
    const variants = (node.variants?.edges || []).map(vEdge => ({
      id: vEdge.node.id,
      title: vEdge.node.title,
      available: vEdge.node.availableForSale || false,
      quantityAvailable: vEdge.node.quantityAvailable || null,
      currentlyNotInStock: vEdge.node.currentlyNotInStock || false,
      price: parseFloat(vEdge.node.price?.amount || 0).toFixed(2),
      currency: vEdge.node.price?.currencyCode || 'AED',
      compareAtPrice: vEdge.node.compareAtPrice
        ? parseFloat(vEdge.node.compareAtPrice.amount).toFixed(2)
        : null,
      image: vEdge.node.image?.url || null
    }));

    // Price
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
      updatedAt: node.updatedAt || '',
      seoTitle: node.seo?.title || '',
      seoDescription: node.seo?.description || '',
      price,
      currency,
      compareAtPrice,
      images,
      variants,
      // Metafields — all gracefully default to empty string
      concentration: metaMap.concentration || '',
      fragranceFamily: metaMap.fragrance_family || '',
      topNotes: metaMap.top_notes || '',
      heartNotes: metaMap.heart_notes || '',
      baseNotes: metaMap.base_notes || '',
      scentProfile: metaMap.scent_profile || '',
      longevity: metaMap.longevity || '',
      projection: metaMap.projection || '',
      sillage: metaMap.sillage || '',
      occasion: metaMap.occasion || '',
      season: metaMap.season || '',
      shortDescription: metaMap.short_description || ''
    };
  },

  /* ============================================================
     FILTERING / SEARCH / SORT
     ============================================================ */
  applyFilters() {
    let products = [...this.allProducts];

    // Filter
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

    // Search
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

    // Sort
    switch (this.sortBy) {
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'best-selling':
        // Shopify Storefront API doesn't expose sales counts in products query;
        // keep the default Shopify order (which is typically best-selling)
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
     RENDERING
     ============================================================ */
  /* ============================================================
     RENDERING (Batch DOM Updates & GPU Transforms)
     ============================================================ */
  renderProducts() {
    if (!this.grid) return;

    const toShow = this.showAll
      ? this.filteredProducts
      : this.filteredProducts.slice(0, this.displayedCount);

    // Clear skeleton / old cards
    this.grid.innerHTML = '';

    if (toShow.length === 0) {
      this.renderEmpty('No fragrances match your selection.');
      if (this.exploreWrap) this.exploreWrap.classList.add('hidden');
      return;
    }

    // Preload image assets for initial 16 cards for zero-latency hover
    this.preloadImages(toShow);

    // DocumentFragment for single DOM paint (60 FPS optimization)
    const fragment = document.createDocumentFragment();
    toShow.forEach((product, index) => {
      const card = this.createCard(product, index);
      fragment.appendChild(card);
    });

    this.grid.appendChild(fragment);

    // Show / hide explore button
    if (this.exploreWrap) {
      if (!this.showAll && this.filteredProducts.length > this.displayedCount) {
        this.exploreWrap.classList.remove('hidden');
      } else {
        this.exploreWrap.classList.add('hidden');
      }
    }

    // Observe cards for staggered reveal as they enter viewport
    this.setupCardObserver();

    // Setup mouse interactions (desktop only)
    if (window.matchMedia('(hover: hover)').matches) {
      this.setupMouseTracking();
    }
  },

  createCard(product, index) {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.transitionDelay = `${(index % 16) * 60}ms`;
    card.dataset.productId = product.id;
    card.dataset.handle = product.handle;

    const primaryImgUrl = this.getOptimizedImageUrl(product.images[0]?.url, 600);
    const hoverImgUrl = product.images[1]?.url
      ? this.getOptimizedImageUrl(product.images[1].url, 600)
      : primaryImgUrl;
    const hasHoverImage = product.images.length > 1;

    if (!hasHoverImage) {
      card.classList.add('single-image');
    }

    const imageAlt = product.images[0]?.alt || product.title;
    const concentration = product.concentration || product.productType || 'Extrait de Parfum';
    const family = product.fragranceFamily || '';
    const desc = product.shortDescription || product.description || '';
    const truncatedDesc = desc.length > 90 ? desc.substring(0, 90) + '…' : desc;

    // Price formatting
    const isZero = parseFloat(product.price) === 0;
    const priceDisplay = isZero ? '180.00' : `${product.price}`;
    const currencyDisplay = 'AED';

    const compareAtHTML = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price)
      ? `<span style="text-decoration: line-through; opacity: 0.5; font-size: 0.85em; margin-right: 6px;">${product.compareAtPrice}</span>`
      : '';

    card.innerHTML = `
      <div class="cat-card-image">
        <img class="cat-card-bottle cat-card-bottle--primary" 
             src="${primaryImgUrl}"
             alt="${this._escapeHtml(imageAlt)}"
             loading="${index < 16 ? 'eager' : 'lazy'}"
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
        <div class="cat-card-price">${compareAtHTML}${priceDisplay} <span class="cat-card-currency">${currencyDisplay}</span></div>
        <div class="cat-card-actions">
          <button class="cat-btn-cart btn-add-bag" data-variant-id="${product.variants[0]?.id || ''}" data-product-title="${this._escapeHtml(product.title)}" data-price="${priceDisplay}">
            <span>ADD TO BAG</span>
          </button>
          <button class="cat-btn-details" data-handle="${product.handle}">
            <span>VIEW DETAILS</span>
          </button>
        </div>
      </div>
    `;

    // Card-wide click opens View Details modal (unless clicking Add to Bag)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.cat-btn-cart') || e.target.closest('.btn-add-bag')) return;
      this.openModal(product);
    });

    return card;
  },

  /* ============================================================
     SKELETON LOADING (16 Cards for 4x4 Grid)
     ============================================================ */
  renderSkeletons() {
    if (!this.grid) return;
    this.grid.innerHTML = '';

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 16; i++) {
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
    // Disconnect old observers
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

    // Immediately reveal cards currently visible in the viewport
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100 && rect.bottom > 0) {
        card.classList.add('revealed');
      }
    });

    this.observers.push(observer);
  },

  /* ============================================================
     MOUSE TRACKING — Silky Smooth 3D Card Tilt & Parallax Bottle
     ============================================================ */
  setupMouseTracking() {
    const cards = this.grid.querySelectorAll('.cat-card');

    cards.forEach(card => {
      let rafId = null;
      let targetRotateX = 0;
      let targetRotateY = 0;
      let currentRotateX = 0;
      let currentRotateY = 0;
      let targetLiftY = 0;
      let currentLiftY = 0;
      let targetScale = 1;
      let currentScale = 1;
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

        // Max rotation bounds 5.5 deg
        targetRotateY = ((x - centerX) / centerX) * 5.5;
        targetRotateX = ((y - centerY) / centerY) * -5.5;

        // Dynamic Spotlight Glow coordinates
        const glowX = (x / rect.width) * 100;
        const glowY = (y / rect.height) * 100;
        card.style.setProperty('--glow-x', `${glowX.toFixed(1)}%`);
        card.style.setProperty('--glow-y', `${glowY.toFixed(1)}%`);
      };

      const renderFrame = () => {
        // Linear Interpolation constant (0.08 = silky, high-response smoothing)
        const lerpFactor = 0.08;
        currentRotateX += (targetRotateX - currentRotateX) * lerpFactor;
        currentRotateY += (targetRotateY - currentRotateY) * lerpFactor;
        currentLiftY += (targetLiftY - currentLiftY) * lerpFactor;
        currentScale += (targetScale - currentScale) * lerpFactor;

        // Smooth hardware-accelerated 3D transform for card container
        card.style.transform = `translate3d(0, ${currentLiftY.toFixed(2)}px, 0) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg) scale3d(${currentScale.toFixed(4)}, ${currentScale.toFixed(4)}, 1)`;

        // Smooth centered parallax float for bottle elements (keeps translate -50%, -50% intact)
        const bottleRotateX = currentRotateX * 0.5;
        const bottleRotateY = currentRotateY * 0.5;
        const bottleScale = 1 + (currentScale - 1) * 2.5;
        const bottleTransform = `translate3d(-50%, calc(-50% - 4px), 25px) rotateX(${bottleRotateX.toFixed(2)}deg) rotateY(${bottleRotateY.toFixed(2)}deg) scale3d(${bottleScale.toFixed(4)}, ${bottleScale.toFixed(4)}, 1)`;

        bottles.forEach(bottle => {
          bottle.style.transform = bottleTransform;
        });

        const dx = Math.abs(targetRotateX - currentRotateX);
        const dy = Math.abs(targetRotateY - currentRotateY);
        const dl = Math.abs(targetLiftY - currentLiftY);
        const ds = Math.abs(targetScale - currentScale);

        // Keep loop alive until all deltas reach zero resting state
        if (isHovering || dx > 0.005 || dy > 0.005 || dl > 0.005 || ds > 0.005) {
          rafId = requestAnimationFrame(renderFrame);
        } else {
          rafId = null;
          if (!isHovering) {
            card.style.transform = '';
            bottles.forEach(b => { b.style.transform = ''; });
          }
        }
      };

      const onMouseEnter = () => {
        isHovering = true;
        targetLiftY = -8;
        targetScale = 1.025;
        card.addEventListener('mousemove', onMouseMove);
        if (!rafId) {
          rafId = requestAnimationFrame(renderFrame);
        }
      };

      const onMouseLeave = () => {
        isHovering = false;
        card.removeEventListener('mousemove', onMouseMove);
        targetRotateX = 0;
        targetRotateY = 0;
        targetLiftY = 0;
        targetScale = 1;

        if (!rafId) {
          rafId = requestAnimationFrame(renderFrame);
        }
      };

      card.addEventListener('mouseenter', onMouseEnter);
      card.addEventListener('mouseleave', onMouseLeave);
    });
  },

  /* ============================================================
     QUICK VIEW MODAL
     ============================================================ */
  openModal(productOrHandle) {
    let product = productOrHandle;
    if (typeof productOrHandle === 'string') {
      product = this.allProducts.find(p => p.handle === productOrHandle || p.id === productOrHandle);
    }
    if (!product && this.allProducts.length > 0) {
      product = this.allProducts[0];
    }
    if (!product) return;

    this.modalProduct = product;
    this.modalImageIndex = 0;
    this.renderModal(product);

    if (this.modalOverlay) {
      this.modalOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (window.lenis) window.lenis.stop();
    }
  },

  closeModal() {
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (window.lenis) window.lenis.start();
    }
    this.modalProduct = null;
  },

  renderModal(product) {
    if (!this.modalEl || !product) return;

    const images = product.images || [];
    const mainImage = images[this.modalImageIndex]?.url || images[0]?.url || 'assets/images/hamood.webp';
    const concentration = product.concentration || product.productType || 'Parfum';
    const family = product.fragranceFamily || '';

    // Build notes section
    let notesHTML = '';
    if (product.topNotes || product.heartNotes || product.baseNotes) {
      notesHTML = `
        <div class="cat-modal-notes">
          <div class="cat-modal-notes-title">Fragrance Notes</div>
          ${product.topNotes ? `
            <div class="cat-modal-note-row">
              <span class="cat-modal-note-label">Top</span>
              <span class="cat-modal-note-value">${this._escapeHtml(product.topNotes)}</span>
            </div>` : ''}
          ${product.heartNotes ? `
            <div class="cat-modal-note-row">
              <span class="cat-modal-note-label">Heart</span>
              <span class="cat-modal-note-value">${this._escapeHtml(product.heartNotes)}</span>
            </div>` : ''}
          ${product.baseNotes ? `
            <div class="cat-modal-note-row">
              <span class="cat-modal-note-label">Base</span>
              <span class="cat-modal-note-value">${this._escapeHtml(product.baseNotes)}</span>
            </div>` : ''}
        </div>
      `;
    }

    // Build performance section
    const perfItems = [
      { label: 'Scent Profile', value: product.scentProfile },
      { label: 'Longevity', value: product.longevity },
      { label: 'Projection', value: product.projection },
      { label: 'Sillage', value: product.sillage },
      { label: 'Occasion', value: product.occasion },
      { label: 'Season', value: product.season },
      { label: 'Family', value: product.fragranceFamily }
    ].filter(item => item.value);

    let perfHTML = '';
    if (perfItems.length > 0) {
      perfHTML = `
        <div class="cat-modal-performance">
          ${perfItems.map(item => `
            <div class="cat-modal-perf-item">
              <span class="cat-modal-perf-label">${item.label}</span>
              <span class="cat-modal-perf-value">${this._escapeHtml(item.value)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Build thumbnails
    let thumbsHTML = '';
    if (images.length > 1) {
      thumbsHTML = `
        <div class="cat-modal-thumbs">
          ${images.map((img, i) => `
            <button class="cat-modal-thumb ${i === this.modalImageIndex ? 'active' : ''}" data-index="${i}">
              <img src="${img.url}" alt="${img.alt || product.title}">
            </button>
          `).join('')}
        </div>
      `;
    }

    const variantId = product.variants[0]?.id || '';
    const checkoutUrl = `https://${(window.SHOPIFY_CONFIG?.storeDomain || '7cszxa-9r.myshopify.com')}`;

    const compareAtHTML = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price)
      ? `<span class="cat-modal-compare-price" style="text-decoration: line-through; opacity: 0.5; font-size: 0.9em; margin-right: 8px;">${product.compareAtPrice}</span>`
      : '';

    this.modalEl.innerHTML = `
      <button class="cat-modal-close" id="cat-modal-close-btn" aria-label="Close">&times;</button>

      <div class="cat-modal-gallery">
        <img src="${mainImage}" alt="${this._escapeHtml(product.title)}" id="cat-modal-main-image">
        ${thumbsHTML}
      </div>

      <div class="cat-modal-info">
        <div class="cat-modal-label">${this._escapeHtml(concentration)}</div>
        <h2 class="cat-modal-title">${this._escapeHtml(product.title)}</h2>
        ${family ? `<div class="cat-modal-family">${this._escapeHtml(family)}</div>` : ''}

        <div class="cat-modal-divider"></div>
        <p class="cat-modal-desc">${this._escapeHtml(product.description)}</p>

        ${notesHTML}
        ${perfHTML}

        ${product.variants && product.variants.length > 0 && !(product.variants.length === 1 && product.variants[0].title === 'Default Title') ? `
        <div class="cat-modal-variants">
          <div class="cat-modal-notes-title" style="margin-bottom: 10px;">Select Size</div>
          <div class="cat-modal-variant-options" style="display: flex; gap: 10px; margin-bottom: 20px;">
            ${product.variants.map((v, i) => `
              <button class="cat-modal-variant-btn ${i === 0 ? 'active' : ''}" 
                      style="padding: 8px 16px; border: 1px solid var(--color-gold-dim); background: ${i === 0 ? 'var(--color-gold-dim)' : 'transparent'}; color: var(--color-light); border-radius: 4px; cursor: pointer; transition: all 0.3s ease;"
                      data-id="${v.id}" 
                      data-price="${v.price}"
                      data-compare="${v.compareAtPrice || ''}">
                ${this._escapeHtml(v.title)}
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div class="cat-modal-price-wrap">
          ${compareAtHTML}
          <span class="cat-modal-price" id="cat-modal-price-display">${product.price}</span>
          <span class="cat-modal-price-currency">AED</span>
        </div>

        <div class="cat-modal-actions">
          <button class="cat-btn-cart btn-add-bag" id="cat-modal-add-bag" data-variant-id="${variantId}" data-product-title="${this._escapeHtml(product.title)}" data-price="${product.price}">
            <span>Add to Cart</span>
          </button>
          <button class="cat-btn-details" id="cat-modal-buy-now" data-variant-id="${variantId}">
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    `;

    // Event listeners for modal
    const closeBtn = document.getElementById('cat-modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

    // Variant Selection Logic
    const variantBtns = this.modalEl.querySelectorAll('.cat-modal-variant-btn');
    const priceDisplay = document.getElementById('cat-modal-price-display');
    const addBagBtn = document.getElementById('cat-modal-add-bag');
    const variantBuyBtn = document.getElementById('cat-modal-buy-now');

    variantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state visually
        variantBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--color-gold-dim)';

        // Update Price
        const newPrice = btn.dataset.price;
        if (priceDisplay) priceDisplay.textContent = newPrice;

        // Update Button variant IDs
        const newId = btn.dataset.id;
        if (addBagBtn) {
          addBagBtn.dataset.variantId = newId;
          addBagBtn.dataset.price = newPrice;
        }
        if (variantBuyBtn) {
          variantBuyBtn.dataset.variantId = newId;
        }
      });
    });

    // Thumbnail click
    this.modalEl.querySelectorAll('.cat-modal-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        this.modalImageIndex = parseInt(thumb.dataset.index);
        const mainImg = document.getElementById('cat-modal-main-image');
        if (mainImg) {
          mainImg.style.opacity = '0';
          mainImg.style.transform = 'scale(0.95)';
          setTimeout(() => {
            mainImg.src = images[this.modalImageIndex].url;
            mainImg.style.opacity = '1';
            mainImg.style.transform = 'scale(1)';
          }, 200);
        }
        // Update active state
        this.modalEl.querySelectorAll('.cat-modal-thumb').forEach((t, i) => {
          t.classList.toggle('active', i === this.modalImageIndex);
        });
      });
    });

    // Add to Cart in modal
    const modalCartBtn = this.modalEl.querySelector('.cat-btn-cart');
    if (modalCartBtn) {
      modalCartBtn.addEventListener('click', () => {
        this.handleAddToCart(modalCartBtn, product);
      });
    }

    // Buy Now
    const buyNowBtn = document.getElementById('cat-modal-buy-now');
    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', async () => {
        await this.handleBuyNow(product);
      });
    }

    // Image transition style
    const mainImg = document.getElementById('cat-modal-main-image');
    if (mainImg) {
      mainImg.style.transition = 'opacity 300ms var(--ease-luxury), transform 300ms var(--ease-luxury)';
    }
  },

  /* ============================================================
     BUY NOW — Direct Checkout
     ============================================================ */
  async handleBuyNow(product) {
    const variantId = product.variants[0]?.id;
    if (!variantId) {
      const domain = window.SHOPIFY_CONFIG?.storeDomain || '7cszxa-9r.myshopify.com';
      window.open(`https://${domain}/products/${product.handle}`, '_blank');
      return;
    }

    try {
      const cart = await ShopifyAPI.createCart([{ merchandiseId: variantId, quantity: 1 }]);
      if (cart?.checkoutUrl) {
        window.location.href = cart.checkoutUrl;
      }
    } catch (err) {
      console.error('Buy Now error:', err);
      const domain = window.SHOPIFY_CONFIG?.storeDomain || '7cszxa-9r.myshopify.com';
      window.open(`https://${domain}/products/${product.handle}`, '_blank');
    }
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
        this.showAll = false;
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
          this.showAll = true; // Show all results when searching
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

    // Explore button
    if (this.exploreBtn) {
      this.exploreBtn.addEventListener('click', () => {
        this.showAll = true;
        this.renderProducts();
        // Scroll to reveal new products smoothly
        const grid = document.getElementById('catalogue-grid');
        if (grid) {
          const lastInitialCard = grid.children[this.displayedCount - 1];
          if (lastInitialCard) {
            setTimeout(() => {
              lastInitialCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        }
      });
    }

    // Modal overlay click to close
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.closeModal();
        }
      });
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalOverlay?.classList.contains('open')) {
        this.closeModal();
      }
    });
  },

  /* ============================================================
     PRODUCT TRANSITION — Smooth filter/search/sort changes
     ============================================================ */
  transitionProducts() {
    if (!this.grid) return;

    // Fade out current cards
    const cards = this.grid.querySelectorAll('.cat-card');
    cards.forEach(card => {
      card.style.transition = 'opacity 200ms, transform 200ms';
      card.style.opacity = '0';
      card.style.transform = 'translateY(15px) scale(0.97)';
    });

    setTimeout(() => {
      this.renderProducts();
    }, 220);
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

    // Debounced resize
    let dustResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(dustResizeTimer);
      dustResizeTimer = setTimeout(() => this.resizeDustCanvas(), 200);
    });

    // Create particles
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

    // Only animate when catalogue section is visible
    const section = document.getElementById('catalogue');
    if (section) {
      const observer = new IntersectionObserver((entries) => {
        this.dustVisible = entries[0].isIntersecting;
        if (this.dustVisible && !this.dustRaf) {
          this.animateDust();
        }
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

    // Skip when offscreen
    if (!this.dustVisible) {
      this.dustRaf = null;
      return;
    }

    this.dustCtx.clearRect(0, 0, this.dustCanvas.width, this.dustCanvas.height);

    const time = Date.now() * 0.001;

    this.dustParticles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around
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
  window.Catalogue = Catalogue;
}

/* ============================================================
   BOOT
   ============================================================ */
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Catalogue.init());
  } else {
    Catalogue.init();
  }
})();
