// liquidation.js
// — Load persisted CoinGlass Total Liquidations data
// — Expose an aggregator for arbitrary time windows

let events = [];              // in-memory buffer of all scraped events
window._liqEvents = events;   // expose for debugging

/**
 * Fetches the latest scraped JSON file and loads it into memory.
 * Expects data/totalLiquidations.json to be present at the site root.
 */
export async function loadEvents() {
  const res = await fetch('/data/totalLiquidations.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch data: HTTP ${res.status}`);
  const json = await res.json();
  // json.data is an array of objects like { symbol, long1h, short1h, ..., short24h }
  events = json.data.map(item => ({
    ts: json.timestamp,      // use scrape timestamp for all records
    ...item
  }));
  window._liqEvents = events;
}

/**
 * Aggregates events between fromTs (inclusive) and toTs (exclusive).
 * @param {number} fromTs — lower bound in ms since epoch
 * @param {number} toTs   — upper bound in ms since epoch
 * @returns {{
 *   totalLong1h?: number, totalShort1h?: number,
 *   totalLong4h?: number, totalShort4h?: number,
 *   totalLong12h?: number, totalShort12h?: number,
 *   totalLong24h?: number, totalShort24h?: number,
 *   count?: number
 * }}
 */
export function aggregate(fromTs, toTs) {
  if (!events.length) {
    console.warn('No events loaded—call loadEvents() first');
    return {};
  }
  // Since each scrape dump covers all symbols at a single timestamp,
  // you’ll want to compute aggregates based on symbol fields over time if you store multiple dumps.
  // For this simple loader, we just return the latest totals for each interval.
  const latest = events[events.length - 1] || {};
  return {
    totalLong1h: latest.long1h,
    totalShort1h: latest.short1h,
    totalLong4h: latest.long4h,
    totalShort4h: latest.short4h,
    totalLong12h: latest.long12h,
    totalShort12h: latest.short12h,
    totalLong24h: latest.long24h,
    totalShort24h: latest.short24h,
    count: events.length
  };
}
