// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  // 1) Launch headless Chromium without sandbox on GitHub Actions
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 2) Go to the page and wait until network is idle (SPA fully rendered)
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  });

  // 3) Ensure at least one <section> exists before scraping
  await page.waitForSelector('section', { timeout: 30000 });

  // 4) Extract data entirely inside the page context
  const data = await page.evaluate(() => {
    // Find the section whose H2 is exactly "Total Liquidations"
    const sections = Array.from(document.querySelectorAll('section'));
    const target = sections.find(sec => {
      const h2 = sec.querySelector('h2');
      return h2 && h2.textContent.trim() === 'Total Liquidations';
    });
    if (!target) return [];  // nothing found

    // Find all rows in that section's table body
    const rows = Array.from(
      target.querySelectorAll('table tbody tr')
    );
    return rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      return {
        symbol:    cells[0]?.innerText.trim(),
        long1h:    parseFloat(cells[1]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        short1h:   parseFloat(cells[2]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        long4h:    parseFloat(cells[3]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        short4h:   parseFloat(cells[4]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        long12h:   parseFloat(cells[5]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        short12h:  parseFloat(cells[6]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        long24h:   parseFloat(cells[7]?.innerText.replace(/[^0-9.-]/g, '')) || 0,
        short24h:  parseFloat(cells[8]?.innerText.replace(/[^0-9.-]/g, '')) || 0
      };
    });
  });

  // 5) Persist to data/totalLiquidations.json
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
