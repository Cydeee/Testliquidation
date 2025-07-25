// liquidation.js
// — Load the persisted JSON and expose an aggregator

let events = [];
window._liqEvents = events;                                  // for debugging

/**
 * Loads data/totalLiquidations.json into memory.
 * Uses cache: 'no-store' to always fetch the latest file :contentReference[oaicite:11]{index=11}
 */
export async function loadEvents() {
  const res = await fetch('/data/totalLiquidations.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch error: HTTP ${res.status}`);
  const { timestamp, data } = await res.json();
  // Flatten each symbol's fields into an event-like object
  events = data.map(item => ({ ts: timestamp, ...item }));
  window._liqEvents = events;
}

/**
 * Returns the latest totals for each interval.
 * Since each JSON snapshot covers all intervals, we just read the last object.
 */
export function aggregate() {
  if (events.length === 0) {
    console.warn('No data loaded—call loadEvents() first');
    return {};
  }
  const latest = events[events.length - 1];
  return {
    long1h:  latest.long1h,
    short1h: latest.short1h,
    long4h:  latest.long4h,
    short4h: latest.short4h,
    long12h: latest.long12h,
    short12h:latest.short12h,
    long24h: latest.long24h,
    short24h:latest.short24h
  };
}
