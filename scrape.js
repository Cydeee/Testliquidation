// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');  // ensure you installed "puppeteer", not "puppeteer-core"

(async () => {
  // 1) Launch headless Chrome without sandbox (required on GitHub Actions)
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 2) Navigate and wait for the SPA to finish loading
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  });  
  // networkidle0 waits until no network connections for 500ms—good for React/SPAs 

  // 3) Wait for the <h2>Total Liquidations</h2> heading via XPath
  const headerHandle = await page.waitForXPath(
    "//h2[normalize-space(text())='Total Liquidations']",
    { timeout: 30000 }
  );  
  if (!headerHandle) {
    throw new Error('Could not find "Total Liquidations" header'); 
  }

  // 4) From that header, find the nearest <tbody> for the table
  const tableBodyHandle = await headerHandle.evaluateHandle(h2 =>
    h2.closest('section').querySelector('table tbody')
  );
  if (!tableBodyHandle) {
    throw new Error('Could not find the Total Liquidations table body');
  }

  // 5) Extract each <tr> into a JS object
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

  // 6) Persist to disk
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
