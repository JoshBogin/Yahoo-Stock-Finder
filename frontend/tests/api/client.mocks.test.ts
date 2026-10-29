import { afterEach, describe, expect, it, vi } from 'vitest'
import { server } from '../support/server'

vi.mock('../../src/api/mock', () => ({
  getMockDailySummary: vi.fn(async () => [{ day: '2026-09-28', lowAverage: 1, highAverage: 2, volume: 3 }]),
  getMockPopularSymbols: vi.fn(async () => ['MOCK']),
}))

// client.ts reads VITE_USE_MOCKS when it loads, so each test imports a fresh copy after setting it.
async function loadClientWithMocks() {
  vi.stubEnv('VITE_USE_MOCKS', 'true')
  vi.resetModules()
  return import('../../src/api/client')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('API client in mock mode', () => {
  it('serves the daily summary from the dev mocks without calling the API', async () => {
    const onRequest = vi.fn()
    server.events.on('request:start', onRequest)
    const { fetchDailySummary } = await loadClientWithMocks()

    expect(await fetchDailySummary('AAPL')).toEqual([
      { day: '2026-09-28', lowAverage: 1, highAverage: 2, volume: 3 },
    ])
    expect(onRequest).not.toHaveBeenCalled()
    server.events.removeAllListeners()
  })

  it('serves the popular symbols from the dev mocks', async () => {
    const { fetchPopularSymbols } = await loadClientWithMocks()

    expect(await fetchPopularSymbols()).toEqual(['MOCK'])
  })
})
