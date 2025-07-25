// liquidation.js
// Fetch live liquidation events from Bybit and aggregate them over various periods.

// Log as soon as the module is parsed
console.log('🟢 liquidation.js module loaded');

// Configuration
const SYMBOL = 'BTCUSDT';
const WS_URL = `wss://stream.bybit.com/v5/public/linear?subscribe=allLiquidation.${SYMBOL}`;
// Keep up to 24 h of events in memory
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

// In‑memory buffer of events:
// { ts: number, side: 'Buy'|'Sell', size: number, price: number, usdSize: number }
let events = [];

// Expose buffer for debugging in console
window._liqEvents = events;

// Seed a dummy event immediately so your UI shows values at launch
(() => {
  const now = Date.now();
  const dummy = {
    ts: now,
    side: 'Sell',
    size: 0.05,
    price: 35000,
    usdSize: 0.05 * 35000
  };
  events.push(dummy);
  console.log('[liquidation.js] Seeded dummy event', dummy);
})();

/**
 * Connects to Bybit WS and buffers every liquidation event.
 * Logs connection and errors.
 */
export function connectAndBuffer() {
  console.log('[liquidation.js] Connecting to Bybit WS…');
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[liquidation.js] WebSocket open');
  };

  ws.onerror = (err) => {
    console.error('[liquidation.js] WS error:', err);
  };

  ws.onmessage = (msg) => {
    console.log('[liquidation.js] raw payload:', msg.data);
    try {
      const raw = JSON.parse(msg.data);
      const data = raw?.result?.data?.[0];
      if (!data) {
        console.warn('[liquidation.js] no data field in payload', raw);
        return;
      }
      const { ts, S: side, v: size, p: price } = data;
      const usdSize = size * price;
      events.push({ ts, side, size, price, usdSize });

      // Prune old events beyond our max window
      const cutoff = Date.now() - MAX_WINDOW_MS;
      while (events.length && events[0].ts < cutoff) {
        events.shift();
      }
    } catch (e) {
      console.error('[liquidation.js] Failed to parse message', e, msg.data);
    }
  };

  return ws;
}

/**
 * Aggregates buffered events between fromTs (inclusive) and toTs (exclusive).
 * @param {number} fromTs — timestamp in ms
 * @param {number} toTs — timestamp in ms
 * @returns {{ totalUsd: number, longUsd: number, shortUsd: number, count: number }}
 */
export function aggregateLiquidations(fromTs, toTs) {
  let totalUsd = 0, longUsd = 0, shortUsd = 0, count = 0;
  for (const ev of events) {
    if (ev.ts >= fromTs && ev.ts < toTs) {
      totalUsd += ev.usdSize;
      if (ev.side === 'Buy') longUsd += ev.usdSize;
      else if (ev.side === 'Sell') shortUsd += ev.usdSize;
      count++;
    }
  }
  return { totalUsd, longUsd, shortUsd, count };
}
