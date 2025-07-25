// scrape.js
const fs        = require('fs');
const puppeteer = require('puppeteer');

function parseValue(rawText) {
  // e.g. "117.69K", "1.23M", "-0.91%"
  const txt = rawText.trim();
  // Extract numeric part
  const num = parseFloat(txt.replace(/[^0-9.\-]/g, '')) || 0;
  // Detect unit suffix (K, M)
  const unitMatch = txt.match(/([KM])$/i);
  let multiplier = 1;
  if (unitMatch) {
    const u = unitMatch[1].toUpperCase();
    multiplier = u === 'K' ? 1e3 : u === 'M' ? 1e6 : 1;
  }
  return num * multiplier;
}

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
    await Promise.all([
      page.waitForSelector('table thead tr th', { timeout: 60000 }),
      page.waitForSelector('table tbody tr:not(.ant-table-measure-row)', { timeout: 60000 })
    ]);

    // 1) Dump the header texts for verification
    const headers = await page.$$eval(
      'table thead tr th',
      ths => ths.map(th => th.innerText.trim())
    );
    console.log('📋 Table headers:', JSON.stringify(headers));

    // 2) Dump the raw HTML of the first real <tr>
    const firstRowHtml = await page.$eval(
      'table tbody tr:not(.ant-table-measure-row)',
      tr => tr.outerHTML
    );
    console.log('🌱 First data‑row HTML:', firstRowHtml);

    // 3) Scrape only the real rows and map correct columns
    console.log('🔍 Extracting all rows into JSON…');
    const data = await page.$$eval(
      'table tbody tr:not(.ant-table-measure-row)',
      rows => rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        // columns per headers:
        // [0]=Ranking, [1]=Symbol, [2]=Price, [3]=Price%,
        // [4]=1h Long, [5]=1h Short, [6]=4h Long, [7]=4h Short,
        // [8]=24h Long, [9]=24h Short
        const getText = idx => cells[idx]?.innerText || '';
        const parseVal = raw => {
          const num = parseFloat(raw.replace(/[^0-9.\-KMkm]/g, '')) || 0;
          const unit = (raw.trim().slice(-1)).toUpperCase();
          const mult = unit === 'K' ? 1e3 : unit === 'M' ? 1e6 : 1;
          return num * mult;
        };
        return {
          ranking: parseInt(getText(0), 10) || null,
          symbol:  getText(1).trim(),
          price:   parseVal(getText(2).replace(/[%$]/g, '')),
          pricePct24h: parseFloat(getText(3).replace(/[^0-9.\-]/g, '')) || 0,
          long1h:  parseVal(getText(4)),
          short1h: parseVal(getText(5)),
          long4h:  parseVal(getText(6)),
          short4h: parseVal(getText(7)),
          long24h: parseVal(getText(8)),
          short24h: parseVal(getText(9))
        };
      })
    );

    console.log(`✅ Parsed ${data.length} rows. Dumping all rows:`);
    console.log(JSON.stringify(data, null, 2));

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
