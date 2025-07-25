// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  // 1) Launch headless Chromium without sandbox
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 2) Go to the page and wait for all network activity to idle
  await page.goto('https://www.coinglass.com/LiquidationData', {
    waitUntil: 'networkidle0'
  });

  // 3) Wait for the <h2>Total Liquidations</h2>  
  const header = await page.waitForSelector('h2', { timeout: 30000 });
  if (!header) throw new Error('Could not find any <h2> on the page');

  // 4) From that header, find the very next <table> in the DOM tree
  const tbodyHandle = await header.evaluateHandle(h2 => {
    let el = h2.nextElementSibling;
    while (el && el.tagName !== 'TABLE') {
      el = el.nextElementSibling;
    }
    return el ? el.querySelector('tbody') : null;
  });
  if (!tbodyHandle) {
    throw new Error('Could not find the Total Liquidations table after the <h2>');
  }

  // 5) Extract each row into a JS object
  const data = await tbodyHandle.$$eval('tr', rows =>
    rows.map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      return {
        symbol:   cells[0]?.innerText.trim(),
        long1h:   parseFloat(cells[1]?.innerText.replace(/[^0-9.\-]/g, '')),
        short1h:  parseFloat(cells[2]?.innerText.replace(/[^0-9.\-]/g, '')),
        long4h:   parseFloat(cells[3]?.innerText.replace(/[^0-9.\-]/g, '')),
        short4h:  parseFloat(cells[4]?.innerText.replace(/[^0-9.\-]/g, '')),
        long12h:  parseFloat(cells[5]?.innerText.replace(/[^0-9.\-]/g, '')),
        short12h: parseFloat(cells[6]?.innerText.replace(/[^0-9.\-]/g, '')),
        long24h:  parseFloat(cells[7]?.innerText.replace(/[^0-9.\-]/g, '')),
        short24h: parseFloat(cells[8]?.innerText.replace(/[^0-9.\-]/g, ''))
      };
    })
  );

  // 6) Write out the JSON
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(
    'data/totalLiquidations.json',
    JSON.stringify({ timestamp: Date.now(), data }, null, 2)
  );

  await browser.close();
  console.log('✅ Scraped', data.length, 'rows');
})();
