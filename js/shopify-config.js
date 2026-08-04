/* ============================================================
   AR-RAHMANI — Shopify Storefront API Configuration
   Configures the headless Shopify connection parameters.
   ============================================================ */

const SHOPIFY_CONFIG = {
  // Your Shopify Store domain (e.g. 'ar-rahmani.myshopify.com' or custom domain)
  storeDomain: '7cszxa-9r.myshopify.com',

  // Storefront API Public Access Token provided by user
  storefrontAccessToken: '07a27dc9e5d8582f34c4d7b1c8559502',

  // Shopify API Version
  apiVersion: '2024-04',

  // Helper to construct the GraphQL endpoint URL
  get endpoint() {
    // Standard myshopify domain format
    const domain = this.storeDomain.includes('.') ? this.storeDomain : `${this.storeDomain}.myshopify.com`;
    return `https://${domain}/api/${this.apiVersion}/graphql.json`;
  }
};

if (typeof window !== 'undefined') {
  window.SHOPIFY_CONFIG = SHOPIFY_CONFIG;
}
