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
        await this.handleAddToBag(addBtn);
      }
    });

    // Checkout button listener
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Re-validate cart with Shopify before proceeding
        checkoutBtn.innerHTML = `<span>VALIDATING...</span>`;
        checkoutBtn.disabled = true;
        
        try {
          if (this.cart && this.cart.id) {
            this.cart = await ShopifyAPI.getCart(this.cart.id);
            const isValid = await this.validateCartItems();
            if (!isValid) {
              this.cart = await ShopifyAPI.getCart(this.cart.id);
              this.renderCart();
              this.showToast('Some items in your cart are no longer available and were removed.', true);
              checkoutBtn.innerHTML = `<span>PROCEED TO CHECKOUT</span><span class="btn-arrow">→</span>`;
              checkoutBtn.disabled = false;
              return; // Stop checkout
            }
          }
          
          if (this.cart && this.cart.checkoutUrl) {
            window.location.href = this.cart.checkoutUrl;
          } else {
            this.showToast('Checkout URL unavailable', true);
            checkoutBtn.innerHTML = `<span>PROCEED TO CHECKOUT</span><span class="btn-arrow">→</span>`;
            checkoutBtn.disabled = false;
          }
        } catch (err) {
          console.error("Checkout validation failed:", err);
          this.showToast('Failed to validate cart. Please try again.', true);
          checkoutBtn.innerHTML = `<span>PROCEED TO CHECKOUT</span><span class="btn-arrow">→</span>`;
          checkoutBtn.disabled = false;
        }
      });
    }

    // Escape key to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeDrawer();
    });
  },

  /**
   * showOutOfStockModal(productTitle, variantTitle) {
    const existing = document.getElementById('out-of-stock-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'out-of-stock-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--color-dark-surface, #111);padding:30px;border-radius:8px;border:1px solid var(--color-gold-dim, #c0a062);max-width:400px;text-align:center;color:white;font-family:var(--font-sans, sans-serif);';
    
    modal.innerHTML = `
      <h2 style="color:var(--color-gold, #d4af37);margin-bottom:15px;text-transform:uppercase;letter-spacing:1px;font-size:1.5rem;">Out of stock</h2>
      <p style="margin-bottom:20px;font-size:0.9rem;line-height:1.5;opacity:0.8;">These items are no longer available and cannot be added to your cart.</p>
      <div style="margin-bottom:25px;font-weight:bold;font-size:1.1rem;background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
        ${productTitle}<br>
        <span style="font-size:0.9rem;opacity:0.7;">${variantTitle}</span><br>
        <span style="color:#e74c3c;font-size:0.8rem;margin-top:5px;display:inline-block;">SOLD OUT</span>
      </div>
      <button id="oos-close-btn" style="background:var(--color-gold, #d4af37);color:black;border:none;padding:12px 24px;border-radius:4px;cursor:pointer;font-weight:bold;text-transform:uppercase;letter-spacing:1px;width:100%;">Okay</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('oos-close-btn').addEventListener('click', () => {
      overlay.remove();
    });
  },

  /**
   * Validate Cart Items against current Shopify state
   */
  async validateCartItems() {
    if (!this.cart || !this.cart.lines) return true;
    
    const invalidLineIds = [];
    for (const line of this.cart.lines) {
      const isAvailable = line.availableForSale !== false;
      const outOfStock = line.quantityAvailable !== null && line.quantityAvailable < line.quantity && line.currentlyNotInStock !== true;
      
      if (!isAvailable || outOfStock) {
        invalidLineIds.push(line.id);
      }
    }

    if (invalidLineIds.length > 0) {
      console.warn('Found invalid/out-of-stock items in cart. Removing...', invalidLineIds);
      try {
        await ShopifyAPI.removeCartItem(this.cart.id, invalidLineIds);
        return false; // Cart was modified
      } catch (e) {
        console.error('Failed to remove invalid cart lines:', e);
      }
    }
    return true; // Cart is valid
  },

  /**
   * Load Cart from localStorage
   */
  async loadCart() {
    const savedCartId = localStorage.getItem(this.cartIdKey);
    if (savedCartId) {
      try {
        const existingCart = await ShopifyAPI.getCart(savedCartId);
        if (existingCart) {
          this.cart = existingCart;
          const isValid = await this.validateCartItems();
          if (!isValid) {
             // Re-fetch cart if lines were removed
             this.cart = await ShopifyAPI.getCart(savedCartId);
          }
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
      // Determine active product name & details from the button dataset, fallback to FeaturedShowcase
      let productName = buttonElement.dataset.productTitle || "HAMOOD";
      let price = (buttonElement.dataset.price || "180.00").replace(/[^0-9.]/g, '');
      let variantId = buttonElement.dataset.variantId || null;

      if (!buttonElement.dataset.productTitle && typeof FeaturedShowcase !== 'undefined' && FeaturedShowcase.products) {
        const activeItem = FeaturedShowcase.products.find(p => p.id === FeaturedShowcase.activeId);
        if (activeItem) {
          productName = activeItem.name;
          price = activeItem.price.replace(/[^0-9.]/g, '');
          variantId = activeItem.selectedVariantId || activeItem.shopifyVariantId || null;
        }
      }

      // Check if variantId is a valid published Shopify GID
      let isRealShopifyVariant = variantId && typeof variantId === 'string' && variantId.startsWith('gid://shopify/ProductVariant/');
      let matchedVariant = null;

      // Ensure variantId is valid and fetch live variant data
      if (this.shopifyProducts.length > 0) {
        const matchedProduct = this.shopifyProducts.find(p => 
          p.title.toLowerCase().includes(productName.toLowerCase()) || 
          productName.toLowerCase().includes(p.title.toLowerCase())
        );
        if (matchedProduct && matchedProduct.variants?.length > 0) {
          if (isRealShopifyVariant) {
            matchedVariant = matchedProduct.variants.find(v => v.id === variantId) || matchedProduct.variants[0];
          } else {
            matchedVariant = matchedProduct.variants[0];
            variantId = matchedVariant.id;
            isRealShopifyVariant = true;
          }
        }
      }

      // We defer validation to Shopify. We attempt to add to cart, and check the resulting cart state.
      // If we receive a userError from Shopify, it will be thrown and caught below.

      if (isRealShopifyVariant) {
        if (!this.cart || !this.cart.id || this.cart.id.startsWith('local_cart_')) {
          this.cart = await ShopifyAPI.createCart([{ merchandiseId: variantId, quantity: 1 }]);
          localStorage.setItem(this.cartIdKey, this.cart.id);
        } else {
          this.cart = await ShopifyAPI.addToCart(this.cart.id, [{ merchandiseId: variantId, quantity: 1 }]);
        }
      } else {
        throw new Error("Invalid Shopify Variant ID");
      }

      buttonElement.innerHTML = `<span>ADDED TO BAG ✓</span>`;
      this.showToast(`${productName} added to your bag`);
      this.renderCart();
      
      setTimeout(() => {
        this.openDrawer();
      }, 300);

    } catch (error) {
      console.warn('Shopify Cart Notice:', error.message);
      
      // If Shopify API throws a userError or network error, we can check if it's an inventory issue
      // We will also re-fetch the specific product to confirm its exact state.
      if (isRealShopifyVariant && variantId) {
         try {
           const productHandle = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
           const liveProduct = await ShopifyAPI.getProductByHandle(productHandle);
           if (liveProduct && liveProduct.variants) {
             const liveVariant = liveProduct.variants.edges.map(e => e.node).find(v => v.id === variantId);
             if (liveVariant) {
               const isAvailable = liveVariant.availableForSale !== false;
               
               let currentCartQty = 0;
               if (this.cart && this.cart.lines) {
                 const existingLine = this.cart.lines.find(l => l.variantId === variantId);
                 if (existingLine) currentCartQty = existingLine.quantity;
               }
               const requestedQty = currentCartQty + 1;
               
               const outOfStock = liveVariant.quantityAvailable !== null && liveVariant.quantityAvailable < requestedQty && liveVariant.currentlyNotInStock !== true;
               
               if (!isAvailable || outOfStock) {
                 this.showOutOfStockModal(productName, liveVariant.title || "Size");
                 return; // Do not show generic toast
               }
             }
           }
         } catch (e) {
           console.warn('Failed to verify live inventory:', e);
         }
      }
      
      this.showToast("Failed to add to cart: " + error.message);
    } finally {
      setTimeout(() => {
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
      }, 1800);
    }
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
        const tempCart = await ShopifyAPI.updateCartItem(this.cart.id, lineId, newQty);
        
        // After updating, check if the quantity was actually applied, or if there's an inventory limit
        const updatedLine = tempCart.lines.find(l => l.id === lineId);
        if (updatedLine) {
          const outOfStock = updatedLine.quantityAvailable !== null && updatedLine.quantityAvailable < newQty && updatedLine.currentlyNotInStock !== true;
          if (outOfStock || updatedLine.quantity < newQty) {
             this.showOutOfStockModal(updatedLine.productTitle, updatedLine.variantTitle);
             // Re-update back to the max available quantity
             const maxQty = updatedLine.quantityAvailable !== null ? updatedLine.quantityAvailable : updatedLine.quantity;
             if (maxQty > 0) {
               this.cart = await ShopifyAPI.updateCartItem(this.cart.id, lineId, maxQty);
             } else {
               this.cart = await ShopifyAPI.removeCartItem(this.cart.id, [lineId]);
             }
             this.renderCart();
             return;
          }
        }
        
        this.cart = tempCart;
      } catch (e) {
        console.error('Shopify quantity update error:', e);
        this.showToast('Failed to update quantity', true);
      }
    }
    
    // Rerender with the strictly synced Shopify cart state
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
        console.error('Shopify remove item error', e);
      }
    }
    
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
