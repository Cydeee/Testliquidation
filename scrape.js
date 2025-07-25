// scrape.js
import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
  let data = [];
  const browser = await puppeteer.launch();
  const page    = await browser.newPage();

  // Navigate and wait for full SPA render
  await page.goto(
    'https://www.coinglass.com/LiquidationData',
    { waitUntil: 'networkidle0' }
  ); // no background activity :contentReference[oaicite:2]{index=2}

  // Wait until the Total Liquidations table is present
  await page.waitForSelector(
    'section:has(h2:contains("Total Liquidations")) table tbody tr',
    { timeout: 30000 }
  ); // throws if not found in 30 s :contentReference[oaicite:3]{index=3}

  // Extract all rows
  data = await page.$$eval(
    'section:has(h2:contains("Total Liquidations")) table tbody tr',
    rows => rows.map(tr => {
      const cells = tr.querySelectorAll('td');
      return {
        symbol: cells[0]?.innerText.trim(),
        long1h: parseFloat(cells[1]?.innerText.replace(/[^0-9.-]/g, '')),
        short1h: parseFloat(cells[2]?.innerText.replace(/[^0-9.-]/g, '')),
        long4h: parseFloat(cells[3]?.innerText.replace(/[^0-9.-]/g, '')),
        short4h: parseFloat(cells[4]?.innerText.replace(/[^0-9.-]/g, '')),
        long12h: parseFloat(cells[5]?.innerText.replace(/[^0-9.-]/g, '')),
        short12h: parseFloat(cells[6]?.innerText.replace(/[^0-9.-]/g, '')),
        long24h: parseFloat(cells[7]?.innerText.replace(/[^0-9.-]/g, '')),
        short24h: parseFloat(cells[8]?.innerText.replace(/[^0-9.-]/g, '')),
      };
    })
  );

  // Write JSON
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
