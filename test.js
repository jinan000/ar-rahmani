const endpoint = 'https://7cszxa-9r.myshopify.com/api/2024-04/graphql.json';
const token = '07a27dc9e5d8582f34c4d7b1c8559502';
async function test() {
  const query = `
    query {
      products(first: 10, query: "title:'Paradise Fusion'") {
        edges {
          node {
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  availableForSale
                  quantityAvailable
                  price { amount }
                }
              }
            }
          }
        }
      }
    }`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
