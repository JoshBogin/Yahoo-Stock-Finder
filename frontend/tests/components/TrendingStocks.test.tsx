import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../support/render'
import { POPULAR_SYMBOLS, problem, sampleSummary, server } from '../support/server'
import { TrendingStocks } from '../../src/components/TrendingStocks'

function cardFor(symbol: string) {
  return screen.getByRole('button', { name: `${symbol}, view details` }).closest('article')!
}

describe('TrendingStocks', () => {
  it('renders one card per symbol from the popular endpoint, in order', async () => {
    renderWithClient(<TrendingStocks onSelect={vi.fn()} />)

    const buttons = await screen.findAllByRole('button', { name: /view details/ })
    expect(buttons.map((button) => button.textContent)).toEqual(
      POPULAR_SYMBOLS.map((s) => `${s}, view details`),
    )
  })

  it('shows each card’s latest day average, its date and the period change', async () => {
    renderWithClient(<TrendingStocks onSelect={vi.fn()} />)

    await screen.findAllByText('$253.64')
    const card = cardFor('AAPL')
    // Latest day: (250.1234 + 257.1519) / 2 = 253.63765
    expect(within(card).getByText('$253.64')).toBeInTheDocument()
    expect(within(card).getByText('Sep 30')).toHaveAttribute('datetime', '2026-09-30')
    // First day averages 243.139: 253.63765 / 243.139 - 1
    expect(within(card).getByText('+4.32%')).toBeInTheDocument()
    expect(within(card).getByRole('img')).toHaveAccessibleName(
      'AAPL daily average over the last month, +4.32%',
    )
  })

  it('shows placeholders while the symbol list loads', () => {
    renderWithClient(<TrendingStocks onSelect={vi.fn()} />)

    expect(screen.getByText('Loading popular stocks')).toBeInTheDocument()
  })

  it('shows an error with Retry when the popular list fails, and recovers', async () => {
    let fail = true
    server.use(
      http.get('*/api/stocks/popular', () =>
        fail ? problem(502, 'Bad gateway', 'Stock list is unavailable.') : HttpResponse.json(['NVDA']),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<TrendingStocks onSelect={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Stock list is unavailable.')

    fail = false
    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('button', { name: 'NVDA, view details' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an empty state when no symbols are configured', async () => {
    server.use(http.get('*/api/stocks/popular', () => HttpResponse.json([])))
    renderWithClient(<TrendingStocks onSelect={vi.fn()} />)

    expect(await screen.findByText('No popular stocks are available.')).toBeInTheDocument()
  })

  it('keeps the other cards when one symbol fails', async () => {
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', ({ params }) =>
        params.symbol === 'MSFT'
          ? problem(404, 'Symbol not found', "No intraday data was found for 'MSFT'.")
          : HttpResponse.json(sampleSummary()),
      ),
    )
    renderWithClient(<TrendingStocks onSelect={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(cardFor('MSFT')).toContainElement(alert)
    // A 404 never recovers, so there is nothing to retry.
    expect(within(alert).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(await within(cardFor('AAPL')).findByText('$253.64')).toBeInTheDocument()
    expect(await within(cardFor('TSLA')).findByText('$253.64')).toBeInTheDocument()
  })

  it('selects a symbol when its card is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderWithClient(<TrendingStocks onSelect={onSelect} />)

    await user.click(await screen.findByRole('button', { name: 'TSLA, view details' }))

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('TSLA')
  })
})
