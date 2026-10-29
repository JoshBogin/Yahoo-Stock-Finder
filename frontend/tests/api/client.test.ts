import { HttpResponse, http } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { POPULAR_SYMBOLS, problem, sampleSummary, server } from '../support/server'
import { fetchDailySummary, fetchPopularSymbols } from '../../src/api/client'
import { ApiError } from '../../src/api/types'

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  )
  if (!(error instanceof ApiError)) throw new Error(`Expected an ApiError, got ${String(error)}`)
  return error
}

describe('fetchDailySummary', () => {
  it('parses the daily-summary array exactly as the API returns it', async () => {
    const rows = await fetchDailySummary('AAPL')

    expect(rows).toEqual(sampleSummary())
  })

  it('passes through the API’s four-decimal prices unchanged and supports volumes beyond 32 bits', async () => {
    const rows = await fetchDailySummary('AAPL')
    const first = rows[0]
    const last = rows.at(-1)

    expect(first?.lowAverage).toBe(241.3718)
    expect(first?.highAverage).toBe(244.9062)
    expect(last?.volume).toBe(3_500_000_000)
    expect(first?.lowAverage).not.toBe(Number(first?.lowAverage.toFixed(2)))
    expect(first?.highAverage).not.toBe(Number(first?.highAverage.toFixed(2)))
  })

  it('requests the symbol’s daily-summary path and asks for JSON', async () => {
    let requested: Request | undefined
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', ({ request }) => {
        requested = request
        return HttpResponse.json([])
      }),
    )

    await fetchDailySummary('MSFT')

    expect(new URL(requested!.url).pathname).toBe('/api/stocks/MSFT/daily-summary')
    expect(requested!.headers.get('Accept')).toBe('application/json')
  })

  it('URL-encodes symbols with special characters', async () => {
    let path = ''
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', ({ request }) => {
        path = new URL(request.url).pathname
        return HttpResponse.json([])
      }),
    )

    await fetchDailySummary('^GSPC')

    expect(path).toBe('/api/stocks/%5EGSPC/daily-summary')
  })

  it('returns an empty array when the API has no rows', async () => {
    server.use(http.get('*/api/stocks/:symbol/daily-summary', () => HttpResponse.json([])))

    await expect(fetchDailySummary('AAPL')).resolves.toEqual([])
  })

  it.each([
    [400, 'invalid', false],
    [404, 'notFound', false],
    [429, 'rateLimited', true],
    [502, 'upstream', true],
    [504, 'upstream', true],
    [500, 'upstream', true],
  ] as const)('maps HTTP %i to a %s error (retryable: %s)', async (status, kind, retryable) => {
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', () => problem(status, 'Failed', `Problem ${status}`)),
    )

    const error = await captureError(fetchDailySummary('AAPL'))

    expect(error.kind).toBe(kind)
    expect(error.status).toBe(status)
    expect(error.retryable).toBe(retryable)
  })

  it('uses the problem details’ detail and traceId', async () => {
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', () =>
        problem(404, 'Symbol not found', "No intraday data was found for 'ZZZZ'."),
      ),
    )

    const error = await captureError(fetchDailySummary('ZZZZ'))

    expect(error.message).toBe("No intraday data was found for 'ZZZZ'.")
    expect(error.traceId).toBe('00-trace-01')
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    server.use(
      http.get(
        '*/api/stocks/:symbol/daily-summary',
        () => new HttpResponse('<h1>Bad Gateway</h1>', { status: 502 }),
      ),
    )

    const error = await captureError(fetchDailySummary('AAPL'))

    expect(error.kind).toBe('upstream')
    expect(error.message).toBe('Stock data is unavailable right now.')
  })

  it('reports a network error when the service can’t be reached', async () => {
    server.use(http.get('*/api/stocks/:symbol/daily-summary', () => HttpResponse.error()))

    const error = await captureError(fetchDailySummary('AAPL'))

    expect(error.kind).toBe('network')
    expect(error.status).toBeUndefined()
    expect(error.retryable).toBe(true)
  })

  it('rethrows the abort instead of reporting a network error when the request is cancelled', async () => {
    const controller = new AbortController()
    controller.abort()

    const error = await fetchDailySummary('AAPL', controller.signal).catch((reason: unknown) => reason)

    expect(error).not.toBeInstanceOf(ApiError)
    expect((error as Error).name).toBe('AbortError')
  })
})

describe('fetchPopularSymbols', () => {
  it('parses the popular symbols array', async () => {
    await expect(fetchPopularSymbols()).resolves.toEqual(POPULAR_SYMBOLS)
  })

  it('maps a failed response to an ApiError', async () => {
    server.use(http.get('*/api/stocks/popular', () => problem(502, 'Bad gateway', 'Upstream failed.')))

    const error = await captureError(fetchPopularSymbols())

    expect(error.kind).toBe('upstream')
    expect(error.message).toBe('Upstream failed.')
  })
})
