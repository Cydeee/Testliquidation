// … previous Blocks A–H …

/* BLOCK I: Binance forced-liquidation snapshots via REST (public) */
try {
  const now = Date.now();
  const windows = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000
  };
  result.dataI = {};
  for (const [lbl, ms] of Object.entries(windows)) {
    const start = now - ms;
    // Use same allForceOrders endpoint; no API key needed
    const orders = await safeJson(
      `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${SYMBOL}` +
      `&startTime=${start}&endTime=${now}&limit=1000`
    );
    const totalUsd = orders.reduce(
      (sum,o) => sum + Number(o.origQty)*Number(o.price), 0
    );
    result.dataI[lbl] = {
      totalUsd: +totalUsd.toFixed(2),
      count: orders.length
    };
  }
} catch (e) {
  result.errors.push(`I: ${e.message}`);
  result.dataI = null;
}

// return result as before…
