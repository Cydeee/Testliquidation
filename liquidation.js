// liquidation.js
// Fetch live liquidation events from Bybit and aggregate them over various periods.

// Configuration
const SYMBOL = 'BTCUSDT';
const WS_URL = `wss://stream.bybit.com/v5/public/linear?subscribe=allLiquidation.${SYMBOL}`;
// Keep up to 24h of events in memory
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

// In‑memory buffer of events:
// { ts: number, side: 'Buy'|'Sell', size: number, price: number }
let events = [];

// Expose for debugging
window._liqEvents = events;

/**
 * Connects to Bybit WS and buffers every liquidation event.
 */
export function connectAndBuffer() {
  console.log('[liquidation.js] Connecting to Bybit WS…');
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[liquidation.js] WebSocket open');
  };

  ws.onerror = (err) => {
    console.error('[liquidation.js] WebSocket error', err);
  };

  ws.onmessage = (msg) => {
    try {
      const payload = JSON.parse(msg.data);
      const data = payload?.result?.data?.[0];
      if (data) {
        const { ts, S: side, v: size, p: price } = data;
        const usdSize = size * price; // size in contracts × price → USD
        events.push({ ts, side, size, price, usdSize });

        // Prune old events beyond our max window
        const cutoff = Date.now() - MAX_WINDOW_MS;
        while (events.length && events[0].ts < cutoff) {
          events.shift();
        }
      }
    } catch (e) {
      console.error('[liquidation.js] Failed to parse message', e, msg.data);
    }
  };

  return ws;
}

/**
 * Aggregates buffered events between fromTs and toTs.
 * @param {number} fromTs — timestamp ms inclusive
 * @param {number} toTs — timestamp ms exclusive
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
