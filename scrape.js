// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  // Launch headless Chrome without sandbox (required on GitHub Actions)
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });  
  const page = await browser.newPage();

  // Navigate to the CoinGlass page and wait for the SPA to finish loading
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  });  

  // Wait for the <h2>Total Liquidations</h2> heading via XPath in waitForSelector
  const headerEl = await page.waitForSelector(
    'xpath//h2[normalize-space(text())="Total Liquidations"]',
    { timeout: 30000 }
  );  
  if (!headerEl) {
    throw new Error('Could not find "Total Liquidations" header');
  }

  // From that header element, find the nearest <tbody> of the table
  const tableBodyHandle = await page.evaluateHandle(header => {
    const section = header.closest('section');
    return section?.querySelector('table tbody');
  }, headerEl);
  if (!tableBodyHandle) {
    throw new Error('Could not find the Total Liquidations table body');
  }

  // Extract each <tr> into a JS object
  const data = await tableBodyHandle.$$eval('tr', rows =>
    rows.map(tr => {
      const c = tr.querySelectorAll('td');
      return {
        symbol:    c[0]?.innerText.trim(),
        long1h:    parseFloat(c[1]?.innerText.replace(/[^0-9.-]/g, '')),
        short1h:   parseFloat(c[2]?.innerText.replace(/[^0-9.-]/g, '')),
        long4h:    parseFloat(c[3]?.innerText.replace(/[^0-9.-]/g, '')),
        short4h:   parseFloat(c[4]?.innerText.replace(/[^0-9.-]/g, '')),
        long12h:   parseFloat(c[5]?.innerText.replace(/[^0-9.-]/g, '')),
        short12h:  parseFloat(c[6]?.innerText.replace(/[^0-9.-]/g, '')),
        long24h:   parseFloat(c[7]?.innerText.replace(/[^0-9.-]/g, '')),
        short24h:  parseFloat(c[8]?.innerText.replace(/[^0-9.-]/g, ''))
      };
    })
  );  

  // Ensure data directory exists and write JSON
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
