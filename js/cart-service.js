/* ============================================================
   AR-RAHMANI — Centralized Commerce State Service
   Single source of truth for Cart & Checkout logic.
   ============================================================ */

const CartService = {
  cartIdKey: 'shopify_cart_id',
  subscribers: [],
  
  state: {
    id: null,
    lines: [],
    totalQuantity: 0,
    subtotal: '0.00',
    currency: 'AED',
    checkoutUrl: null,
    status: 'idle', // idle | initializing | ready | updating | checking_out | error
    error: null
  },

  // Event subscription
  subscribe(callback) {
    this.subscribers.push(callback);
    callback(this.state); // immediate sync
  },

  notify() {
    this.subscribers.forEach(callback => callback(this.state));
  },

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  },

  setError(errorMsg) {
    this.setState({ status: 'error', error: errorMsg });
    // Auto-clear error after 3 seconds so UI returns to normal
    setTimeout(() => {
      if (this.state.status === 'error') {
        this.setState({ status: 'ready', error: null });
      }
    }, 3000);
  },

  async init() {
    if (this.state.status !== 'idle') return;
    this.setState({ status: 'initializing' });
    
    const storedCartId = localStorage.getItem(this.cartIdKey);
    
    if (storedCartId) {
      try {
        const cart = await ShopifyAPI.getCart(storedCartId);
        if (cart) {
          this._applyShopifyCart(cart);
          this.setState({ status: 'ready' });
        } else {
          // Stale cart handling
          this.clearLocalCart();
          this.setState({ status: 'ready' });
        }
      } catch (err) {
        console.error('Cart Init Error:', err);
        this.clearLocalCart();
        this.setState({ status: 'ready' });
      }
    } else {
      this.setState({ status: 'ready' });
    }
  },

  clearLocalCart() {
    localStorage.removeItem(this.cartIdKey);
    this.setState({
      id: null,
      lines: [],
      totalQuantity: 0,
      subtotal: '0.00',
      checkoutUrl: null
    });
  },

  _applyShopifyCart(cartData) {
    // Check for invalid 0-quantity lines or out-of-stock items returned by Shopify
    const invalidLines = cartData.lines.filter(l => 
      l.quantity <= 0 || 
      !l.availableForSale || 
      (l.quantityAvailable !== null && l.quantityAvailable < l.quantity && !l.currentlyNotInStock)
    );

    if (invalidLines.length > 0) {
      // If there are invalid lines upon load, we must clear them. 
      // To prevent race conditions, we queue a cleanup.
      this._cleanInvalidLines(cartData.id, invalidLines.map(l => l.id));
      return;
    }

    this.setState({
      id: cartData.id,
      lines: cartData.lines,
      totalQuantity: cartData.totalQuantity,
      subtotal: cartData.subtotal,
      currency: cartData.currency,
      checkoutUrl: cartData.checkoutUrl
    });
  },

  async _cleanInvalidLines(cartId, lineIds) {
    try {
      this.setState({ status: 'updating' });
      const updatedCart = await ShopifyAPI.removeCartItem(cartId, lineIds);
      this._applyShopifyCart(updatedCart);
      this.setState({ status: 'ready' });
    } catch (e) {
      console.error('Failed to clean invalid lines, wiping cart state:', e);
      // If the cart is unrecoverably stale, just dump it
      this.clearLocalCart();
      this.setState({ status: 'ready' });
    }
  },

  async addLine(variantId, quantity = 1) {
    if (this.state.status === 'updating' || this.state.status === 'checking_out') return;
    
    this.setState({ status: 'updating' });

    try {
      if (!this.state.id) {
        const cart = await ShopifyAPI.createCart([{ merchandiseId: variantId, quantity }]);
        localStorage.setItem(this.cartIdKey, cart.id);
        this._applyShopifyCart(cart);
      } else {
        const cart = await ShopifyAPI.addToCart(this.state.id, [{ merchandiseId: variantId, quantity }]);
        this._applyShopifyCart(cart);
      }
      this.setState({ status: 'ready' });
    } catch (err) {
      console.error('Add to Cart Error:', err);
      // Strict state enforcement: refetch cart
      await this.refreshCart();
      this.setError(err.message || 'Failed to add item to cart');
    }
  },

  async updateQuantity(lineId, newQuantity) {
    if (this.state.status === 'updating' || this.state.status === 'checking_out') return;
    
    if (newQuantity <= 0) {
      return this.removeLine(lineId);
    }

    this.setState({ status: 'updating' });

    try {
      const cart = await ShopifyAPI.updateCartItem(this.state.id, lineId, newQuantity);
      
      // Verify if Shopify actually applied the full quantity (inventory limits)
      const updatedLine = cart.lines.find(l => l.id === lineId);
      if (updatedLine && updatedLine.quantity < newQuantity) {
         this.setError('Not enough inventory available');
      }

      this._applyShopifyCart(cart);
      this.setState({ status: 'ready' });
    } catch (err) {
      console.error('Update Quantity Error:', err);
      await this.refreshCart();
      this.setError(err.message || 'Failed to update quantity');
    }
  },

  async removeLine(lineId) {
    if (this.state.status === 'updating' || this.state.status === 'checking_out') return;
    
    this.setState({ status: 'updating' });

    try {
      const cart = await ShopifyAPI.removeCartItem(this.state.id, [lineId]);
      this._applyShopifyCart(cart);
      this.setState({ status: 'ready' });
    } catch (err) {
      console.error('Remove Line Error:', err);
      await this.refreshCart();
      this.setError(err.message || 'Failed to remove item');
    }
  },

  async refreshCart() {
    if (!this.state.id) return;
    try {
      const cart = await ShopifyAPI.getCart(this.state.id);
      if (cart) {
        this._applyShopifyCart(cart);
      } else {
        this.clearLocalCart();
      }
    } catch (err) {
      this.clearLocalCart();
    }
  },

  async checkout() {
    if (this.state.status === 'updating' || this.state.status === 'checking_out' || this.state.status === 'initializing') return;
    if (!this.state.checkoutUrl || this.state.lines.length === 0) return;

    this.setState({ status: 'checking_out' });

    try {
      // 1. Re-verify the cart to ensure no stale lines were stuck locally
      const cart = await ShopifyAPI.getCart(this.state.id);
      if (!cart) {
        throw new Error("Cart expired");
      }
      this._applyShopifyCart(cart);
      
      // If applying the cart triggered a cleanup, it means it's not ready for checkout
      if (this.state.status === 'updating') {
         throw new Error("Cart was out of sync. Please try again.");
      }

      // 2. Perform navigation
      window.location.href = this.state.checkoutUrl;
    } catch (err) {
      console.error('Checkout Error:', err);
      this.setError(err.message || 'Checkout failed');
      this.setState({ status: 'ready' });
    }
  },

  resetCheckoutState() {
    if (this.state.status === 'checking_out') {
      this.setState({ status: 'ready' });
    }
  }
};

window.CartService = CartService;
