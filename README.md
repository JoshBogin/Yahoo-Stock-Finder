# Yahoo Stock Finder

A full-stack app that shows one month of intraday stock activity, summarized per trading day.

- **Backend:** a C# ASP.NET Core API (.NET 10) that calls Yahoo Finance's public chart endpoint, groups the 15-minute data by day and returns daily low/high averages and total volume. It queries a separte endpoint to expose the top stocks by trade volume on a given day.
- **Frontend:** a React + TypeScript app (Vite) with a market indexes section (S&P 500, Nasdaq, Dow), a trending stocks section (today's most actively traded stocks), a symbol search and a detail chart.

| Folder | What it is |
| --- | --- |
| [`backend/`](backend/) | `StockFinderAPI` (the API) and `StockFinderAPI.Tests` (xUnit) |
| [`frontend/`](frontend/) | Vite + React 19 + TypeScript 7 client, with Vitest tests |

Other project documents: [PRD StockFinder.md](PRD%20StockFinder.md) (requirements and plan), [PROMPT_LOG.md](PROMPT_LOG.md) (AI prompts used), [MANUAL_LOG.md](MANUAL_LOG.md) (manual changes).

## Prerequisites

| Tool | Version | Check with |
| --- | --- | --- |
| [.NET SDK](https://dotnet.microsoft.com/download/dotnet/10.0) | 10.0 or later | `dotnet --version` |
| [Node.js](https://nodejs.org/) | 22.12 or later (or 24+) | `node --version` |
| npm | Comes with Node | `npm --version` |

The backend needs internet access to reach `query1.finance.yahoo.com`. No API keys or secrets are needed.

## Quick start: run both apps

The backend and frontend run as two separate processes, so use **two terminals**, both starting at the repository root.

**Terminal 1: backend API**

```bash
cd backend
dotnet run --project StockFinderAPI
```

Wait for `Now listening on: http://localhost:5222`. The first run restores NuGet packages, which can take a minute.

**Terminal 2: frontend**

```bash
cd frontend
npm install
npm run dev
```

You only need `npm install` the first time and after dependency changes.

Then open **http://localhost:5173**. The dashboard shows the S&P 500, Nasdaq Composite and Dow Jones under "Market indexes", then today's most actively traded stocks under "Trending stocks", and the search box looks up any symbol (for example `AAPL`, `BRK-B` or `^GSPC`).

### How the two connect

```
Browser ──> Vite dev server (localhost:5173) ──/api/*──> StockFinderAPI (localhost:5222) ──> Yahoo Finance
```

- The frontend calls relative `/api/...` URLs, and the Vite dev server forwards them to `http://localhost:5222` (see [`frontend/vite.config.ts`](frontend/vite.config.ts)). The browser only ever talks to `localhost:5173`.
- The API also allows CORS from `http://localhost:5173`, for calling it directly from the browser.
- Both ports are fixed in config: the API's in [`backend/StockFinderAPI/Properties/launchSettings.json`](backend/StockFinderAPI/Properties/launchSettings.json), the proxy target in `vite.config.ts`. If you change one, change the other.

### Stopping

Press `Ctrl+C` in each terminal.

## Running the frontend without the backend

The frontend has a mock mode with generated, deterministic data, for UI work without the API or internet access:

```bash
cd frontend
cp .env.example .env.development.local
# edit .env.development.local and set VITE_USE_MOCKS=true
npm run dev
```

In mock mode, the symbol `ZZZZ` simulates an unknown symbol (404) and `FAIL` simulates an upstream outage (502). Set it back to `false`, or delete the file, to use the real API.

## API reference

| Method and path | Returns |
| --- | --- |
| `GET /api/stocks/{symbol}/daily-summary` | One entry per trading day for the last month (see below) |
| `GET /api/stocks/popular` | Today's 8 most actively traded stocks by volume, e.g. `["NVDA","TSLA","F"]` (see below) |
| `GET /openapi/v1.json` | OpenAPI document (Development environment only) |

Example: `curl http://localhost:5222/api/stocks/TSLA/daily-summary`

```json
[
  { 
    "day": "2026-09-28", 
    "lowAverage": 241.3718, 
    "highAverage": 244.9062, 
    "volume": 51873204 
  }
]
```

- `day` is the trading date (`yyyy-MM-dd`) in the exchange's time zone.
- `lowAverage` and `highAverage` are the means of that day's 15-minute lows and highs, rounded to 4 decimal places.
- `volume` is the day's total volume.
- Days are sorted oldest first.

`/api/stocks/popular` returns the first `PopularStocks:Count` symbols from Yahoo's predefined `most_actives` screener, which lists stocks by today's volume, highest first. The list is cached for 5 minutes. If Yahoo fails, throttles or returns nothing, the endpoint still returns 200 with `PopularStocks:FallbackSymbols`, cached for 1 minute so the live list comes back soon after Yahoo recovers.

Errors use RFC 7807 problem details (`application/problem+json`):

| Status | When |
| --- | --- |
| 400 | The symbol is empty, longer than 15 characters, or has characters other than letters, digits and `. - ^ =` |
| 404 | Yahoo Finance has no data for the symbol |
| 429 | Yahoo Finance is throttling requests |
| 502 / 504 | Yahoo Finance failed or timed out |

[`backend/StockFinderAPI/StockFinderAPI.http`](backend/StockFinderAPI/StockFinderAPI.http) has ready-made requests for VS Code (REST Client) and JetBrains IDEs.

## Configuration

Backend settings are in [`backend/StockFinderAPI/appsettings.json`](backend/StockFinderAPI/appsettings.json):

| Setting | Default | Purpose |
| --- | --- | --- |
| `PopularStocks:Count` | `8` | How many of the most active stocks the "Trending stocks" section shows. Must be 1 to 25: each one adds a card that makes its own request to Yahoo, so more risks throttling. |
| `PopularStocks:FallbackSymbols` | `["NVDA","TSLA","AAPL","AMZN","MSFT","META","GOOGL","AMD"]` | Served when Yahoo's most-active screener is unavailable. Must have at least one; the API won't start otherwise. |
| `YahooFinance:Range` / `Interval` | `1mo` / `15m` | How much intraday data to fetch, and at what granularity |
| `YahooFinance:BaseAddress` / `UserAgent` | Yahoo's chart host, a browser User-Agent | Upstream connection (Yahoo rejects requests without a browser-style User-Agent) |

Any setting can be overridden with an environment variable, using `__` for nesting, e.g. `YahooFinance__Interval=30m`.

The frontend's only setting is `VITE_USE_MOCKS` (see above). The three market indexes are fixed in [`frontend/src/api/marketIndexes.ts`](frontend/src/api/marketIndexes.ts), with their display names. They use the existing daily-summary endpoint, and their values are shown in points rather than dollars.

## Tests and checks

```bash
# Backend: xUnit, from the repository root
dotnet test backend/StockFinderAPI.slnx

# Frontend: Vitest + React Testing Library, with MSW standing in for the API
cd frontend
npm test
```

Neither suite calls Yahoo Finance or needs the other app running.

**Backend** (`backend/StockFinderAPI.Tests/`, folders mirror the API project):

| Tests | What they cover |
| --- | --- |
| `Core/DailySummaryCalculatorTests` | Grouping by exchange-local trading day (time zones, DST), averaging, 4-decimal rounding, null candles, empty data, large volumes |
| `Api/StockEndpointsTests` | The real HTTP pipeline in memory (`WebApplicationFactory`) with a fake data provider: the exact JSON shape and precision, symbol normalization and validation (400), unknown symbols (404), upstream failures mapped to 429 / 502 / 504 problem details, no internal details leaked on 500, the most-active list (count, caching, fallback when Yahoo fails) and its startup validation, OpenAPI only in Development |
| `Infrastructure/YahooFinanceClientTests` | The Yahoo client against a stubbed HTTP handler: request URLs and escaping, reading the most-active screener, User-Agent and base address from config, response parsing (nulls for halts, short arrays, no data), 404 as "unknown symbol", other failures and malformed JSON surfaced as errors |

For a coverage report, run `dotnet test backend/StockFinderAPI.slnx --collect:"XPlat Code Coverage"` (Cobertura XML under `TestResults/`). [`coverage.runsettings`](backend/StockFinderAPI.Tests/coverage.runsettings) leaves source-generated code (OpenAPI, regex) out of the report.

**Frontend** (`frontend/tests/`, folders mirror `src/`; shared helpers in `tests/support/`):

| Tests | What they cover |
| --- | --- |
| `api/` | Response parsing and precision, mock mode, URL encoding, HTTP status and problem-details mapping, network and abort errors, symbol validation, retry policy and query defaults, the dev mock data |
| `utils/` | Day average, period change, price/points/volume/percent rounding (indexes in points, stocks in dollars), time-zone-safe dates |
| `components/` | Search validation; market indexes shown by name with their symbols, in points, opening the right symbol; dashboard, card and detail loading, empty and error states and Retry; card hover updating the amount and date; chart tooltip, both hover cursors landing on the same bar, y-axes widening for long labels, chart inset math; change badge and error banner states |
| `App.test.tsx` | Search to detail, `?symbol=` on load, closing, browser back/forward |

Frontend scripts (run in `frontend/`):

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload on port 5173 |
| `npm run build` | Type-check with `tsc`, then build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm run lint` | Lint with oxlint (typescript-eslint doesn't support TypeScript 7 yet) |
| `npm test` / `npm run test:watch` | Run the tests once / in watch mode |
| `npm run test:coverage` | Run the tests with a coverage report |

## Project structure

```
backend/
  StockFinderAPI/
    Api/              Endpoints, symbol validation, popular-list caching and fallback, error mapping to problem details
    Core/             Domain models and the daily-summary calculator (no I/O)
    Infrastructure/   Yahoo Finance HTTP client (chart and most-active screener), with timeout, retry and circuit breaker
    Program.cs        Dependency injection, CORS, problem details, OpenAPI
  StockFinderAPI.Tests/  xUnit tests: Core, Api (in-memory HTTP) and Infrastructure (Yahoo client)
frontend/
  src/api/         Typed API client, error types, symbol validation, market index names, retry policy, dev mocks
  src/hooks/       TanStack Query hooks and the ?symbol= URL state
  src/components/  MarketIndexes, TrendingStocks, StockCard, SearchBox, StockDetail, StockChart (Recharts)
  tests/           Vitest tests, mirroring src/; tests/support/ has the setup, MSW server, fixtures and helpers
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Dashboard cards show "Could not reach the StockFinder service." | The API isn't running, or isn't on port 5222. Start it (terminal 1) and click Retry. |
| `address already in use` on 5222 or 5173 | Stop the other process using the port, or change both the API port and the Vite proxy target together. |
| "The data provider is busy" (429) | Yahoo Finance is throttling. Wait a minute and retry, or use mock mode. |
| `npm install` or `npm test` fails on engine or syntax errors | Upgrade Node to 22.12 or later. |
| `dotnet run` says the SDK isn't found or the target framework is unsupported | Install the .NET 10 SDK. |
