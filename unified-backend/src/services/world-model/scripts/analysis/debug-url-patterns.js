/**
 * Debug URL Pattern Matching
 * 
 * Test the URL patterns from the actual URLs seen in the session data
 * to identify why the grouping isn't working
 */

// Test URLs from the actual session data
const testUrls = [
  'https://www2.hm.com/en_us/productpage.1265337002.html',
  'https://www2.hm.com/en_us/productpage.1248183002.html',
  'https://www2.hm.com/en_us/productpage.1261321001.html',
  'https://www.gap.com/browse/product.do?pid=796255112&vid=1&pcid=5225&cid=5225#pdp-page-content',
  'https://www.gap.com/browse/product.do?pid=876543022&vid=1&pcid=6998&cid=6998&nav=meganav%3AMen%3ACategories%3AJeans#pdp-page-content',
  'https://www.nordstrom.com/s/ecco-soft-60-aeon-sneaker-women/8427767?origin=category-personalizedsort&breadcrumb=Home%2FSale%2FWomen%2FShoes&color=100',
  'https://www.nordstrom.com/s/free-people-seeing-double-sweatshirt-shorts-set/8155920?origin=category-personalizedsort&breadcrumb=Home%2FSale%2FWomen%2FClothing&color=103'
];

function testUrlPatterns() {
  console.log('🔍 Testing URL Pattern Matching\n');
  
  testUrls.forEach((url, index) => {
    console.log(`\nURL ${index + 1}: ${url}`);
    
    // Test the patterns from the grouping logic
    const patterns = {
      productpage: url.includes('/productpage'),
      productDo: url.includes('/product.do'),
      browseProduct: url.includes('/browse/product') && url.includes('pid='),
      nordstrom: !!url.match(/\/s\/[^\/]+\/\d+/),
      generic: !!url.match(/\/p\/[^\/]+/),
      amazon: !!url.match(/\/dp\/[A-Z0-9]+/),
      pdpAnchor: url.includes('#pdp-page-content'),
      pidOnly: url.includes('pid=') && !url.includes('/browse/men') && !url.includes('/browse/women')
    };
    
    const isProductPage = Object.values(patterns).some(match => match);
    
    console.log(`  Patterns:`);
    Object.entries(patterns).forEach(([name, match]) => {
      console.log(`    ${name}: ${match}`);
    });
    console.log(`  IsProductPage: ${isProductPage}`);
    
    // Test group key generation
    if (isProductPage) {
      let groupKey = '';
      
      if (url.includes('/productpage')) {
        const match = url.match(/\/productpage\.(\d+)\./);
        groupKey = match ? `hm-product-${match[1]}` : url.split('?')[0].split('#')[0];
        console.log(`  🏷️ H&M groupKey: ${groupKey} (match: ${match?.[1]})`);
      } else if (url.includes('pid=')) {
        const pidMatch = url.match(/pid=([^&]+)/);
        groupKey = pidMatch ? `gap-product-${pidMatch[1]}` : url.split('?')[0].split('#')[0];
        console.log(`  🏷️ Gap groupKey: ${groupKey} (pid: ${pidMatch?.[1]})`);
      } else if (url.match(/\/s\/[^\/]+\/(\d+)/)) {
        const match = url.match(/\/s\/[^\/]+\/(\d+)/);
        groupKey = match ? `nordstrom-product-${match[1]}` : url.split('?')[0].split('#')[0];
        console.log(`  🏷️ Nordstrom groupKey: ${groupKey} (id: ${match?.[1]})`);
      } else {
        groupKey = url.split('?')[0].split('#')[0];
        console.log(`  🏷️ Fallback groupKey: ${groupKey}`);
      }
    }
  });
}

// Run the test
testUrlPatterns();