/** One trading day of the backend's daily-summary response. */
export interface DailySummary {
  /** Trading date `yyyy-MM-dd` in the exchange's time zone. */
  day: string
  lowAverage: number
  highAverage: number
  volume: number
}

/** RFC 7807 problem details as returned by the API on failure. */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  traceId?: string
}

export type ApiErrorKind = 'invalid' | 'notFound' | 'rateLimited' | 'upstream' | 'network'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly traceId: string | undefined

  constructor(kind: ApiErrorKind, message: string, status?: number, traceId?: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.traceId = traceId
  }

  /** Only transient failures are worth retrying; a bad or unknown symbol never recovers. */
  get retryable(): boolean {
    return this.kind === 'rateLimited' || this.kind === 'upstream' || this.kind === 'network'
  }
}
