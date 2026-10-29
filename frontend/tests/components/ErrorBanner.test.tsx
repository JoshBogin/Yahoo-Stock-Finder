import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../src/api/types'
import { ErrorBanner } from '../../src/components/ErrorBanner'

describe('ErrorBanner', () => {
  it('shows an API error’s message as an alert, with Retry for a temporary failure', async () => {
    const onRetry = vi.fn()
    render(
      <ErrorBanner
        error={new ApiError('upstream', 'Stock data is unavailable right now.', 502)}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Stock data is unavailable right now.')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it.each(['invalid', 'notFound'] as const)('hides Retry for a %s error, which never recovers', (kind) => {
    render(<ErrorBanner error={new ApiError(kind, 'Symbol not found.')} onRetry={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('falls back to a generic message for unexpected errors, and still offers Retry', () => {
    render(<ErrorBanner error={new TypeError('x is undefined')} onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong while loading stock data.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('x is undefined')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('has no Retry without a handler', () => {
    render(<ErrorBanner error={new ApiError('upstream', 'Down.')} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
