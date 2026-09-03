/* ============================================================
   AR-RAHMANI — Shopify Cart UI Integration (Rebuilt)
   Pure View Layer driven by CartService state.
   ============================================================ */

const ShopifyCartUI = {
  shopifyProducts: [], // Used strictly for UI metadata (descriptions, matching names)

  async init() {
    this.injectCartMarkup();
    this.setupEventListeners();
    
    // Subscribe to State Changes
    if (window.CartService) {
      window.CartService.subscribe((state) => this.renderCart(state));
      await window.CartService.init();
    }
    
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
            <div class="cart-actions-row" style="display: flex; gap: 10px; margin-top: 15px;">
              <button class="btn btn-outline close-drawer-link" style="flex: 1; padding: 12px; font-size: 0.9em;">
                <span>CONTINUE SHOPPING</span>
              </button>
              <button class="btn btn-primary cart-checkout-btn" id="cart-checkout-btn" style="flex: 1; padding: 12px; font-size: 0.9em;">
                <span>PROCEED TO CHECKOUT</span>
                <span class="btn-arrow">→</span>
              </button>
            </div>
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
        await this.handleAddToBagClick(addBtn);
      }
    });

    // Checkout button listener
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (window.CartService) {
           await window.CartService.checkout();
        }
      });
    }

    // Escape key to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDrawer();
    });

    // Handle Bfcache - explicitly tell CartService to reset checkout state if returning via Back button
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && window.CartService) {
         window.CartService.resetCheckoutState();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && window.CartService) {
         window.CartService.resetCheckoutState();
      }
    });
  },

  /**
   * Show Toast Notification
   */
  showToast(message, isError = false) {
    const toast = document.getElementById('cart-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `cart-toast show ${isError ? 'error' : ''}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  },

  /**
   * Click Handler for "Add to Bag" buttons.
   * Maps UI data to variantID and dispatches to CartService.
   */
  async handleAddToBagClick(buttonElement) {
    // 1. Prevent duplicate clicks
    if (buttonElement.disabled) return;

    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = `<span>ADDING...</span>`;
    buttonElement.disabled = true;

    try {
      let productName = buttonElement.dataset.productTitle || "HAMOOD";
      let variantId = buttonElement.dataset.variantId || null;

      // Fallback for featured showcase if no dataset exists
      if (!buttonElement.dataset.productTitle && typeof FeaturedShowcase !== 'undefined' && FeaturedShowcase.products) {
        const activeItem = FeaturedShowcase.products.find(p => p.id === FeaturedShowcase.activeId);
        if (activeItem) {
          productName = activeItem.name;
          variantId = activeItem.selectedVariantId || activeItem.shopifyVariantId || null;
        }
      }

      // 2. Validate Variant GID
      let isRealShopifyVariant = variantId && typeof variantId === 'string' && variantId.startsWith('gid://shopify/ProductVariant/');
      
      if (!isRealShopifyVariant && this.shopifyProducts.length > 0) {
        const matchedProduct = this.shopifyProducts.find(p => 
          p.title.toLowerCase().includes(productName.toLowerCase()) || 
          productName.toLowerCase().includes(p.title.toLowerCase())
        );
        if (matchedProduct) {
          const matchedVariants = matchedProduct.variants?.edges?.map(e => e.node) || matchedProduct.variants || [];
          if (matchedVariants.length > 0) {
            variantId = matchedVariants[0].id;
            isRealShopifyVariant = true;
          }
        }
      }

      if (!isRealShopifyVariant) {
        throw new Error("Invalid Product/Variant Configuration");
      }

      if (window.CartService) {
        // 3. Dispatch to CartService
        await window.CartService.addLine(variantId, 1);
        
        // 4. Verify no Shopify/CartService errors occurred
        if (window.CartService.state.error) {
          throw new Error(window.CartService.state.error);
        }

        // 5. Success Path
        if (window.CartService.state.status === 'ready') {
           buttonElement.innerHTML = `<span>ADDED TO BAG ✓</span>`;
           this.showToast(`${productName} added to your bag`);
           // Delay opening drawer slightly for visual effect, but we DO NOT delay reverting the button
           setTimeout(() => {
             this.openDrawer();
           }, 300);
        }
      } else {
        throw new Error("CartService is not initialized");
      }
    } catch (error) {
      // 6. Error Path - display exact error
      console.warn('UI Add to Cart Error:', error);
      this.showToast("Failed to add to cart: " + error.message, true);
    } finally {
      // 7. Guaranteed Synchronous Cleanup
      buttonElement.innerHTML = originalText;
      buttonElement.disabled = false;
    }
  },

  /**
   * Render DOM purely based on CartService state
   */
  renderCart(state) {
    // 1. Toast Error Handling
    if (state.error) {
       this.showToast(state.error, true);
    }

    // 2. Checkout Button Status
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      if (state.status === 'checking_out') {
        checkoutBtn.innerHTML = `<span>REDIRECTING...</span>`;
        checkoutBtn.disabled = true;
      } else if (state.status === 'initializing' || state.status === 'updating') {
        checkoutBtn.innerHTML = `<span>UPDATING...</span>`;
        checkoutBtn.disabled = true;
      } else {
        checkoutBtn.innerHTML = `<span>PROCEED TO CHECKOUT</span><span class="btn-arrow">→</span>`;
        checkoutBtn.disabled = state.lines.length === 0;
      }
    }

    // 3. UI Updates
    const badge = document.getElementById('cart-badge');
    const drawerCount = document.getElementById('drawer-item-count');
    const subtotalEl = document.getElementById('cart-subtotal');
    
    if (badge) {
      badge.textContent = state.totalQuantity;
      badge.classList.toggle('has-items', state.totalQuantity > 0);
    }
    if (drawerCount) drawerCount.textContent = `(${state.totalQuantity} item${state.totalQuantity === 1 ? '' : 's'})`;
    if (subtotalEl) subtotalEl.textContent = `${state.subtotal} ${state.currency}`;

    const itemsListEl = document.getElementById('cart-items-list');
    const emptyStateEl = document.getElementById('cart-empty-state');
    const footerEl = document.getElementById('cart-drawer-footer');

    if (state.lines.length === 0) {
      if (emptyStateEl) emptyStateEl.style.display = 'flex';
      if (itemsListEl) itemsListEl.innerHTML = '';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    if (itemsListEl) {
      itemsListEl.innerHTML = state.lines.map(line => {
        const linePrice = parseFloat(line.price) || 0;
        const lineTotal = (linePrice * line.quantity).toFixed(2);
        const itemCurr = line.currency || state.currency;
        const isDisabled = state.status === 'updating';
        
        return `
        <div class="cart-item" data-line-id="${line.id}">
          <div class="cart-item-image">
            <img src="${line.image || 'assets/images/hamood.webp'}" alt="${line.productTitle}">
          </div>
          <div class="cart-item-details">
            <div class="cart-item-header">
              <h4 class="cart-item-title">${line.productTitle}</h4>
              <button class="cart-item-remove" onclick="ShopifyCartUI.removeItem('${line.id}')" aria-label="Remove item" ${isDisabled ? 'disabled' : ''}>&times;</button>
            </div>
            <p class="cart-item-variant">${line.variantTitle || 'Extrait de Parfum'}</p>
            <div class="cart-item-footer">
              <div class="cart-qty-selector">
                <button class="qty-btn" onclick="ShopifyCartUI.updateQuantity('${line.id}', ${line.quantity - 1})" aria-label="Decrease" ${isDisabled ? 'disabled' : ''}>&minus;</button>
                <span class="qty-num">${line.quantity}</span>
                <button class="qty-btn" onclick="ShopifyCartUI.updateQuantity('${line.id}', ${line.quantity + 1})" aria-label="Increase" ${isDisabled ? 'disabled' : ''}>&plus;</button>
              </div>
              <span class="cart-item-price">${lineTotal} ${itemCurr}</span>
            </div>
          </div>
        </div>
      `;
      }).join('');
    }
  },

  // Proxies for inline HTML onclick handlers
  updateQuantity(lineId, newQty) {
    if (window.CartService) window.CartService.updateQuantity(lineId, newQty);
  },

  removeItem(lineId) {
    if (window.CartService) window.CartService.removeLine(lineId);
  },

  /**
   * Sync products to map titles/IDs for showcase
   */
  async syncProductsFromShopify() {
    try {
      if (typeof ShopifyAPI !== 'undefined') {
         const products = await ShopifyAPI.getProducts(10);
         if (products && products.length > 0) {
           this.shopifyProducts = products;
           
           if (typeof FeaturedShowcase !== 'undefined' && FeaturedShowcase.products) {
             FeaturedShowcase.products.forEach(localProd => {
               const match = products.find(sp => sp.title.toLowerCase().includes(localProd.name.toLowerCase()));
               if (match) {
                 localProd.shopifyId = match.id;
                 const flatVariants = match.variants?.edges ? match.variants.edges.map(e => e.node) : match.variants;
                 if (flatVariants && flatVariants.length > 0) {
                   localProd.shopifyVariantId = flatVariants[0].id;
                   localProd.price = `$${parseFloat(flatVariants[0].price.amount).toFixed(2)}`;
                 }
               }
             });
             if (typeof FeaturedShowcase.updateCards === 'function') {
               FeaturedShowcase.updateCards(true);
             }
           }
         }
      }
    } catch (e) {
      console.warn('Failed to sync Shopify products for UI mapping', e);
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
  }
};

window.ShopifyCartUI = ShopifyCartUI;

// Initialize when DOM is ready
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ShopifyCartUI.init());
  } else {
    ShopifyCartUI.init();
  }
})();
