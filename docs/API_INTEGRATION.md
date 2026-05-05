# API Integration Guide

## Overview

This document explains how the trader-dashboard integrates with real market data from Finnhub.io.

## Architecture

```
src/api/
├── client.ts       # HTTP client with rate limiting & auth
├── adapters.ts     # Finnhub-specific data transformations
└── (part of) api.ts  # Feature flag & graceful fallback

src/components/
└── ApiStatusIndicator.tsx  # LIVE/MOCK badge in header
```

### Design Pattern: Feature Flag + Fallback

The integration uses a **feature flag** (`USE_REAL_API`) that automatically switches between real and mock data:

- **Has API key →** calls Finnhub endpoints via adapters
- **No API key or invalid key →** falls back to built-in mock data
- **API request fails →** gracefully degrades to mock data with a console warning

This ensures the dashboard **never breaks** regardless of API availability.

## Feature Flag

```typescript
// src/api.ts
export const USE_REAL_API =
  import.meta.env.VITE_FINNHUB_API_KEY !== undefined &&
  import.meta.env.VITE_FINNHUB_API_KEY !== "" &&
  import.meta.env.VITE_FINNHUB_API_KEY !== "your_api_key_here";
```

Set `VITE_FINNHUB_API_KEY` in `.env.local` to enable real data. Remove or clear it to use mock data.

## Adapter Layer

The adapter layer (`src/api/adapters.ts`) transforms Finnhub API responses into the application's internal types (`Stock`, `Holding`, `HistoryData`).

### Endpoints Used

| Finnhub Endpoint | Adapter Function | Purpose |
|---|---|---|
| `/quote` | `fetchRealMostActive` | Real-time stock prices (S&P 500 top tickers) |
| `/quote` | `fetchRealPortfolio` | Portfolio valuation with live prices |
| `/stock/candle` | `fetchRealHistory` | Historical price data (SPY proxy) |

### Portfolio Configuration

Edit `DEFAULT_PORTFOLIO` in `src/api/adapters.ts` to match your holdings:

```typescript
export const DEFAULT_PORTFOLIO: PortfolioHoldingConfig[] = [
  { ticker: "AAPL", qty: 50, avgCost: 150.0 },
  { ticker: "NVDA", qty: 10, avgCost: 450.0 },
  { ticker: "TSLA", qty: 20, avgCost: 200.0 },
];
```

## Rate Limiting

Finnhub free tier allows **60 requests per minute**. The `apiGetThrottled` function enforces this with a sliding window counter. If you hit the limit, affected endpoints automatically fall back to mock data.

## Switching Data Source

To switch to a different provider:

1. Create a new adapter file (e.g., `src/api/adapters-alpha-vantage.ts`)
2. Implement the same function signatures
3. Update the imports in `src/api.ts`

## Status Indicator

The header includes an **ApiStatusIndicator** showing:
- 🟢 **LIVE** (green, pulsing) — connected to Finnhub API
- ⚫ **MOCK** (grey, static) — using simulated data

The footer also dynamically shows the data source name.
