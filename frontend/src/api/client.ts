import { getMockDailySummary } from './mock'
import { ApiError, type ApiErrorKind, type DailySummary, type ProblemDetails } from './types'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400) return 'invalid'
  if (status === 404) return 'notFound'
  if (status === 429) return 'rateLimited'
  return 'upstream'
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  invalid: 'That symbol is not valid.',
  notFound: 'Symbol not found.',
  rateLimited: 'The data provider is busy. Try again in a moment.',
  upstream: 'Stock data is unavailable right now.',
  network: 'Could not reach the StockFinder service.',
}

async function toApiError(response: Response): Promise<ApiError> {
  const kind = kindForStatus(response.status)
  let problem: ProblemDetails = {}
  try {
    problem = (await response.json()) as ProblemDetails
  } catch {
    // Non-JSON error body (e.g. proxy error page); fall back to a generic message.
  }
  return new ApiError(kind, problem.detail ?? FALLBACK_MESSAGES[kind], response.status, problem.traceId)
}

export async function fetchDailySummary(symbol: string, signal?: AbortSignal): Promise<DailySummary[]> {
  if (USE_MOCKS) return getMockDailySummary(symbol, signal)

  let response: Response
  try {
    response = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/daily-summary`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('network', FALLBACK_MESSAGES.network)
  }

  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as DailySummary[]
}
