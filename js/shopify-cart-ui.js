/* ============================================================
   AR-RAHMANI — Shopify Cart & UI Integration
   Handles cart drawer, add-to-bag handlers, badges, and Shopify sync.
   ============================================================ */

const ShopifyCartUI = {
  cart: null,
  cartIdKey: 'ar_rahmani_shopify_cart_id',
  shopifyProducts: [],

  async init() {
    this.injectCartMarkup();
    this.setupEventListeners();
    await this.loadCart();
    await this.syncProductsFromShopify();
  },

  /**
   * Inject Cart Icon in Navbar and Cart Drawer HTML into DOM
   */
  injectCartMarkup() {
    // 1. Inject Cart Icon button into navbar-links-right
    const rightNav = document.querySelector('.navbar-links-right');
    if (rightNav && !document.getElementById('nav-cart-btn')) {
      const cartBtn = document.createElement('button');
      cartBtn.id = 'nav-cart-btn';
      cartBtn.className = 'nav-cart-btn';
      cartBtn.setAttribute('aria-label', 'Shopping Bag');
      cartBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="nav-cart-icon">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <span class="nav-cart-badge" id="cart-badge">0</span>
      `;
      rightNav.appendChild(cartBtn);
    }

    // 2. Inject Cart Drawer Markup
    if (!document.getElementById('cart-drawer-overlay')) {
      const drawerContainer = document.createElement('div');
      drawerContainer.id = 'cart-drawer-container';
      drawerContainer.innerHTML = `
        <div class="cart-drawer-overlay" id="cart-drawer-overlay"></div>
        <div class="cart-drawer" id="cart-drawer">
          <div class="cart-drawer-header">
            <div class="cart-drawer-title">
              <h3>YOUR SHOPPING BAG</h3>
              <span class="cart-drawer-count" id="drawer-item-count">(0 items)</span>
            </div>
            <button class="cart-drawer-close" id="cart-drawer-close" aria-label="Close bag">&times;</button>
          </div>

          <div class="cart-drawer-body" id="cart-drawer-body">
            <div class="cart-empty-state" id="cart-empty-state">
              <svg viewBox="0 0 24 24" class="cart-empty-icon">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <p>Your bag is currently empty.</p>
              <a href="#showcase" class="btn btn-primary btn-sm close-drawer-link">
                <span>EXPLORE COLLECTION</span>
              </a>
            </div>

            <div class="cart-items-list" id="cart-items-list"></div>
          </div>

          <div class="cart-drawer-footer" id="cart-drawer-footer">
            <div class="cart-summary-row">
              <span>SUBTOTAL</span>
              <span class="cart-subtotal-price" id="cart-subtotal">0.00 AED</span>
            </div>
            <p class="cart-tax-shipping-note">Taxes and shipping calculated at checkout.</p>
            <button class="btn btn-primary cart-checkout-btn" id="cart-checkout-btn">
              <span>PROCEED TO CHECKOUT</span>
              <span class="btn-arrow">→</span>
            </button>
          </div>
        </div>
        <div class="cart-toast" id="cart-toast"></div>
      `;
      document.body.appendChild(drawerContainer);
    }
  },

  /**
   * Set up event listeners for opening/closing drawer and cart actions
   */
  setupEventListeners() {
    // Open drawer
    document.addEventListener('click', (e) => {
      const cartBtn = e.target.closest('#nav-cart-btn');
      if (cartBtn) {
        e.preventDefault();
        this.openDrawer();
      }
    });

    // Close drawer
    const overlay = document.getElementById('cart-drawer-overlay');
    const closeBtn = document.getElementById('cart-drawer-close');
    if (overlay) overlay.addEventListener('click', () => this.closeDrawer());
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());

    // Close on link click inside drawer
    document.addEventListener('click', (e) => {
      if (e.target.closest('.close-drawer-link')) {
        this.closeDrawer();
      }
    });

    // Global "ADD TO BAG" buttons listener
    document.addEventListener('click', async (e) => {
      const addBtn = e.target.closest('.btn-add-bag');
      if (addBtn) {
        e.preventDefault();
        await this.handleAddToBag(addBtn);
      }
    });

    // Checkout button listener
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (this.cart && this.cart.checkoutUrl) {
          const url = new URL(this.cart.checkoutUrl);
          url.searchParams.set('return_to', 'https://arrahmaniperfumes.ae');
          window.location.href = url.toString();
        } else {
          this.showToast('Checkout URL unavailable', true);
        }
      });
    }

    // Escape key to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDrawer();
    });
  },

  /**
   * Load existing Shopify cart from localStorage or create new
   */
  async loadCart() {
    const savedCartId = localStorage.getItem(this.cartIdKey);
    if (savedCartId) {
      try {
        const existingCart = await ShopifyAPI.getCart(savedCartId);
        if (existingCart) {
          this.cart = existingCart;
          this.renderCart();
          return;
        }
      } catch (err) {
        console.log('Saved cart expired or invalid, creating new one...');
        localStorage.removeItem(this.cartIdKey);
      }
    }
  },

  /**
   * Add active product to Shopify Cart
   */
  async handleAddToBag(buttonElement) {
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = `<span>ADDING...</span>`;
    buttonElement.disabled = true;

    try {
      // Determine active product name & details from FeaturedShowcase or page context
      let productName = "HAMOOD";
      let price = "180.00";
      let variantId = null;

      if (typeof FeaturedShowcase !== 'undefined' && FeaturedShowcase.products) {
        const activeItem = FeaturedShowcase.products.find(p => p.id === FeaturedShowcase.activeId);
        if (activeItem) {
          productName = activeItem.name;
          price = activeItem.price.replace('₹', '').replace('$', '').replace(' INR', '').replace(' USD', '').trim();
          variantId = activeItem.selectedVariantId || activeItem.shopifyVariantId || null;
        }
      }

      // Check if variantId is a valid published Shopify GID
      const isRealShopifyVariant = variantId && typeof variantId === 'string' && variantId.startsWith('gid://shopify/ProductVariant/');

      // If variantId is not available or not GID, check matched shopify products
      if (!isRealShopifyVariant && this.shopifyProducts.length > 0) {
        const matched = this.shopifyProducts.find(p => 
          p.title.toLowerCase().includes(productName.toLowerCase()) || 
          productName.toLowerCase().includes(p.title.toLowerCase())
        );
        if (matched && matched.variants?.length > 0) {
          variantId = matched.variants[0].id;
        }
      }

      const validGid = variantId && typeof variantId === 'string' && variantId.startsWith('gid://shopify/ProductVariant/');

      // If valid Shopify variant exists, update Storefront API Cart
      if (validGid) {
        if (!this.cart || !this.cart.id || this.cart.id.startsWith('local_cart_')) {
          this.cart = await ShopifyAPI.createCart([{ merchandiseId: variantId, quantity: 1 }]);
          localStorage.setItem(this.cartIdKey, this.cart.id);
        } else {
          this.cart = await ShopifyAPI.addToCart(this.cart.id, [{ merchandiseId: variantId, quantity: 1 }]);
        }
      } else {
        // Dynamic fallback for offline/unpublished product variants
        this.addLocalFallbackItem(productName, price);
      }

      buttonElement.innerHTML = `<span>ADDED TO BAG ✓</span>`;
      this.showToast(`${productName} added to your bag`);
      this.renderCart();
      
      setTimeout(() => {
        this.openDrawer();
      }, 300);

    } catch (error) {
      console.warn('Shopify Cart Notice:', error.message);
      // Dynamic local fallback using active product name and price
      this.addLocalFallbackItem(productName, price);
      this.renderCart();
      this.openDrawer();
    } finally {
      setTimeout(() => {
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
      }, 1800);
    }
  },

  /**
   * Fallback for offline or unpublished variant testing
   */
  addLocalFallbackItem(name, price) {
    let selectedSize = '60ml';
    if (typeof FeaturedShowcase !== 'undefined' && FeaturedShowcase.products) {
      const activeItem = FeaturedShowcase.products.find(p => p.id === FeaturedShowcase.activeId);
      if (activeItem && activeItem.selectedSize) {
        selectedSize = activeItem.selectedSize;
      }
    }

    if (!this.cart) {
      this.cart = {
        id: 'local_cart_' + Date.now(),
        checkoutUrl: 'https://' + (window.SHOPIFY_CONFIG?.storeDomain || '7cszxa-9r.myshopify.com') + '/cart',
        totalQuantity: 0,
        subtotal: '0.00',
        currency: 'AED',
        lines: []
      };
    }

    const existingLine = this.cart.lines.find(l => l.productTitle === name && l.variantTitle.includes(selectedSize));
    if (existingLine) {
      existingLine.quantity += 1;
    } else {
      const imagesMap = {
        'HAMOOD': 'assets/images/hamood.webp',
        'PARADISE': 'assets/images/paradisee.webp',
        'SABR': 'assets/images/sabr.webp'
      };
      this.cart.lines.push({
        id: 'line_' + Date.now(),
        quantity: 1,
        variantId: 'variant_fallback_' + Date.now(),
        variantTitle: `Extrait de Parfum / ${selectedSize}`,
        price: parseFloat(price).toFixed(2),
        currency: 'AED',
        productTitle: name,
        image: imagesMap[name] || 'assets/images/hamood.webp'
      });
    }

    this.cart.totalQuantity = this.cart.lines.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.cart.lines.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    this.cart.subtotal = subtotal.toFixed(2);
  },

  /**
   * Update quantity of line item
   */
  async updateQuantity(lineId, newQty) {
    if (newQty <= 0) {
      await this.removeItem(lineId);
      return;
    }

    if (this.cart.id && !this.cart.id.startsWith('local_cart_')) {
      try {
        this.cart = await ShopifyAPI.updateCartItem(this.cart.id, lineId, newQty);
      } catch (e) {
        console.warn('Shopify quantity update error, falling back locally', e);
      }
    }

    // Local fallback update
    const line = this.cart.lines.find(l => l.id === lineId);
    if (line) {
      line.quantity = newQty;
      this.cart.totalQuantity = this.cart.lines.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = this.cart.lines.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
      this.cart.subtotal = subtotal.toFixed(2);
    }
    this.renderCart();
  },

  /**
   * Remove line item from cart
   */
  async removeItem(lineId) {
    if (this.cart.id && !this.cart.id.startsWith('local_cart_')) {
      try {
        this.cart = await ShopifyAPI.removeCartItem(this.cart.id, [lineId]);
      } catch (e) {
        console.warn('Shopify remove item error', e);
      }
    }

    // Local update
    this.cart.lines = this.cart.lines.filter(l => l.id !== lineId);
    this.cart.totalQuantity = this.cart.lines.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.cart.lines.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    this.cart.subtotal = subtotal.toFixed(2);
    this.renderCart();
  },

  /**
   * Render Cart Badge and Drawer Items
   */
  renderCart() {
    const totalQty = this.cart ? this.cart.totalQuantity : 0;
    const subtotal = this.cart ? this.cart.subtotal : '0.00';
    const currency = this.cart && this.cart.currency && this.cart.currency !== 'USD' ? this.cart.currency : 'AED';

    // Update Badges & Counts
    const badge = document.getElementById('cart-badge');
    const drawerCount = document.getElementById('drawer-item-count');
    const subtotalEl = document.getElementById('cart-subtotal');

    if (badge) {
      badge.textContent = totalQty;
      badge.classList.toggle('has-items', totalQty > 0);
    }
    if (drawerCount) drawerCount.textContent = `(${totalQty} item${totalQty === 1 ? '' : 's'})`;
    if (subtotalEl) subtotalEl.textContent = `${subtotal} ${currency}`;

    // Render items list
    const itemsListEl = document.getElementById('cart-items-list');
    const emptyStateEl = document.getElementById('cart-empty-state');
    const footerEl = document.getElementById('cart-drawer-footer');

    if (!this.cart || !this.cart.lines || this.cart.lines.length === 0) {
      if (emptyStateEl) emptyStateEl.style.display = 'flex';
      if (itemsListEl) itemsListEl.innerHTML = '';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    if (itemsListEl) {
      itemsListEl.innerHTML = this.cart.lines.map(line => {
        const itemCurr = line.currency && line.currency !== 'USD' ? line.currency : 'AED';
        return `
        <div class="cart-item" data-line-id="${line.id}">
          <div class="cart-item-image">
            <img src="${line.image || 'assets/images/hamood.webp'}" alt="${line.productTitle}">
          </div>
          <div class="cart-item-details">
            <div class="cart-item-header">
              <h4 class="cart-item-title">${line.productTitle}</h4>
              <button class="cart-item-remove" onclick="ShopifyCartUI.removeItem('${line.id}')" aria-label="Remove item">&times;</button>
            </div>
            <p class="cart-item-variant">${line.variantTitle || 'Extrait de Parfum'}</p>
            <div class="cart-item-footer">
              <div class="cart-qty-selector">
                <button class="qty-btn" onclick="ShopifyCartUI.updateQuantity('${line.id}', ${line.quantity - 1})" aria-label="Decrease">&minus;</button>
                <span class="qty-num">${line.quantity}</span>
                <button class="qty-btn" onclick="ShopifyCartUI.updateQuantity('${line.id}', ${line.quantity + 1})" aria-label="Increase">&plus;</button>
              </div>
              <span class="cart-item-price">${(parseFloat(line.price) * line.quantity).toFixed(2)} ${itemCurr}</span>
            </div>
          </div>
        </div>
      `;
      }).join('');
    }
  },

  /**
   * Attempt to sync live Shopify products with page showcase
   */
  async syncProductsFromShopify() {
    try {
      const products = await ShopifyAPI.getProducts(10);
      if (products && products.length > 0) {
        this.shopifyProducts = products;
        console.log('Connected to Shopify Storefront API. Products loaded:', products.length);

        // Match Shopify products to FeaturedShowcase if available
        if (typeof FeaturedShowcase !== 'undefined' && FeaturedShowcase.products) {
          FeaturedShowcase.products.forEach(localProd => {
            const match = products.find(sp => sp.title.toLowerCase().includes(localProd.name.toLowerCase()));
            if (match) {
              localProd.shopifyId = match.id;
              if (match.variants?.length > 0) {
                localProd.shopifyVariantId = match.variants[0].id;
                localProd.price = `$${parseFloat(match.variants[0].price.amount).toFixed(2)}`;
              }
              if (match.description) {
                localProd.desc = match.description;
              }
            }
          });

          // Refresh active showcase product UI
          if (typeof FeaturedShowcase.updateCards === 'function') {
            FeaturedShowcase.updateCards(true);
          }
        }
      }
    } catch (e) {
      console.log('Shopify products fetch info:', e.message);
    }
  },

  openDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  showToast(message, isError = false) {
    const toast = document.getElementById('cart-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `cart-toast show ${isError ? 'error' : ''}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
};

// Initialize when DOM is ready
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ShopifyCartUI.init());
  } else {
    ShopifyCartUI.init();
  }
})();
