// scrape.js
import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
  // 1) Launch headless Chrome
  const browser = await puppeteer.launch();
  const page    = await browser.newPage();

  // 2) Go to the LiquidationData page and wait for the Total Liquidations section
  await page.goto('https://www.coinglass.com/LiquidationData', { waitUntil: 'networkidle0' });
  await page.waitForSelector('h2:contains("Total Liquidations")'); // ensure chart loaded :contentReference[oaicite:2]{index=2}

  // 3) Extract the table rows under "Total Liquidations"
  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('section:has(h2:contains("Total Liquidations")) table tbody tr'));
    return rows.map(tr => {
      const cells = tr.querySelectorAll('td');
      return {
        symbol: cells[0].innerText.trim(),
        long1h: Number(cells[1].innerText.replace(/[^0-9.-]/g, '')),
        short1h: Number(cells[2].innerText.replace(/[^0-9.-]/g, '')),
        long4h: Number(cells[3].innerText.replace(/[^0-9.-]/g, '')),
        short4h: Number(cells[4].innerText.replace(/[^0-9.-]/g, '')),
        long12h: Number(cells[5].innerText.replace(/[^0-9.-]/g, '')),
        short12h: Number(cells[6].innerText.replace(/[^0-9.-]/g, '')),
        long24h: Number(cells[7].innerText.replace(/[^0-9.-]/g, '')),
        short24h: Number(cells[8].innerText.replace(/[^0-9.-]/g, '')),
      };
    });
  });

  // 4) Write to JSON
  fs.writeFileSync('data/totalLiquidations.json', JSON.stringify(data, null, 2));
  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
