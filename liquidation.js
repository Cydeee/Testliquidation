// liquidation.js
// — Connect to Binance’s combined forceOrder stream (!forceOrder@arr)
// — Filter for ETHUSDT events
// — Buffer them and expose an aggregator

// 1) Log on load so you know the updated file is being fetched
console.log('🟢 liquidation.js v2 loaded (combined !forceOrder@arr)');

// 2) In‑memory buffer of events (rolling 24 h)
const events = [];
window._liqEvents = events;

// 3) WebSocket setup
const SYMBOL = 'ETHUSDT';
const WS_URL = 'wss://fstream.binance.com/stream?streams=!forceOrder@arr';

export function connectAndBuffer() {
  console.log('🟢 Connecting to', WS_URL);
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => console.log('🟢 WS open');
  ws.onerror = e => console.error('❌ WS error', e);

  ws.onmessage = ({ data }) => {
    // Every second you'll get: { stream, data: [ { /* up to N events */ }, … ] }
    let msg;
    try {
      msg = JSON.parse(data);
    } catch (e) {
      return console.error('Malformed JSON', e, data);
    }
    if (!Array.isArray(msg.data)) return;

    // 4) Extract only ETHUSDT entries
    for (const entry of msg.data) {
      // entry.o.s is the symbol, entry.E is event time
      if (entry.o.s !== SYMBOL) continue;

      const ts    = entry.E;                   // event timestamp
      const side  = entry.o.S;                 // "BUY" or "SELL"
      const size  = Number(entry.o.origQty);   // quantity liquidated
      const price = Number(entry.o.p);         // price
      const usd   = size * price;

      events.push({ ts, side, size, price, usd });
    }

    // 5) Prune anything older than 24 h
    const cutoff = Date.now() - 24*60*60*1000;
    while (events.length && events[0].ts < cutoff) events.shift();
  };

  return ws;
}

/**
 * Aggregates buffered events between fromTs (inclusive) and toTs (exclusive).
 * @returns {{ total: number, buys: number, sells: number, count: number }}
 */
export function aggregate(fromTs, toTs) {
  let total = 0, buys = 0, sells = 0, count = 0;
  for (const e of events) {
    if (e.ts >= fromTs && e.ts < toTs) {
      total += e.usd;
      e.side === 'BUY' ? buys += e.usd : sells += e.usd;
      count++;
    }
  }
  return { total, buys, sells, count };
}
