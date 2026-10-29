import { describe, expect, it } from 'vitest'
import { createQueryClient, shouldRetry } from '../../src/api/queryClient'
import { ApiError, type ApiErrorKind } from '../../src/api/types'

describe('shouldRetry', () => {
  it.each<ApiErrorKind>(['rateLimited', 'upstream', 'network'])('retries %s errors', (kind) => {
    expect(shouldRetry(0, new ApiError(kind, 'x'))).toBe(true)
  })

  it.each<ApiErrorKind>(['invalid', 'notFound'])('never retries %s errors', (kind) => {
    expect(shouldRetry(0, new ApiError(kind, 'x'))).toBe(false)
  })

  it('retries unexpected errors', () => {
    expect(shouldRetry(0, new TypeError('boom'))).toBe(true)
  })

  it('gives up after two retries', () => {
    const error = new ApiError('upstream', 'x')
    expect(shouldRetry(1, error)).toBe(true)
    expect(shouldRetry(2, error)).toBe(false)
  })
})

describe('createQueryClient', () => {
  it('caches for five minutes, matching the backend, and doesn’t refetch on window focus', () => {
    const queries = createQueryClient().getDefaultOptions().queries

    expect(queries?.staleTime).toBe(5 * 60 * 1000)
    expect(queries?.refetchOnWindowFocus).toBe(false)
    expect(queries?.retry).toBe(shouldRetry)
  })
})
