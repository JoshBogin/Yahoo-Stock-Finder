# StockFinder Frontend

React 19 + TypeScript 7 single-page app that charts one month of intraday stock activity, summarized per day, from the StockFinder .NET API (`GET /api/stocks/{symbol}/daily-summary`).

## Run

```bash
npm install
npm run dev
```

In dev, Vite proxies `/api` to the backend at `http://localhost:5222` (see `vite.config.ts`).

To work without the backend, copy `.env.example` to `.env.development.local` and set `VITE_USE_MOCKS=true`. Mock data is deterministic per symbol; `ZZZZ` simulates an unknown symbol (404) and `FAIL` an upstream outage (502).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check with `tsc`, then production build |
| `npm run typecheck` | Type-check only |
| `npm run lint` | Lint with oxlint |

Linting uses oxlint rather than ESLint because typescript-eslint does not yet support TypeScript 7 (which has no JavaScript compiler API).

## Structure

- `src/api` – typed API client, error mapping, symbol validation, dev mocks
- `src/hooks` – TanStack Query hooks (daily summary, popular symbols from the API, `?symbol=` URL state)
- `src/components` – Dashboard, StockCard, SearchBox, StockDetail, StockChart (Recharts), DailyTable, shared states
