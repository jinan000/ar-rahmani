/* ============================================================
   AR-RAHMANI — Product Detail Page Module
   Premium immersive product experience
   ============================================================ */

const ProductPage = {
  product: null,
  allProducts: [],
  currentImageIndex: 0,
  selectedVariantIndex: 0,

  /* ============================================================
     INIT
     ============================================================ */
  async init() {
    const container = document.getElementById('pdp-container');
    if (!container) return;

    console.log('[ProductPage] Initializing...');

    // Extract handle from URL
    const params = new URLSearchParams(window.location.search);
    const handle = params.get('handle');

    if (!handle) {
      this.renderError('No product specified.');
      return;
    }

    this.container = container;
    this.showLoading();

    try {
      // Fetch the product
      const rawProduct = await ShopifyAPI.getProductByHandle(handle);

      if (!rawProduct) {
        this.renderError('Product not found.');
        return;
      }

      this.product = this._normalizeProduct(rawProduct);
      console.log('[ProductPage] Product loaded:', this.product.title);

      // Render the product
      this.renderProduct();

      // Fetch related products in background
      this.loadRelatedProducts();

    } catch (err) {
      console.error('[ProductPage] Error loading product:', err);
      this.renderError('Unable to load product. Please try again.');
    }
  },

  /* ============================================================
     NORMALIZE PRODUCT (same as catalogue)
     ============================================================ */
  _normalizeProduct(node) {
    const metaMap = {};
    if (node.metafields && Array.isArray(node.metafields)) {
      node.metafields.forEach(mf => {
        if (mf && mf.key && mf.value) metaMap[mf.key] = mf.value;
      });
    }

    let images = [];
    if (node.images?.edges && node.images.edges.length > 0) {
      images = node.images.edges.map(e => ({
        url: e.node.url,
        alt: e.node.altText || node.title,
        width: e.node.width,
        height: e.node.height
      }));
    } else if (node.featuredImage) {
      images.push({
        url: node.featuredImage.url,
        alt: node.featuredImage.altText || node.title,
        width: node.featuredImage.width,
        height: node.featuredImage.height
      });
    }

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
      seoTitle: node.seo?.title || '',
      seoDescription: node.seo?.description || '',
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
     IMAGE URL HELPER
     ============================================================ */
  getOptimizedImageUrl(url, width = 800) {
    if (!url) return 'assets/images/hamood.webp';
    if (url.includes('cdn.shopify.com')) {
      return url.includes('?') ? `${url}&width=${width}` : `${url}?width=${width}`;
    }
    return url;
  },

  /* ============================================================
     LOADING STATE
     ============================================================ */
  showLoading() {
    this.container.innerHTML = `
      <div class="pdp-loading">
        <div class="pdp-loading-spinner"></div>
        <div class="pdp-loading-text">Loading fragrance...</div>
      </div>
    `;
  },

  /* ============================================================
     ERROR STATE
     ============================================================ */
  renderError(message) {
    this.container.innerHTML = `
      <div class="pdp-error">
        <h2 class="pdp-error-title">Fragrance Not Found</h2>
        <p class="pdp-error-text">${this._escapeHtml(message)}</p>
        <a href="collection.html" class="pdp-error-btn">
          <span>Browse Collection</span>
          <span>→</span>
        </a>
      </div>
    `;
  },

  /* ============================================================
     RENDER PRODUCT
     ============================================================ */
  renderProduct() {
    const p = this.product;
    if (!p) return;

    // Update page title
    document.title = `${p.title} — Ar-Rahmani | Luxury Extrait de Parfum`;

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = p.seoDescription || p.shortDescription || p.description || `${p.title} — Luxury Extrait de Parfum by Ar-Rahmani`;
    }

    const concentration = p.concentration || p.productType || 'Extrait de Parfum';
    const mainImage = this.getOptimizedImageUrl(p.images[0]?.url, 800);
    const isZero = parseFloat(p.price) === 0;
    const currentVariant = p.variants[this.selectedVariantIndex] || p.variants[0];
    const displayPrice = isZero ? '180.00' : currentVariant?.price || p.price;

    // Build notes section
    let notesHTML = '';
    if (p.topNotes || p.heartNotes || p.baseNotes) {
      notesHTML = `
        <div class="pdp-notes">
          <div class="pdp-notes-title">Fragrance Notes</div>
          <div class="pdp-notes-pyramid">
            ${p.topNotes ? `
            <div class="pdp-note-row">
              <span class="pdp-note-label">Top</span>
              <div>
                <span class="pdp-note-value">${this._escapeHtml(p.topNotes)}</span>
                <div class="pdp-note-bar"><div class="pdp-note-bar-fill" style="width: 100%"></div></div>
              </div>
            </div>` : ''}
            ${p.heartNotes ? `
            <div class="pdp-note-row">
              <span class="pdp-note-label">Heart</span>
              <div>
                <span class="pdp-note-value">${this._escapeHtml(p.heartNotes)}</span>
                <div class="pdp-note-bar"><div class="pdp-note-bar-fill" style="width: 75%"></div></div>
              </div>
            </div>` : ''}
            ${p.baseNotes ? `
            <div class="pdp-note-row">
              <span class="pdp-note-label">Base</span>
              <div>
                <span class="pdp-note-value">${this._escapeHtml(p.baseNotes)}</span>
                <div class="pdp-note-bar"><div class="pdp-note-bar-fill" style="width: 50%"></div></div>
              </div>
            </div>` : ''}
          </div>
        </div>
      `;
    }

    // Build performance tags
    const perfItems = [
      { label: 'Profile', value: p.scentProfile },
      { label: 'Longevity', value: p.longevity },
      { label: 'Projection', value: p.projection },
      { label: 'Sillage', value: p.sillage },
      { label: 'Occasion', value: p.occasion },
      { label: 'Season', value: p.season },
      { label: 'Family', value: p.fragranceFamily }
    ].filter(item => item.value);

    let perfHTML = '';
    if (perfItems.length > 0) {
      perfHTML = `
        <div class="pdp-performance">
          <div class="pdp-perf-title">Details</div>
          <div class="pdp-perf-grid">
            ${perfItems.map(item => `
              <div class="pdp-perf-tag">
                <span class="pdp-perf-tag-label">${item.label}:</span>
                <span>${this._escapeHtml(item.value)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Build thumbnails
    let thumbsHTML = '';
    if (p.images.length > 1) {
      thumbsHTML = `
        <div class="pdp-gallery-thumbs">
          ${p.images.map((img, i) => `
            <button class="pdp-gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}">
              <img src="${this.getOptimizedImageUrl(img.url, 150)}" alt="${this._escapeHtml(img.alt || p.title)}">
            </button>
          `).join('')}
        </div>
      `;
    }

    // Build variant selector
    const hasMultipleVariants = p.variants && p.variants.length > 1;
    const hasNamedVariants = hasMultipleVariants || (p.variants.length === 1 && p.variants[0].title !== 'Default Title');
    let variantsHTML = '';
    if (hasNamedVariants) {
      variantsHTML = `
        <div class="pdp-variants">
          <div class="pdp-variants-title">Select Size</div>
          <div class="pdp-variant-options">
            ${p.variants.map((v, i) => `
              <button class="pdp-variant-btn ${i === this.selectedVariantIndex ? 'active' : ''} ${!v.available ? 'unavailable' : ''}"
                      data-index="${i}" data-variant-id="${v.id}" data-price="${v.price}"
                      ${!v.available ? 'disabled' : ''}>
                ${this._escapeHtml(v.title)}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Compare at price
    const compareHTML = currentVariant?.compareAtPrice && parseFloat(currentVariant.compareAtPrice) > parseFloat(displayPrice)
      ? `<span class="pdp-price-compare">${currentVariant.compareAtPrice} AED</span>`
      : '';

    this.container.innerHTML = `
      <!-- Ambient Background -->
      <div class="pdp-ambient">
        <div class="pdp-ambient-glow pdp-ambient-glow--1"></div>
        <div class="pdp-ambient-glow pdp-ambient-glow--2"></div>
      </div>

      <!-- Breadcrumb -->
      <nav class="pdp-breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a>
        <span class="breadcrumb-sep">◆</span>
        <a href="collection.html">Collection</a>
        <span class="breadcrumb-sep">◆</span>
        <span class="breadcrumb-current">${this._escapeHtml(p.title)}</span>
      </nav>

      <!-- Main Product Section -->
      <div class="pdp-main">
        <!-- Gallery -->
        <div class="pdp-gallery">
          <div class="pdp-gallery-main">
            <img src="${mainImage}" alt="${this._escapeHtml(p.title)}" id="pdp-main-image"
                 onerror="this.onerror=null; this.src='assets/images/hamood.webp';">
          </div>
          ${thumbsHTML}
        </div>

        <!-- Info -->
        <div class="pdp-info">
          <div class="pdp-concentration">${this._escapeHtml(concentration)}</div>
          <h1 class="pdp-title">${this._escapeHtml(p.title)}</h1>
          ${p.fragranceFamily ? `<div class="pdp-family">${this._escapeHtml(p.fragranceFamily)}</div>` : ''}
          <div class="pdp-divider"></div>
          <p class="pdp-description">${this._escapeHtml(p.description)}</p>

          ${notesHTML}
          ${perfHTML}
          ${variantsHTML}

          <!-- Price -->
          <div class="pdp-price-wrap">
            ${compareHTML}
            <span class="pdp-price" id="pdp-price">${displayPrice}</span>
            <span class="pdp-price-currency">AED</span>
          </div>

          <!-- Actions -->
          <div class="pdp-actions">
            <button class="pdp-btn-add" id="pdp-add-to-cart"
                    data-variant-id="${currentVariant?.id || ''}"
                    data-product-title="${this._escapeHtml(p.title)}"
                    data-price="${displayPrice}">
              ADD TO BAG
            </button>
            <button class="pdp-btn-buy" id="pdp-buy-now">
              BUY NOW
            </button>
          </div>

          <!-- Features -->
          <div class="pdp-features">
            <div class="pdp-feature">
              <span class="pdp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
                </svg>
              </span>
              <div class="pdp-feature-label">Extrait de Parfum</div>
            </div>
            <div class="pdp-feature">
              <span class="pdp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </span>
              <div class="pdp-feature-label">Long Lasting</div>
            </div>
            <div class="pdp-feature">
              <span class="pdp-feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="8" width="18" height="4" rx="1"></rect>
                  <path d="M12 8v13"></path>
                  <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
                </svg>
              </span>
              <div class="pdp-feature-label">Luxury Packaging</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Related Products -->
      <section class="pdp-related" id="pdp-related">
        <div class="pdp-related-header">
          <div class="pdp-related-label">You May Also Like</div>
          <h2 class="pdp-related-title">Explore More <span class="text-gold-gradient">Fragrances</span></h2>
        </div>
        <div class="pdp-related-scroll" id="pdp-related-scroll">
          <!-- Populated by JS -->
        </div>
      </section>
    `;

    // Setup event listeners
    this.setupGalleryEvents();
    this.setupVariantEvents();
    this.setupCartEvents();
  },

  /* ============================================================
     GALLERY EVENTS
     ============================================================ */
  setupGalleryEvents() {
    const thumbs = this.container.querySelectorAll('.pdp-gallery-thumb');
    const mainImg = document.getElementById('pdp-main-image');

    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const index = parseInt(thumb.dataset.index);
        this.currentImageIndex = index;

        // Animate transition
        if (mainImg) {
          mainImg.classList.add('switching');
          setTimeout(() => {
            mainImg.src = this.getOptimizedImageUrl(this.product.images[index].url, 800);
            mainImg.classList.remove('switching');
          }, 300);
        }

        // Update active thumb
        thumbs.forEach((t, i) => {
          t.classList.toggle('active', i === index);
        });
      });
    });
  },

  /* ============================================================
     VARIANT EVENTS
     ============================================================ */
  setupVariantEvents() {
    const variantBtns = this.container.querySelectorAll('.pdp-variant-btn');
    const priceEl = document.getElementById('pdp-price');
    const addBtn = document.getElementById('pdp-add-to-cart');

    variantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        this.selectedVariantIndex = index;
        const variant = this.product.variants[index];

        // Update active state
        variantBtns.forEach((b, i) => {
          b.classList.toggle('active', i === index);
        });

        // Update price
        const isZero = parseFloat(variant.price) === 0;
        const displayPrice = isZero ? '180.00' : variant.price;
        if (priceEl) priceEl.textContent = displayPrice;

        // Update Add to Cart button
        if (addBtn) {
          addBtn.dataset.variantId = variant.id;
          addBtn.dataset.price = displayPrice;
        }

        // If variant has its own image, switch to it
        if (variant.image) {
          const imgIndex = this.product.images.findIndex(img => img.url === variant.image);
          if (imgIndex >= 0) {
            const mainImg = document.getElementById('pdp-main-image');
            if (mainImg) {
              mainImg.classList.add('switching');
              setTimeout(() => {
                mainImg.src = this.getOptimizedImageUrl(this.product.images[imgIndex].url, 800);
                mainImg.classList.remove('switching');
              }, 300);
            }
            this.currentImageIndex = imgIndex;
            const thumbs = this.container.querySelectorAll('.pdp-gallery-thumb');
            thumbs.forEach((t, i) => t.classList.toggle('active', i === imgIndex));
          }
        }
      });
    });
  },

  /* ============================================================
     CART EVENTS
     ============================================================ */
  setupCartEvents() {
    const addBtn = document.getElementById('pdp-add-to-cart');
    const buyBtn = document.getElementById('pdp-buy-now');

    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const variantId = addBtn.dataset.variantId;
        if (!variantId) return;

        const originalText = addBtn.textContent;
        addBtn.textContent = 'ADDING...';
        addBtn.disabled = true;

        try {
          if (window.CartService) {
            await CartService.addLine(variantId, 1);
          } else {
            // Fallback: direct API call
            if (!window._cartId) {
              const cart = await ShopifyAPI.createCart([{ merchandiseId: variantId, quantity: 1 }]);
              window._cartId = cart.id;
              localStorage.setItem('shopify_cart_id', cart.id);
            } else {
              await ShopifyAPI.addToCart(window._cartId, [{ merchandiseId: variantId, quantity: 1 }]);
            }
          }

          addBtn.textContent = 'ADDED ✓';
          addBtn.classList.add('added');

          setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.classList.remove('added');
            addBtn.disabled = false;
          }, 2000);
        } catch (err) {
          console.error('Add to cart error:', err);
          addBtn.textContent = 'ERROR — TRY AGAIN';
          setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.disabled = false;
          }, 2000);
        }
      });
    }

    if (buyBtn) {
      buyBtn.addEventListener('click', async () => {
        const variant = this.product.variants[this.selectedVariantIndex] || this.product.variants[0];
        if (!variant?.id) {
          const domain = window.SHOPIFY_CONFIG?.storeDomain || '7cszxa-9r.myshopify.com';
          window.open(`https://${domain}/products/${this.product.handle}`, '_blank');
          return;
        }

        buyBtn.textContent = 'PROCESSING...';
        buyBtn.disabled = true;

        try {
          const cart = await ShopifyAPI.createCart([{ merchandiseId: variant.id, quantity: 1 }]);
          if (cart?.checkoutUrl) {
            window.location.href = cart.checkoutUrl;
          }
        } catch (err) {
          console.error('Buy Now error:', err);
          const domain = window.SHOPIFY_CONFIG?.storeDomain || '7cszxa-9r.myshopify.com';
          window.open(`https://${domain}/products/${this.product.handle}`, '_blank');
        }
      });
    }
  },

  /* ============================================================
     RELATED PRODUCTS
     ============================================================ */
  async loadRelatedProducts() {
    try {
      const products = await ShopifyAPI.getProducts(20);
      if (!products || products.length === 0) return;

      // Filter out current product and pick up to 8 related
      const related = products
        .filter(p => p.handle !== this.product.handle)
        .slice(0, 8);

      this.renderRelatedProducts(related);
    } catch (err) {
      console.warn('[ProductPage] Could not load related products:', err.message);
    }
  },

  renderRelatedProducts(products) {
    const scroll = document.getElementById('pdp-related-scroll');
    if (!scroll || products.length === 0) {
      // Hide the section if no related products
      const section = document.getElementById('pdp-related');
      if (section) section.style.display = 'none';
      return;
    }

    scroll.innerHTML = products.map(p => {
      const imgUrl = p.images?.edges?.[0]?.node?.url || p.images?.[0]?.url || 'assets/images/hamood.webp';
      const optimizedImg = this.getOptimizedImageUrl(imgUrl, 400);
      const title = p.title || 'Untitled';
      const price = parseFloat(p.priceRange?.minVariantPrice?.amount || 0).toFixed(2);
      const isZero = parseFloat(price) === 0;
      const displayPrice = isZero ? '180.00' : price;
      const handle = p.handle || '';

      return `
        <a href="product.html?handle=${handle}" class="pdp-related-card">
          <div class="pdp-related-card-image">
            <img src="${optimizedImg}" alt="${this._escapeHtml(title)}" loading="lazy" decoding="async"
                 onerror="this.onerror=null; this.src='assets/images/hamood.webp';">
          </div>
          <div class="pdp-related-card-info">
            <div class="pdp-related-card-type">Extrait de Parfum</div>
            <h3 class="pdp-related-card-name">${this._escapeHtml(title)}</h3>
            <div class="pdp-related-card-price"><span>${displayPrice}</span> AED</div>
          </div>
        </a>
      `;
    }).join('');
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
  window.ProductPage = ProductPage;
}

/* ============================================================
   BOOT
   ============================================================ */
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProductPage.init());
  } else {
    ProductPage.init();
  }
})();
