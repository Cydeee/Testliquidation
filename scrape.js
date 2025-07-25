// scrape.js
// — headless scrape of CoinGlass “Total Liquidations” via Puppeteer

const fs        = require('fs');
const puppeteer = require('puppeteer');  // make sure you did `npm install puppeteer`

(async () => {
  // 1) Launch headless Chrome with no-sandbox flags for GitHub Actions
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 2) Go to the page and wait for all network activity to finish
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  });

  // 3) Wait specifically for the TOTAL LIQUIDATIONS table rows to appear
  //    This will catch the first table on the page that has data, even if
  //    it’s rendered after a delay or via JS.
  await page.waitForSelector('table tbody tr', { timeout: 60000 });

  // 4) Extract the rows of that first table
  const data = await page.$$eval('table tbody tr', rows =>
    rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      return {
        symbol:   cells[0]?.innerText.trim(),
        long1h:   parseFloat(cells[1]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        short1h:  parseFloat(cells[2]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        long4h:   parseFloat(cells[3]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        short4h:  parseFloat(cells[4]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        long12h:  parseFloat(cells[5]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        short12h: parseFloat(cells[6]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        long24h:  parseFloat(cells[7]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
        short24h: parseFloat(cells[8]?.innerText.replace(/[^0-9.\-]/g, '')) || 0
      };
    })
  );

  // 5) Persist to data/totalLiquidations.json
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
