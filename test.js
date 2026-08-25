const endpoint = 'https://7cszxa-9r.myshopify.com/api/2024-04/graphql.json';
const token = '07a27dc9e5d8582f34c4d7b1c8559502';
async function test() {
  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          totalQuantity
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
    }
  `;
  const input = { lines: [{ merchandiseId: "gid://shopify/ProductVariant/48313428279514", quantity: 1 }] };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables: { input } })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
