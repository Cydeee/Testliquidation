// liquidation.js
console.log('🟢 liquidation.js module loaded (fixed parsing)');

const SYMBOL = 'ETHUSDT';
const WS_URL = `wss://stream.bybit.com/v5/public/linear?subscribe=allLiquidation.${SYMBOL}`;
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

let events = [];
window._liqEvents = events;

export function connectAndBuffer() {
  console.log(`[liquidation.js] Connecting to Bybit WS for ${SYMBOL}…`);
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => console.log('[liquidation.js] WebSocket open');
  ws.onerror = err => console.error('[liquidation.js] WS error:', err);

  ws.onmessage = msg => {
    // Log raw payload to confirm correct parsing
    console.log('[liquidation.js] raw payload:', msg.data);

    let parsed;
    try {
      parsed = JSON.parse(msg.data);
    } catch (e) {
      return console.error('[liquidation.js] JSON parse error', e, msg.data);
    }

    // CORRECT: grab from top-level .data array
    const entry = parsed.data?.[0];
    if (!entry) {
      return console.warn('[liquidation.js] no entry in data', parsed);
    }

    // Fields per docs: T, s, S, v, p
    const ts   = entry.T;
    const side = entry.S;              // 'Buy' or 'Sell'
    const size = Number(entry.v);      // string → number
    const price= Number(entry.p);      // string → number
    const usdSize = size * price;

    events.push({ ts, side, size, price, usdSize });

    // Prune anything older than 24 h
    const cutoff = Date.now() - MAX_WINDOW_MS;
    while (events.length && events[0].ts < cutoff) events.shift();
  };

  return ws;
}

export function aggregateLiquidations(fromTs, toTs) {
  let totalUsd = 0, longUsd = 0, shortUsd = 0, count = 0;
  for (const ev of events) {
    if (ev.ts >= fromTs && ev.ts < toTs) {
      totalUsd += ev.usdSize;
      ev.side === 'Buy'  ? longUsd  += ev.usdSize
                         : shortUsd += ev.usdSize;
      count++;
    }
  }
  return { totalUsd, longUsd, shortUsd, count };
}
