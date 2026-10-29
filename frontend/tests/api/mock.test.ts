import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockDailySummary, getMockPopularSymbols } from '../../src/api/mock'
import { ApiError } from '../../src/api/types'

/** Lets the mock's simulated latency elapse, then resolves the request. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return promise
}

// The dev-only stand-in for the backend (VITE_USE_MOCKS=true).
describe('mock API', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns 21 weekday rows in the API’s shape and precision, oldest first', async () => {
    const rows = await settle(getMockDailySummary('AAPL'))

    expect(rows).toHaveLength(21)
    const days = rows.map((row) => row.day)
    expect(days).toEqual(days.toSorted())
    for (const row of rows) {
      expect(new Date(`${row.day}T00:00:00Z`).getUTCDay()).not.toBeOneOf([0, 6])
      expect(row.lowAverage).toBeLessThan(row.highAverage)
      expect(Number.isInteger(row.volume)).toBe(true)
      expect(row.highAverage).toBe(Math.round(row.highAverage * 10_000) / 10_000)
    }
  })

  it('is deterministic per symbol', async () => {
    const first = await settle(getMockDailySummary('MSFT'))
    const second = await settle(getMockDailySummary('MSFT'))
    const other = await settle(getMockDailySummary('NVDA'))

    expect(second).toEqual(first)
    expect(other).not.toEqual(first)
  })

  it.each([
    ['ZZZZ', 'notFound', 404],
    ['FAIL', 'upstream', 502],
  ] as const)('simulates %s as a %s error', async (symbol, kind, status) => {
    const result = getMockDailySummary(symbol).catch((error: unknown) => error)
    const error = await settle(result)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind, status })
  })

  it('stops waiting when the request is aborted', async () => {
    const controller = new AbortController()
    const result = getMockDailySummary('AAPL', controller.signal).catch((error: unknown) => error)

    controller.abort()

    expect(await result).toBe(controller.signal.reason)
  })

  it('returns a popular symbols list', async () => {
    expect(await settle(getMockPopularSymbols())).toEqual([
      'NVDA',
      'TSLA',
      'AAPL',
      'AMZN',
      'MSFT',
      'META',
      'GOOGL',
      'AMD',
    ])
  })
})
