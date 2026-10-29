import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../support/render'
import { problem, sampleSummary, server } from '../support/server'
import { StockDetail } from '../../src/components/StockDetail'

describe('StockDetail', () => {
  it('displays API averages rounded to two decimals', async () => {
    renderWithClient(<StockDetail symbol="AAPL" onClose={vi.fn()} />)

    expect(await screen.findByText('$257.15')).toBeInTheDocument()
    expect(screen.getByText('$250.12')).toBeInTheDocument()
    expect(screen.queryByText('$257.1519')).not.toBeInTheDocument()
    expect(screen.queryByText('$250.1234')).not.toBeInTheDocument()
    expect(screen.getByText('+5.00%')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AAPL' })).toHaveFocus()
  })

  it('names a market index, shows its symbol and quotes it in points', async () => {
    renderWithClient(<StockDetail symbol="^GSPC" onClose={vi.fn()} />)

    expect(await screen.findByText('257.15')).toBeInTheDocument()
    expect(screen.queryByText('$257.15')).not.toBeInTheDocument()
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('S&P 500^GSPC')
    expect(heading).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Close S&P 500 details' })).toBeInTheDocument()
  })

  it('shows a loading state first', () => {
    renderWithClient(<StockDetail symbol="AAPL" onClose={vi.fn()} />)

    expect(screen.getByText('Loading AAPL')).toBeInTheDocument()
  })

  it('shows "not found" without a Retry button for an unknown symbol', async () => {
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', () =>
        problem(404, 'Symbol not found', "No intraday data was found for 'ZZZZ'."),
      ),
    )
    renderWithClient(<StockDetail symbol="ZZZZ" onClose={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent("No intraday data was found for 'ZZZZ'.")
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it.each([
    [429, 'The data provider is busy.'],
    [502, 'Yahoo Finance returned an error.'],
    [504, 'Yahoo Finance timed out.'],
  ])('offers Retry after a %i and recovers', async (status, detail) => {
    let fail = true
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', () =>
        fail ? problem(status, 'Upstream error', detail) : HttpResponse.json(sampleSummary()),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<StockDetail symbol="AAPL" onClose={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(detail)

    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('$257.15')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a network error when the API is unreachable', async () => {
    server.use(http.get('*/api/stocks/:symbol/daily-summary', () => HttpResponse.error()))
    renderWithClient(<StockDetail symbol="AAPL" onClose={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the StockFinder service.')
  })

  it('shows an empty state when there are no trading days', async () => {
    server.use(http.get('*/api/stocks/:symbol/daily-summary', () => HttpResponse.json([])))
    renderWithClient(<StockDetail symbol="AAPL" onClose={vi.fn()} />)

    expect(
      await screen.findByText('No trading days were found for AAPL in the last month.'),
    ).toBeInTheDocument()
  })

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithClient(<StockDetail symbol="AAPL" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close AAPL details' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
