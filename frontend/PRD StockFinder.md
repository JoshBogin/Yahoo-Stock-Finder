# PRD: Intraday Stock Trends App

Oct 27, 2026 · @Josh Bogin

## Overview & Goals

We are building a small full-stack app that shows the last month of intraday stock activity, summarized per day: a C# .NET 10 REST API that wraps Yahoo Finance's public chart endpoint, and a React web page that charts popular stocks and any symbol the user searches for.

**Goals**

- Meet every requirement in the Take-Home Assessment, with exact JSON shape and precision.
- Show a dashboard of popular stocks and their trends on load.
- Let a user submit any symbol and see its chart, or a clear error if the symbol does not exist.
- Ship production-quality code that is easy to extend (SOLID, tested, documented).
- Leave a clear record of AI collaboration (PROMPT\_LOG.md) and of manual changes.

**Success criteria**

- A reviewer can clone the repo, follow the README, and run backend and frontend locally in under 10 minutes.
- `GET` on a valid symbol returns one entry per trading day for the last month, in the required format.
- Invalid symbols and upstream failures produce a handled error state in the UI, never a blank page or crash.
- Backend unit and integration tests and frontend component tests pass in CI.

## Scope & Assumptions

The MVP covers one read-only data flow, from Yahoo Finance to a chart, and stops there.

**In scope**

- C# .NET 10 Web API with a daily-summary endpoint.
- React + TypeScript single-page UI: popular-stocks dashboard with a customizable list, symbol search, detail chart, error states.
- Unit and integration tests, README, PROMPT\_LOG.md, Dockerfile and a CI workflow.

**Out of scope (designed not to block later)**

- Accounts, server-side persistence or a database (the customized list is saved in the browser only).
- Real-time streaming or intervals other than 15 minutes.
- Symbol autocomplete, comparison of several symbols on one chart.

**Assumptions**

- The upstream call is `/v8/finance/chart/{symbol}?range=1mo&interval=15m` with a browser-style `User-Agent` header, as in the assessment's curl example. It is an unofficial endpoint, so it can change or throttle without notice.
- A "day" is the trading date in the exchange's time zone (from the response's `exchangeTimezoneName`), not UTC.
- `lowAverage` is the mean of the day's 15-minute `low` values, `highAverage` the mean of the `high` values, and `volume` the sum of the day's volumes.
- Prices are rounded to 4 decimal places (matching `40.2958` in the sample); volume is a whole number.
- Candles with null price or volume (halts, gaps) are skipped; days left with no valid candles are omitted.
- Results are sorted oldest to newest, as in the sample.

* **Popularity** means average daily volume over the last month. The frontend holds a curated pool of about a dozen heavily traded US stocks, fetches each one's daily summary, and shows the top 6 by default.

## User Stories & Functional Requirements

**User stories**

- As a visitor, I see popular stocks and their one-month trend as soon as the page loads.
- As a visitor, I can add or remove stocks on the dashboard and reset to the defaults, and my list is remembered in my browser.
- As a visitor, I type a symbol, submit, and see its chart and daily figures.
- As a visitor, I get a clear message when a symbol does not exist or the service is down, and I can try again.
- As a developer, I can add a new data provider or a new popular symbol without touching unrelated code.

**Requirements**

| ID | Area | Requirement |
| --- | --- | --- |
| B1 | Backend | `GET /api/stocks/{symbol}/daily-summary` returns one object per trading day for the last month in the required JSON shape and precision. |
| B2 | Backend | Validate and normalize the symbol (trim, upper-case, allowed characters, max length) before calling upstream. |
| B3 | Backend | Map failures to proper HTTP statuses with RFC 7807 problem details: 400 invalid, 404 unknown symbol, 502/504 upstream error or timeout, 429 passthrough. |
| B4 | Backend | No separate popular-stocks endpoint: the frontend ranks its candidate symbols using the daily-summary endpoint, which already returns volume. |
| B5 | Backend | Cache results briefly per symbol and retry transient upstream failures with a timeout. |
| B6 | Backend | Expose Swagger/OpenAPI and a health check; log requests with correlation IDs. |
| F1 | Frontend | Dashboard of popular stocks: a card per symbol with a trend line, latest high average and change over the period. Defaults are the top 6 of a curated pool ranked by average daily volume; users can add or remove cards and reset to defaults, and the list is saved in the browser (localStorage). |
| F2 | Frontend | Search box (Enter or button) that validates input locally and requests the symbol. |
| F3 | Frontend | Detail view: line chart of `highAverage` and `lowAverage`, volume bars, and a table of the daily rows. |
| F4 | Frontend | Loading skeletons, empty state, and error banners with a Retry action; one failed card never breaks the dashboard. |
| F5 | Frontend | Responsive layout and accessible controls (labels, focus states, chart text alternatives). |

## Architecture & Tech Stack

The browser talks only to our API, and the API is the only code that knows Yahoo exists; each layer depends on the one below it through an interface.

&#91;embedded content: system architecture · 3 backend layers\]

Requests flow down through the API, core and infrastructure layers; only the core holds the business rules, so a new data provider or cache changes nothing above it.

| Layer | Choice | Why |
| --- | --- | --- |
| Backend framework | ASP.NET Core Web API, .NET 10 LTS (C#) | Required stack; built-in DI, options, health checks, ProblemDetails. |
| Backend structure | `Api` (endpoints, middleware), `Core` (models, aggregation, interfaces), `Infrastructure` (Yahoo client, cache) | Keeps the aggregation logic pure and testable, and the provider swappable (Dependency Inversion). |
| Upstream access | Typed `HttpClient` + resilience handler + caching decorator | Retry, timeout and caching added without changing business code (Open/Closed). |
| Backend tests | xUnit, FluentAssertions, `WebApplicationFactory` | Unit tests for logic, integration tests for HTTP behavior. |
| Frontend | React 19 + TypeScript 6, Vite | Required stack with fast tooling and type safety. |
| Data fetching | TanStack Query | Caching, loading and error states, retries per card. |
| Charts | Recharts | Declarative React charts for lines and bars. |
| Frontend tests | Vitest, React Testing Library, MSW | Component tests against a mocked API. |

**Versions:** the stack uses the latest stable releases: .NET 10 (the current LTS, supported to November 2028; .NET 8 reaches end of support on 10 November 2026), React 19, TypeScript 6, and current releases of Vite, TanStack Query, Recharts and Vitest. Exact versions are checked with `dotnet --list-sdks` and `npm view <package> version` at scaffold time, pinned in the lockfiles, and recorded in the README.

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

There is no popular-stocks endpoint: the dashboard's default list, ranking and customization live in the frontend and reuse this endpoint, one request per symbol.

**Errors** use `application/problem+json` with `type`, `title`, `status`, `detail` and a `traceId`.

| Status | When | UI behavior |
| --- | --- | --- |
| 400 | Symbol is empty or has invalid characters or length. | Inline validation message. |
| 404 | Upstream does not know the symbol, or returns no data. | "Symbol not found" message. |
| 429 | Upstream is throttling. | Retry-later message with Retry button. |
| 502 / 504 | Upstream failed, returned bad data, or timed out. | Generic failure banner with Retry button. |

## Non-Functional Requirements

- **Resilience:** typed `HttpClient` with timeout, retry with backoff for transient errors, and a circuit breaker (Microsoft.Extensions.Http.Resilience).
- **Performance:** in-memory cache per symbol with a short TTL (about 5 minutes) so the dashboard and repeat searches do not hammer Yahoo; dashboard cards load in parallel.
- **Security:** strict symbol validation (no URL injection into the upstream call), CORS limited to the frontend origin, no secrets in the repo, security headers, and no stack traces in responses.
- **Maintainability:** SOLID layering, dependency injection, options pattern for configuration, nullable reference types on, analyzers and formatting enforced (`dotnet format`, ESLint, Prettier).
- **Observability:** structured logging with correlation ID, `/health` endpoint, and no logging of full upstream payloads.
- **Testing:** xUnit unit tests for the aggregation logic (rounding, time zones, null candles, empty data), integration tests with a stubbed upstream via `WebApplicationFactory`, and Vitest + React Testing Library for components and API error states.
- **Accessibility and compatibility:** keyboard-usable controls, labelled inputs, and current evergreen browsers.
- **Operability:** Dockerfiles for both apps, `docker compose up` for one-command run, and a GitHub Actions workflow that builds and tests both.

## Implementation Plan

Build the backend first, since the frontend depends on its contract, and keep PROMPT\_LOG.md updated at the end of every phase rather than at the end of the project.

1. **Scaffold:** repo layout, .NET solution and projects, Vite React + TypeScript app, linting and formatting, empty CI workflow.
2. **Aggregation core (test first):** domain models and the pure grouping/averaging logic with unit tests for time zones, rounding, null candles and empty data.
3. **Upstream client:** Yahoo DTOs, typed `HttpClient` behind an `IMarketDataProvider` interface, with timeout, retry and circuit breaker.
4. **API layer:** daily-summary endpoint, symbol validation, problem-details error mapping, caching decorator, Swagger, health check, CORS.
5. **Backend integration tests:** `WebApplicationFactory` with a stubbed upstream covering success, 400, 404, 429 and 502/504 paths.
6. **Frontend foundation:** typed API client, TanStack Query setup, app shell and routing-free layout.
7. **Dashboard, search and charts:** popular-stocks grid ranked by average daily volume, an editable list saved in the browser, search form, detail chart and table.
8. **States and polish:** loading, empty and error states with retry, accessibility pass, responsive layout, component tests.
9. **Ship:** Dockerfiles and `docker compose`, README with run instructions, PROMPT\_LOG.md, manual-changes notes, final review of every AI-generated file.

## Deliverables, Risks & Open Questions

**Deliverables**

- GitHub repository with commits that show the work in stages.
- `README.md` with prerequisites and run steps for backend, frontend, tests and Docker.
- `PROMPT_LOG.md` with each prompt, why it was sent, and what was kept, changed or rejected.
- A section (in the README or its own file) describing and justifying every manual change made outside of AI.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Yahoo's chart endpoint is unofficial and may throttle or change. | Data fails to load. | Provider interface, resilience policies, caching, clear error states, and recorded fixtures for tests. |
| Time-zone mistakes when grouping by day. | Wrong or duplicate days. | Group using the exchange time zone and cover it with tests. |
| Unusual symbols (indexes, `BRK-B`, crypto). | False 400 or 404 responses. | Permissive but safe validation pattern, tested against sample symbols. |
| AI-generated code that looks right but is not production-ready. | Quality and review risk. | Review every file, add tests, and record changes in the prompt log. |

**Open questions**

- Decided: the popular list will not come from the backend config; defaults are ranked by volume in the frontend and users can customize them.
- Is Recharts acceptable for charting, or is another library preferred?
- Is Docker support wanted, or would it be over-scoping for the submission?
