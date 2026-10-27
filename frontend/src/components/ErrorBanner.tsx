import { ApiError } from '../api/types'

interface ErrorBannerProps {
  error: unknown
  onRetry?: () => void
  compact?: boolean
}

export function ErrorBanner({ error, onRetry, compact = false }: ErrorBannerProps) {
  const apiError = error instanceof ApiError ? error : null
  const message = apiError?.message ?? 'Something went wrong while loading stock data.'
  const canRetry = onRetry && (apiError?.retryable ?? true)

  return (
    <div className="error-banner" data-compact={compact || undefined} role="alert">
      <span className="error-banner__icon" aria-hidden="true">
        !
      </span>
      <p className="error-banner__message">{message}</p>
      {canRetry && (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
