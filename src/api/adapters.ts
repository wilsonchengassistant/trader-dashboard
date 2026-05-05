// src/api/adapters.ts — Finnhub API adapters for real trading data
import type { Stock, Holding, HistoryData } from "../api";
import { apiGetThrottled } from "./client";

// --- Finnhub API response types ---
interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
}

interface FinnhubCandle {
  c: number[];  // Close prices
  t: number[];  // Timestamps
  s: string;    // Status "ok" or "no_data"
}

// --- Most Active Stocks via S&P 500 list + quotes ---
const SP500_TICKERS = [
  "AAPL", "TSLA", "NVDA", "AMD", "MSFT", "META", "GOOGL", "AMZN", "NFLX", "PLTR",
];

/**
 * Fetch real-time prices for the most active stock list.
 * Falls back gracefully if individual tickers fail — returns what succeeded.
 */
export async function fetchRealMostActive(): Promise<Stock[]> {
  const results = await Promise.allSettled(
    SP500_TICKERS.map((ticker) =>
      apiGetThrottled<FinnhubQuote>("/quote", { symbol: ticker })
    )
  );

  const stocks: Stock[] = [];
  for (let i = 0; i < SP500_TICKERS.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      const q = result.value;
      stocks.push({
        ticker: SP500_TICKERS[i],
        name: SP500_TICKERS[i],
        price: q.c,
        change: q.dp,
        volume: "N/A",
        turnover: "N/A",
      });
    }
  }
  return stocks;
}

/**
 * Portfolio holdings config — defines which stocks the user holds and their cost basis.
 * Edit this array to match your actual portfolio.
 */
export interface PortfolioHoldingConfig {
  ticker: string;
  qty: number;
  avgCost: number;
}

export const DEFAULT_PORTFOLIO: PortfolioHoldingConfig[] = [
  { ticker: "AAPL", qty: 50, avgCost: 150.0 },
  { ticker: "NVDA", qty: 10, avgCost: 450.0 },
  { ticker: "TSLA", qty: 20, avgCost: 200.0 },
];

/**
 * Fetch real-time portfolio data using live prices from Finnhub.
 */
export async function fetchRealPortfolio(holdings: PortfolioHoldingConfig[] = DEFAULT_PORTFOLIO) {
  const results = await Promise.allSettled(
    holdings.map((h) =>
      apiGetThrottled<FinnhubQuote>("/quote", { symbol: h.ticker })
    )
  );

  const resultHoldings: Holding[] = [];
  let totalValue = 0;
  let totalCost = 0;

  for (let i = 0; i < holdings.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      const q = result.value;
      const h = holdings[i];
      const marketValue = h.qty * q.c;
      const cost = h.qty * h.avgCost;
      totalValue += marketValue;
      totalCost += cost;
      resultHoldings.push({
        ticker: h.ticker,
        qty: h.qty,
        avgCost: h.avgCost,
        currentPrice: q.c,
        marketValue,
        pnl: marketValue - cost,
        pnlPercent: cost > 0 ? ((q.c - h.avgCost) / h.avgCost) * 100 : 0,
      });
    }
  }

  return {
    totalValue,
    totalPnl: totalValue - totalCost,
    totalPnlPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    cashBalance: 0,
    holdings: resultHoldings,
  };
}

/**
 * Fetch historical price data using Finnhub candle endpoint.
 * Uses SPY as a market proxy to generate portfolio-like history.
 */
export async function fetchRealHistory(range: string): Promise<HistoryData[]> {
  const resolution =
    range === "1d" ? "5" : range === "1w" ? "60" : "D";
  const now = Math.floor(Date.now() / 1000);
  const from =
    range === "1d"
      ? now - 86400
      : range === "1w"
        ? now - 7 * 86400
        : now - 30 * 86400;

  const data = await apiGetThrottled<FinnhubCandle>("/stock/candle", {
    symbol: "SPY",
    resolution,
    from: String(from),
    to: String(now),
  });

  if (data.s === "no_data" || !data.c || data.c.length === 0) return [];

  const baseValue = 18000;
  const firstClose = data.c[0];
  return data.c.map((price, i) => ({
    timestamp: new Date((data.t[i] || 0) * 1000).toISOString(),
    value: baseValue * (price / firstClose),
    pnl: baseValue * (price / firstClose) - baseValue,
  }));
}
