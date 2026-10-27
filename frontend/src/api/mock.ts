import { ApiError, type DailySummary } from './types'

const MOCK_LATENCY_MS = 400
const TRADING_DAYS = 21

// Small deterministic PRNG so each symbol always renders the same mock series.
function seededRandom(seed: string): () => number {
  let state = [...seed].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 2166136261)
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function lastTradingDays(count: number): string[] {
  const days: string[] = []
  const date = new Date()
  while (days.length < count) {
    date.setDate(date.getDate() - 1)
    const weekday = date.getDay()
    if (weekday !== 0 && weekday !== 6) days.unshift(date.toISOString().slice(0, 10))
  }
  return days
}

const round4 = (value: number) => Math.round(value * 10_000) / 10_000

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

/** Dev-only stand-in for the backend. `ZZZZ` simulates an unknown symbol, `FAIL` an upstream outage. */
export async function getMockDailySummary(symbol: string, signal?: AbortSignal): Promise<DailySummary[]> {
  await wait(MOCK_LATENCY_MS, signal)
  if (symbol === 'ZZZZ') throw new ApiError('notFound', `No data found for symbol '${symbol}'.`, 404)
  if (symbol === 'FAIL') throw new ApiError('upstream', 'Stock data is unavailable right now.', 502)

  const random = seededRandom(symbol)
  let price = 20 + random() * 480
  const baseVolume = 5_000_000 + random() * 120_000_000

  return lastTradingDays(TRADING_DAYS).map((day) => {
    price *= 1 + (random() - 0.48) * 0.04
    const spread = price * (0.005 + random() * 0.015)
    return {
      day,
      lowAverage: round4(price - spread / 2),
      highAverage: round4(price + spread / 2),
      volume: Math.round(baseVolume * (0.6 + random() * 0.8)),
    }
  })
}
