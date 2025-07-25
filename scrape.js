// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  let browser, page;
  try {
    console.log('🚀 Launching headless browser…');
    browser = await puppeteer.launch({
      args: ['--no-sandbox','--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    console.log('🌐 Navigating to CoinGlass…');
    await page.goto('https://www.coinglass.com/LiquidationData', {
      waitUntil: 'networkidle0'
    });

    console.log('⏳ Waiting for table rows…');
    await page.waitForSelector('table tbody tr', { timeout: 60000 });

    console.log('🔍 Extracting rows…');
    const data = await page.$$eval('table tbody tr', rows =>
      rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return {
          symbol:    cells[0]?.innerText.trim(),
          long1h:    parseFloat(cells[1]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short1h:   parseFloat(cells[2]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          long4h:    parseFloat(cells[3]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short4h:   parseFloat(cells[4]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          long12h:   parseFloat(cells[5]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short12h:  parseFloat(cells[6]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          long24h:   parseFloat(cells[7]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short24h:  parseFloat(cells[8]?.innerText.replace(/[^0-9.\-]/g, '')) || 0
        };
      })
    );

    console.log(`✅ Found ${data.length} rows.`);
    // Dump the first few rows so you can see exactly what structure you're getting
    console.log('📦 Sample data:', JSON.stringify(data.slice(0,5), null, 2));

    if (data.length === 0) {
      console.warn('⚠️  No rows found – dumping table HTML for inspection:');
      const tableHtml = await page.$eval('table', t => t.outerHTML);
      console.log(tableHtml);
    }

    fs.mkdirSync('data', { recursive: true });
    const output = { timestamp: Date.now(), data };
    fs.writeFileSync('data/totalLiquidations.json', JSON.stringify(output, null, 2));
    console.log('💾 Wrote data/totalLiquidations.json');

  } catch (err) {
    console.error('❌ Scrape failed with error:', err);
    // Optional: dump full page HTML on error for deeper debugging
    if (page) {
      try {
        const fullHtml = await page.content();
        console.log('📣 Full page HTML snapshot:', fullHtml.slice(0, 10000)); // first 10k chars
      } catch {}
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
