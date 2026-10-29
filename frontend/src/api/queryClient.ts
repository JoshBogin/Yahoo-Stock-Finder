import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './types'

const MAX_RETRIES = 2

/** Retries transient failures a couple of times; a bad or unknown symbol fails straight away. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && (!(error instanceof ApiError) || error.retryable)
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Matches the backend's per-symbol cache; daily summaries don't change minute to minute.
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
    },
  })
}
