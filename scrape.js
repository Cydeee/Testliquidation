// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  // 1) Launch without sandbox for GitHub Actions
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 2) Navigate and wait until network is idle (SPA fully loaded)
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  });

  // 3) Wait for the "Total Liquidations" header by XPath (exact text match)
  const [headerHandle] = await page.$x(
    "//h2[normalize-space(text())='Total Liquidations']"
  );
  if (!headerHandle) {
    throw new Error('Could not find Total Liquidations header');
  }

  // 4) From the header’s parent section, locate the table rows
  const tableHandle = await headerHandle.evaluateHandle(h2 => {
    // Assuming header is inside a section containing the target table
    return h2.closest('section')
             .querySelector('table tbody');
  });
  if (!tableHandle) {
    throw new Error('Could not find Total Liquidations table');
  }

  // 5) Extract each row’s cell values
  const data = await tableHandle.$$eval('tr', rows =>
    rows.map(tr => {
      const cells = tr.querySelectorAll('td');
      return {
        symbol:   cells[0]?.innerText.trim(),
        long1h:   parseFloat(cells[1]?.innerText.replace(/[^0-9.-]/g, '')),
        short1h:  parseFloat(cells[2]?.innerText.replace(/[^0-9.-]/g, '')),
        long4h:   parseFloat(cells[3]?.innerText.replace(/[^0-9.-]/g, '')),
        short4h:  parseFloat(cells[4]?.innerText.replace(/[^0-9.-]/g, '')),
        long12h:  parseFloat(cells[5]?.innerText.replace(/[^0-9.-]/g, '')),
        short12h: parseFloat(cells[6]?.innerText.replace(/[^0-9.-]/g, '')),
        long24h:  parseFloat(cells[7]?.innerText.replace(/[^0-9.-]/g, '')),
        short24h: parseFloat(cells[8]?.innerText.replace(/[^0-9.-]/g, ''))
      };
    })
  );

  // 6) Write to data/totalLiquidations.json
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
