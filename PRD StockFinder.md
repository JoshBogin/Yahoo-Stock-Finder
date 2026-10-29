# PRD: StockFinder

Oct 27, 2026 · @Josh Bogin

## Overview & Goals

We are building a small full-stack app that shows the last month of intraday stock activity, summarized per day: a C# .NET 10 REST API that wraps Yahoo Finance's public chart endpoint, and a React web page that charts the major US market indexes, today's most actively traded stocks, and any symbol the user searches for.

**Goals**

- Meet every requirement in the Take-Home Assessment, with exact JSON shape and precision.
- Show the S&P 500, Nasdaq Composite and Dow Jones, plus today's most actively traded stocks, with their trends on load.
- Let a user submit any symbol and see its chart, or a clear error if the symbol does not exist.
- Ship production-quality code that is easy to extend (SOLID, tested, documented).
- Leave a clear record of AI collaboration (PROMPT\_LOG.md) and of manual changes.

**Success criteria**

- A reviewer can clone the repo, follow the README, and run backend and frontend locally in under 10 minutes.
- `GET` on a valid symbol returns one entry per trading day for the last month, in the required format.
- Invalid symbols and upstream failures produce a handled error state in the UI, never a blank page or crash.
- Backend unit and integration tests and frontend component tests pass (`dotnet test`, `npm test`).

## Status

As of Oct 29, 2026, every assessment requirement is built and tested. The build differs from the original plan in these ways:

- **Popular stocks are live, not curated.** `GET /api/stocks/popular` returns today's 8 most actively traded stocks from Yahoo's `most_actives` screener, with a configured fallback list (B4).
- **Market indexes were added.** The S&P 500, Nasdaq Composite and Dow Jones have their own section, shown by name and quoted in points (F6).
- **The detail table was removed.** The chart tooltip shows each day's figures instead (F3).
- **Not built yet:** per-symbol caching on the backend, the health check, correlation IDs, security headers, Dockerfiles and `docker compose`, and the CI workflow (B5, B6 and the operability items below). The frontend caches each symbol's data for 5 minutes, which covers repeat views in one session.
- **Tooling changes:** oxlint replaces ESLint, because typescript-eslint doesn't support TypeScript 7 yet. The backend tests use xUnit's own assertions rather than FluentAssertions.

## Scope & Assumptions

The MVP covers one read-only data flow, from Yahoo Finance to a chart, and stops there.

**In scope**

- C# .NET 10 Web API with a daily-summary endpoint and a popular (most-active) symbols endpoint.
- React + TypeScript single-page UI: market indexes, trending (most-active) stocks, symbol search, detail chart, error states.
- Unit and integration tests, README, PROMPT\_LOG.md, Dockerfile and a CI workflow.

**Out of scope (designed not to block later)**

- Accounts, watchlists, persistence or a database.
- Real-time streaming or intervals other than 15 minutes.
- Symbol autocomplete, comparison of several symbols on one chart.
- A market heat map of large stocks (see FR1 under Future Requirements).

**Assumptions**

- The upstream call is `/v8/finance/chart/{symbol}?range=1mo&interval=15m` with a browser-style `User-Agent` header, as in the assessment's curl example. It is an unofficial endpoint, so it can change or throttle without notice.
- A "day" is the trading date in the exchange's time zone (from the response's `exchangeTimezoneName`), not UTC.
- `lowAverage` is the mean of the day's 15-minute `low` values, `highAverage` the mean of the `high` values, and `volume` the sum of the day's volumes.
- The API rounds averages to 4 decimal places, matching the assessment's sample, and volume is a whole number. The UI displays 2 decimal places.
- Candles with null price or volume (halts, gaps) are skipped; days left with no valid candles are omitted.
- Results are sorted oldest to newest, as in the sample.
- "Popular" means today's most actively traded stocks: the first 8 from Yahoo's predefined `most_actives` screener (`/v1/finance/screener/predefined/saved?scrIds=most_actives&count=8`), which Yahoo already orders by volume. It is unofficial like the chart endpoint, so a configured fallback list covers outages.
- Market indexes use Yahoo's index symbols (`^GSPC`, `^IXIC`, `^DJI`) through the same daily-summary endpoint. Index levels are points, not dollars, so the UI shows any `^` symbol without a currency sign.

## User Stories & Functional Requirements

**User stories**

- As a visitor, I see the major market indexes and today's most-traded stocks, with their one-month trends, as soon as the page loads.
- As a visitor, I type a symbol, submit, and see its chart and daily figures.
- As a visitor, I get a clear message when a symbol does not exist or the service is down, and I can try again.
- As a developer, I can add a new data provider, change the market indexes, or change how many trending stocks are shown without touching unrelated code.

**Requirements**

| ID | Area | Requirement | Status |
| --- | --- | --- | --- |
| B1 | Backend | `GET /api/stocks/{symbol}/daily-summary` returns one object per trading day for the last month in the required JSON shape and precision. | Done |
| B2 | Backend | Validate and normalize the symbol (trim, upper-case, allowed characters, max length) before calling upstream. | Done |
| B3 | Backend | Map failures to proper HTTP statuses with RFC 7807 problem details: 400 invalid, 404 unknown symbol, 502/504 upstream error or timeout, 429 passthrough. | Done |
| B4 | Backend | `GET /api/stocks/popular` returns today's top 8 most actively traded stocks from Yahoo's `most_actives` screener, cached for 5 minutes. If Yahoo fails or returns nothing, it returns the configured fallback list (cached for 1 minute). The count and fallback list come from `appsettings.json` and are validated at startup. | Done |
| B5 | Backend | Cache results briefly per symbol and retry transient upstream failures with a timeout. | Partly: timeout, retry and circuit breaker are built; per-symbol caching is not |
| B6 | Backend | Expose Swagger/OpenAPI and a health check; log requests with correlation IDs. | Partly: OpenAPI (Development only) is built; health check and correlation IDs are not |
| F1 | Frontend | Trending stocks: a card per most-active symbol with a trend line, the latest day average (hovering the line shows that day's value and date) and the change over the period. | Done |
| F2 | Frontend | Search box (Enter or button) that validates input locally and requests the symbol. | Done |
| F3 | Frontend | Detail view: line chart of `highAverage` and `lowAverage` and volume bars, with a synced hover tooltip showing each day's figures. | Done (the planned table was replaced by the tooltip) |
| F4 | Frontend | Loading skeletons, empty state, and error banners with a Retry action; one failed card never breaks the dashboard. | Done |
| F5 | Frontend | Responsive layout and accessible controls (labels, focus states, chart text alternatives). | Done |
| F6 | Frontend | Market indexes: fixed cards for the S&P 500 (`^GSPC`), Nasdaq Composite (`^IXIC`) and Dow Jones (`^DJI`), shown by display name with their symbol, quoted in points, and opening the detail view. | Done |

**Future requirements (not part of the MVP)**

| ID | Area | Requirement |
| --- | --- | --- |
| FR1 | Frontend + Backend | Market heat map: a grid of large stocks (for example the top 50 by market cap or volume), one tile per stock. Each tile's color shows the direction and strength of its trend: green shades for gains, red for losses, deeper for bigger moves. Tile size can reflect market cap, and the viewer can switch the period (1 day, 1 week, 1 month). Hovering a tile shows the symbol, name and change; clicking it opens the detail view. Colors are paired with labels or patterns so the map is readable without relying on color alone. |

FR1 needs a backend endpoint that returns the change for many symbols in one call, rather than one daily-summary request per tile. Yahoo's spark endpoint (`/v8/finance/spark`) returns several symbols per request, and the per-symbol caching planned in B5 would keep the map from hitting Yahoo's rate limits.

## Architecture & Tech Stack

The browser talks only to our API, and the API is the only code that knows Yahoo exists; each layer depends on the one below it through an interface.

&#91;embedded content: system architecture · 3 backend layers\]

Requests flow down through the API, core and infrastructure layers; only the core holds the business rules, so a new data provider or cache changes nothing above it.

| Layer | Choice | Why |
| --- | --- | --- |
| Backend framework | ASP.NET Core Web API, .NET 10 LTS (C#) | Required stack; built-in DI, options, health checks, ProblemDetails. |
| Backend structure | `Api` (endpoints, error mapping, popular-list caching), `Core` (models, aggregation, interfaces), `Infrastructure` (Yahoo chart and screener client) | Keeps the aggregation logic pure and testable, and the provider swappable (Dependency Inversion). |
| Upstream access | Typed `HttpClient` + standard resilience handler | Retry, timeout and circuit breaker added without changing business code (Open/Closed). |
| Backend tests | xUnit, `WebApplicationFactory`, coverlet | Unit tests for logic, integration tests for HTTP behavior, coverage reports. |
| Frontend | React 19 + TypeScript 7, Vite | Required stack with fast tooling and type safety. |
| Data fetching | TanStack Query | Caching, loading and error states, retries per card. |
| Charts | Recharts | Declarative React charts for lines and bars. |
| Frontend tests | Vitest, React Testing Library, MSW, V8 coverage | Component tests against a mocked API. |
| Frontend linting | oxlint, Prettier | typescript-eslint doesn't support TypeScript 7 yet. |

**Versions:** the stack uses the latest stable releases: .NET 10 (the current LTS, supported to November 2028; .NET 8 reaches end of support on 10 November 2026), React 19, TypeScript 7, and current releases of Vite, TanStack Query, Recharts and Vitest. Exact versions are checked with `dotnet --list-sdks` and `npm view <package> version` at scaffold time, pinned in the lockfiles, and recorded in the README.

## API Contract

The main endpoint is `GET /api/stocks/{symbol}/daily-summary`, and it returns exactly the array shape from the assessment.

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

| Field | Type | Rule |
| --- | --- | --- |
| `day` | string | Trading date `yyyy-MM-dd` in the exchange's time zone. |
| `lowAverage` | number | Mean of the day's 15-minute lows, 4 decimal places. |
| `highAverage` | number | Mean of the day's 15-minute highs, 4 decimal places. |
| `volume` | integer | Sum of the day's 15-minute volumes. |

A second endpoint, `GET /api/stocks/popular`, returns a JSON array of today's 8 most actively traded symbols, highest volume first, such as `["NVDA","TSLA","F"]`. It always returns 200: when Yahoo's screener fails, it returns the configured fallback list instead of an error.

The market indexes have no endpoint of their own. The frontend requests `^GSPC`, `^IXIC` and `^DJI` from the daily-summary endpoint.

**Errors** use `application/problem+json` with `type`, `title`, `status`, `detail` and a `traceId`.

| Status | When | UI behavior |
| --- | --- | --- |
| 400 | Symbol is empty or has invalid characters or length. | Inline validation message. |
| 404 | Upstream does not know the symbol, or returns no data. | "Symbol not found" message. |
| 429 | Upstream is throttling. | Retry-later message with Retry button. |
| 502 / 504 | Upstream failed, returned bad data, or timed out. | Generic failure banner with Retry button. |

## Non-Functional Requirements

- **Resilience:** typed `HttpClient` with timeout, retry with backoff for transient errors, and a circuit breaker (Microsoft.Extensions.Http.Resilience).
- **Performance:** the most-active list is cached in memory for 5 minutes (1 minute for the fallback), and the frontend caches each symbol's data for 5 minutes, so repeat views don't hit Yahoo again. Dashboard cards load in parallel. A backend cache per symbol is planned but not built.
- **Security:** strict symbol validation (no URL injection into the upstream call), CORS limited to the frontend origin, no secrets in the repo, and no stack traces in responses. Security headers are planned but not built.
- **Maintainability:** SOLID layering, dependency injection, options pattern for configuration, nullable reference types on, analyzers and formatting enforced (`dotnet format`, oxlint, Prettier).
- **Observability:** structured logging, with warnings when the upstream fails or the fallback list is served, and no logging of full upstream payloads. Correlation IDs and a `/health` endpoint are planned but not built.
- **Testing:** xUnit unit tests for the aggregation logic (rounding, time zones, null candles, empty data) and the Yahoo client (chart and screener parsing, failures), integration tests with a stubbed upstream via `WebApplicationFactory` (including the popular list's caching and fallback), and Vitest + React Testing Library for components and API error states.
- **Accessibility and compatibility:** keyboard-usable controls, labelled inputs, and current evergreen browsers.
- **Operability:** Dockerfiles for both apps, `docker compose up` for one-command run, and a GitHub Actions workflow that builds and tests both. Not built yet; the README covers running both apps locally.

## Implementation Plan

Build the backend first, since the frontend depends on its contract, and keep PROMPT\_LOG.md updated at the end of every phase rather than at the end of the project.

1. **Scaffold:** repo layout, .NET solution and projects, Vite React + TypeScript app, linting and formatting, empty CI workflow.
2. **Aggregation core (test first):** domain models and the pure grouping/averaging logic with unit tests for time zones, rounding, null candles and empty data.
3. **Upstream client:** Yahoo DTOs, typed `HttpClient` behind an `IMarketDataProvider` interface, with timeout, retry and circuit breaker.
4. **API layer:** daily-summary and popular endpoints, symbol validation, problem-details error mapping, caching decorator, Swagger, health check, CORS.
5. **Backend integration tests:** `WebApplicationFactory` with a stubbed upstream covering success, 400, 404, 429 and 502/504 paths.
6. **Frontend foundation:** typed API client, TanStack Query setup, app shell and routing-free layout.
7. **Dashboard, search and charts:** popular-stocks grid, search form, detail chart and table.
8. **States and polish:** loading, empty and error states with retry, accessibility pass, responsive layout, component tests.
9. **Ship:** Dockerfiles and `docker compose`, README with run instructions, PROMPT\_LOG.md, manual-changes notes, final review of every AI-generated file.

## Deliverables, Risks & Open Questions

**Deliverables**

- GitHub repository with commits that show the work in stages.
- `README.md` with prerequisites and run steps for backend, frontend and tests (Docker steps to follow once the Dockerfiles exist).
- `PROMPT_LOG.md` with each prompt, why it was sent, and what was kept, changed or rejected.
- `MANUAL_LOG.md` describing and justifying every manual change made outside of AI.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Yahoo's chart endpoint is unofficial and may throttle or change. | Data fails to load. | Provider interface, resilience policies, caching, clear error states, and recorded fixtures for tests. |
| Time-zone mistakes when grouping by day. | Wrong or duplicate days. | Group using the exchange time zone and cover it with tests. |
| Yahoo's most-active screener fails, throttles or changes. | The trending section would be empty. | The endpoint serves a configured fallback list, caches it briefly, and logs a warning. |
| Unusual symbols (indexes, `BRK-B`, crypto). | False 400 or 404 responses. | Permissive but safe validation pattern, tested against sample symbols. |
| AI-generated code that looks right but is not production-ready. | Quality and review risk. | Review every file, add tests, and record changes in the prompt log. |
