/* ============================================================
   AR-RAHMANI — Shopify Storefront API GraphQL Client
   Handles product querying and Cart API operations.
   ============================================================ */

const ShopifyAPI = {
  /**
   * Send GraphQL query/mutation to Shopify Storefront API
   */
  async request(query, variables = {}) {
    const config = window.SHOPIFY_CONFIG || SHOPIFY_CONFIG;

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken,
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Shopify API HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (json.errors) {
        console.error('Shopify GraphQL Errors:', json.errors);
        throw new Error(json.errors[0].message || 'GraphQL Query Error');
      }

      return json.data;
    } catch (error) {
      console.warn('Shopify API Request Failed:', error.message);
      throw error;
    }
  },

  /**
   * Fetch products list from Shopify Storefront API
   */
  async getProducts(first = 10) {
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 10) {
                edges {
                    id
                    title
                    availableForSale
                    quantityAvailable
                    currentlyNotInStock
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
    const data = await this.request(query, { first });
    return data?.products?.edges?.map(edge => edge.node) || [];
  },

  /**
   * Fetch single product by handle
   */
  async getProductByHandle(handle) {
    const query = `
      query getProductByHandle($handle: String!) {
        productByHandle(handle: $handle) {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
                id
                title
                availableForSale
                quantityAvailable
                currentlyNotInStock
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;
    const data = await this.request(query, { handle });
    return data?.productByHandle;
  },

  /**
   * Create a new Shopify Cart
   */
  async createCart(lineItems = []) {
    const query = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              subtotalAmount {
                amount
                currencyCode
              }
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      currentlyNotInStock
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const input = { lines: lineItems };
    const data = await this.request(query, { input });
    if (data?.cartCreate?.userErrors?.length > 0) {
      throw new Error(data.cartCreate.userErrors[0].message);
    }
    return this._formatCart(data?.cartCreate?.cart);
  },

  /**
   * Fetch details of an existing Cart by ID
   */
  async getCart(cartId) {
    const query = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
          cost {
            subtotalAmount {
              amount
              currencyCode
            }
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                merchandise {
                    ... on ProductVariant {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      currentlyNotInStock
                      price {
                        amount
                        currencyCode
                      }
                    product {
                      title
                      handle
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const data = await this.request(query, { cartId });
    return this._formatCart(data?.cart);
  },

  /**
   * Add lines to Cart
   */
  async addToCart(cartId, lines) {
    const query = `
      mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              subtotalAmount {
                amount
                currencyCode
              }
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      currentlyNotInStock
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const data = await this.request(query, { cartId, lines });
    if (data?.cartLinesAdd?.userErrors?.length > 0) {
      throw new Error(data.cartLinesAdd.userErrors[0].message);
    }
    return this._formatCart(data?.cartLinesAdd?.cart);
  },

  /**
   * Update quantity of a item line in Cart
   */
  async updateCartItem(cartId, lineId, quantity) {
    const query = `
      mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              subtotalAmount {
                amount
                currencyCode
              }
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      currentlyNotInStock
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const lines = [{ id: lineId, quantity }];
    const data = await this.request(query, { cartId, lines });
    if (data?.cartLinesUpdate?.userErrors?.length > 0) {
      throw new Error(data.cartLinesUpdate.userErrors[0].message);
    }
    return this._formatCart(data?.cartLinesUpdate?.cart);
  },

  /**
   * Remove line item from Cart
   */
  async removeCartItem(cartId, lineIds) {
    const query = `
      mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
        cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              subtotalAmount {
                amount
                currencyCode
              }
              totalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      availableForSale
                      quantityAvailable
                      currentlyNotInStock
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        handle
                        images(first: 1) {
                          edges {
                            node {
                              url
                              altText
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const data = await this.request(query, { cartId, lineIds });
    if (data?.cartLinesRemove?.userErrors?.length > 0) {
      throw new Error(data.cartLinesRemove.userErrors[0].message);
    }
    return this._formatCart(data?.cartLinesRemove?.cart);
  },

  /**
   * Format Shopify Cart GraphQL object into clean JS object
   */
  _formatCart(cart) {
    if (!cart) return null;
    return {
      id: cart.id,
      checkoutUrl: cart.checkoutUrl,
      totalQuantity: parseInt(cart.totalQuantity) || 0,
      subtotal: cart.cost?.subtotalAmount?.amount ? parseFloat(cart.cost.subtotalAmount.amount).toFixed(2) : '0.00',
      currency: cart.cost?.subtotalAmount?.currencyCode || 'AED',
      lines: cart.lines?.edges?.map(edge => ({
        id: edge.node.id,
        quantity: parseInt(edge.node.quantity) || 1, // ensure it's an integer, fallback to 1 if missing for some reason
        variantId: edge.node.merchandise.id,
        variantTitle: edge.node.merchandise.title,
        availableForSale: edge.node.merchandise.availableForSale !== false,
        quantityAvailable: edge.node.merchandise.quantityAvailable,
        currentlyNotInStock: edge.node.merchandise.currentlyNotInStock === true,
        price: parseFloat(edge.node.merchandise.price.amount).toFixed(2),
        currency: edge.node.merchandise.price.currencyCode || 'AED',
        productTitle: edge.node.merchandise.product.title,
        image: edge.node.merchandise.product.images?.edges[0]?.node?.url || ''
      })) || []
    };
  }
};

if (typeof window !== 'undefined') {
  window.ShopifyAPI = ShopifyAPI;
}
