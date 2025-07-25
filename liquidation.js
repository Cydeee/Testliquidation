// netlify/edge-functions/data.js
export const config = { path: ["/data", "/data.json"], cache: "manual" };
export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  const wantJson = new URL(request.url).pathname.endsWith("/data.json");
  try {
    const payload = await buildDashboardData();
    payload.timestamp = Date.now();
    const body = wantJson
      ? JSON.stringify(payload)
      : `<!DOCTYPE html><html><body><pre>${JSON.stringify(payload)}</pre></body></html>`;
    return new Response(body, {
      headers: {
        "Content-Type": wantJson
          ? "application/json; charset=utf-8"
          : "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=60, must-revalidate",
      },
    });
  } catch (err) {
    console.error("Edge Function error", err);
    return new Response("Service temporarily unavailable.", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function buildDashboardData() {
  const SYMBOL = "ETHUSDT";
  const LIMIT = 250;
  const result = {
    dataA: {}, dataB: null, dataC: {}, dataD: {}, dataE: null,
    dataF: null, dataG: null, dataH: null, dataI: {}, errors: []
  };
  const safeJson = async (u) => {
    const r = await fetch(u);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  // … your existing Blocks A–H here …

  /* BLOCK I: Binance forced-liquidation snapshots via REST (Market Data) */
  try {
    const now = Date.now();
    const windows = {
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "4h": 4 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000
    };
    for (const [lbl, ms] of Object.entries(windows)) {
      const start = now - ms;
      // Public market‐data endpoint — no key or signature needed :contentReference[oaicite:6]{index=6}
      const orders = await safeJson(
        `https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${SYMBOL}` +
        `&startTime=${start}&endTime=${now}&limit=1000`
      );
      // Sum USD value = price × origQty
      const totalUsd = orders.reduce(
        (s,o) => s + Number(o.origQty) * Number(o.price),
        0
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

  return result;
}
