// liquidation.js
// Fetch aggregated force-liquidation data for ETHUSDT over four rolling windows.

const SYMBOL   = 'ETHUSDT';
const BASE_URL = 'https://fapi.binance.com/fapi/v1/allForceOrders';

// Define windows in milliseconds
const WINDOWS = {
  '15m': 15 * 60 * 1000,
  '1h' : 60 * 60 * 1000,
  '4h' : 4  * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

/**
 * Fetch and aggregate liquidations for one window.
 * Returns { count, totalUsd } or throws on error.
 */
async function fetchWindow(label) {
  const now   = Date.now();
  const start = now - WINDOWS[label];
  const url   = `${BASE_URL}?symbol=${SYMBOL}` +
                `&startTime=${start}&endTime=${now}&limit=1000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const orders = await res.json();  // array of force orders
  let totalUsd = 0;
  for (const o of orders) {
    totalUsd += Number(o.origQty) * Number(o.price);
  }
  return {
    count: orders.length,
    totalUsd: Math.round(totalUsd * 100) / 100
  };
}

/**
 * Fetch all windows in parallel.
 * Returns an object mapping labels → {count, totalUsd}.
 */
export async function fetchLiquidationAggregates() {
  const result = {};
  await Promise.all(
    Object.keys(WINDOWS).map(async (label) => {
      try {
        result[label] = await fetchWindow(label);
      } catch (e) {
        console.error(`Error fetching ${label}:`, e);
        result[label] = { count: null, totalUsd: null };
      }
    })
  );
  return result;
}
