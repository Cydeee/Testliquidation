// liquidation.js
// Fetch live liquidation events for ETHUSDT from Bybit and aggregate them over various periods.

// Log on module parse
console.log('🟢 liquidation.js module loaded');

// Configuration: switch to ETHUSDT for more frequent liquidations
const SYMBOL = 'ETHUSDT';
const WS_URL = `wss://stream.bybit.com/v5/public/linear?subscribe=allLiquidation.${SYMBOL}`;
// Keep up to 24 h of events in memory
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

// In‑memory buffer of events:
// { ts: number, side: 'Buy'|'Sell', size: number, price: number, usdSize: number }
let events = [];

// Expose buffer for debugging in console
window._liqEvents = events;

/**
 * Connects to Bybit WS and buffers every liquidation event.
 */
export function connectAndBuffer() {
  console.log(`[liquidation.js] Connecting to Bybit WS for ${SYMBOL}…`);
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[liquidation.js] WebSocket open');
  };

  ws.onerror = (err) => {
    console.error('[liquidation.js] WS error:', err);
  };

  ws.onmessage = (msg) => {
    // Log raw payload for debugging
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

      // Prune old events
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
