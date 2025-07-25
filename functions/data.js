// /functions/data.js
import { HmacSha256 } from "https://cdn.skypack.dev/hmac-sha256";

export async function onRequestGet({ env }) {
  const SYMBOL = "ETHUSDT";
  const windows = {
    "15m": 15 * 60 * 1000,
    "1h":  60 * 60 * 1000,
    "4h":  4  * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };
  const now = Date.now();
  const apiKey = env.BINANCE_API_KEY;
  const apiSecret = env.BINANCE_API_SECRET;

  const result = { timestamp: now, liquidations: {}, errors: [] };

  for (const [label, ms] of Object.entries(windows)) {
    try {
      const start = now - ms;
      const recvWindow = 5000;
      const ts = Date.now();
      const query = new URLSearchParams({
        symbol: SYMBOL,
        startTime: String(start),
        endTime:   String(now),
        recvWindow: String(recvWindow),
        timestamp:  String(ts),
      }).toString();

      const sig = HmacSha256(apiSecret, query).toString();
      const url = `https://fapi.binance.com/fapi/v1/forceOrders?${query}&signature=${sig}`;

      const resp = await fetch(url, { headers: { "X-MBX-APIKEY": apiKey } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const orders = await resp.json();
      let totalUsd = 0;
      for (const o of orders) {
        totalUsd += Number(o.origQty) * Number(o.price);
      }

      result.liquidations[label] = {
        count: orders.length,
        totalUsd: Math.round(totalUsd * 100) / 100,
      };
    } catch (e) {
      result.errors.push(`${label}: ${e.message}`);
      result.liquidations[label] = { count: null, totalUsd: null };
    }
  }

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
