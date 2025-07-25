// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');  // ensure you installed "puppeteer" via `npm install puppeteer` :contentReference[oaicite:2]{index=2}

(async () => {
  // 1) Launch headless Chrome with no-sandbox flags for GitHub runners
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }); // avoids "Running as root without --no-sandbox" errors :contentReference[oaicite:3]{index=3}

  const page = await browser.newPage();

  // 2) Navigate to the page and wait until network is idle (SPA fully loaded)
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  }); // networkidle0 waits for no network connections for 500 ms :contentReference[oaicite:4]{index=4}

  // 3) Wait for the "1h Long" table header via XPath in waitForSelector
  const headerCell = await page.waitForSelector(
    'xpath//th[contains(normalize-space(.),"1h Long")]',
    { timeout: 30000 }
  ); // use 'xpath/' prefix for Puppeteer v22+ XPath support :contentReference[oaicite:5]{index=5}

  // 4) From that header cell, locate the enclosing <tbody>
  const tbodyHandle = await headerCell.evaluateHandle(th => {
    const tbl = th.closest('table');
    return tbl ? tbl.querySelector('tbody') : null;
  });
  if (!tbodyHandle) {
    throw new Error('Could not find the Total Liquidations <tbody>');
  }

  // 5) Extract each row into a JS object
  const data = await tbodyHandle.$$eval('tr', rows =>
    rows.map(tr => {
      const c = Array.from(tr.querySelectorAll('td'));
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

  // 6) Write the results to data/totalLiquidations.json
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
