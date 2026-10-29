import { HttpResponse, http } from 'msw/http'
import { setupServer } from 'msw/node'
import type { DailySummary } from '../../src/api/types'

export const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'TSLA']

/** Three days of the backend's daily-summary shape, oldest first, at four-decimal precision. */
export function sampleSummary(): DailySummary[] {
  return [
    { day: '2026-09-28', lowAverage: 241.3718, highAverage: 244.9062, volume: 51_873_204 },
    { day: '2026-09-29', lowAverage: 243.0051, highAverage: 246.5, volume: 48_120_977 },
    { day: '2026-09-30', lowAverage: 250.1234, highAverage: 257.1519, volume: 3_500_000_000 },
  ]
}

export function problem(status: number, title: string, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title, status, detail, traceId: '00-trace-01' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** Happy-path handlers; tests override them with `server.use(...)`. */
export const handlers = [
  http.get('*/api/stocks/popular', () => HttpResponse.json(POPULAR_SYMBOLS)),
  http.get('*/api/stocks/:symbol/daily-summary', () => HttpResponse.json(sampleSummary())),
]

export const server = setupServer(...handlers)
