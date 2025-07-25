// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

;(async () => {
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

    console.log('⏳ Waiting for table to render…');
    await page.waitForSelector('table thead tr th', { timeout: 60000 });
    await page.waitForSelector('table tbody tr:not(.ant-table-measure-row)', { timeout: 60000 });

    // 1) Dump the header texts for verification
    const headers = await page.$$eval(
      'table thead tr th',
      ths => ths.map(th => th.innerText.trim())
    );
    console.log('📋 Table headers:', headers);

    // 2) Dump the raw HTML of the first real <tr>
    const firstRowHtml = await page.$eval(
      'table tbody tr:not(.ant-table-measure-row)',
      tr => tr.outerHTML
    );
    console.log('🌱 First data‑row HTML:', firstRowHtml);

    // 3) Now scrape only the real rows and map correct columns
    console.log('🔍 Extracting all rows into JSON…');
    const data = await page.$$eval(
      'table tbody tr:not(.ant-table-measure-row)',
      rows => rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return {
          symbol:    cells[1]?.innerText.trim() || '',
          long1h:    parseFloat(cells[4]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short1h:   parseFloat(cells[5]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          long4h:    parseFloat(cells[6]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short4h:   parseFloat(cells[7]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          long24h:   parseFloat(cells[8]?.innerText.replace(/[^0-9.\-]/g, '')) || 0,
          short24h:  parseFloat(cells[9]?.innerText.replace(/[^0-9.\-]/g, '')) || 0
        };
      })
    );

    console.log(`✅ Parsed ${data.length} rows.`);
    console.log('📦 Sample data:', JSON.stringify(data.slice(0,3), null, 2));

    // 4) Write out the JSON
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync(
      'data/totalLiquidations.json',
      JSON.stringify({ timestamp: Date.now(), data }, null, 2)
    );
    console.log('💾 Wrote data/totalLiquidations.json');

  } catch (err) {
    console.error('❌ Scrape failed:', err);
    if (page) {
      const html = await page.content();
      console.log('📣 Full page snapshot (first 10 000 chars):\n', html.slice(0,10000));
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
