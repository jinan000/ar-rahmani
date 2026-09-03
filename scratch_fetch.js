const SHOPIFY_CONFIG = {
  storeDomain: '7cszxa-9r.myshopify.com',
  storefrontAccessToken: '07a27dc9e5d8582f34c4d7b1c8559502',
  apiVersion: '2024-04',
  get endpoint() {
    return `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`;
  }
};

async function fetchShopifyProducts() {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        }
      }
    }
  `;
  try {
    const response = await fetch(SHOPIFY_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_CONFIG.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables: { first: 50 } }),
    });
    const json = await response.json();
    console.log(JSON.stringify(json, null, 2));
  } catch(e) {
    console.error(e);
  }
}

fetchShopifyProducts();
