import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { renderWithClient } from '../support/render'
import { problem, sampleSummary, server } from '../support/server'
import { MarketIndexes } from '../../src/components/MarketIndexes'

function cardFor(name: string) {
  return screen.getByRole('button', { name: `${name}, view details` }).closest('article')!
}

describe('MarketIndexes', () => {
  it('shows the S&P 500, Nasdaq and Dow by name, in that order, without fetching a list', () => {
    renderWithClient(<MarketIndexes onSelect={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Market indexes' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'S&P 500, view details',
      'Nasdaq Composite, view details',
      'Dow Jones, view details',
    ])
  })

  it('shows each index’s Yahoo symbol under its name', () => {
    renderWithClient(<MarketIndexes onSelect={vi.fn()} />)

    expect(within(cardFor('S&P 500')).getByText('^GSPC')).toBeInTheDocument()
    expect(within(cardFor('Nasdaq Composite')).getByText('^IXIC')).toBeInTheDocument()
    expect(within(cardFor('Dow Jones')).getByText('^DJI')).toBeInTheDocument()
  })

  it('requests each index’s daily summary by its symbol', async () => {
    const requested: string[] = []
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', ({ params }) => {
        requested.push(String(params.symbol))
        return HttpResponse.json(sampleSummary())
      }),
    )
    renderWithClient(<MarketIndexes onSelect={vi.fn()} />)

    await screen.findAllByText('253.64')
    expect(requested.toSorted()).toEqual(['^DJI', '^GSPC', '^IXIC'])
  })

  it('quotes the day average in points, without a currency sign', async () => {
    renderWithClient(<MarketIndexes onSelect={vi.fn()} />)

    const card = cardFor('Dow Jones')
    expect(await within(card).findByText('253.64')).toBeInTheDocument()
    expect(within(card).queryByText('$253.64')).not.toBeInTheDocument()
    expect(within(card).getByRole('img')).toHaveAccessibleName(
      'Dow Jones daily average over the last month, +4.32%',
    )
  })

  it('keeps the other indexes when one fails', async () => {
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', ({ params }) =>
        params.symbol === '^IXIC'
          ? problem(502, 'Bad gateway', 'Yahoo Finance returned an error.')
          : HttpResponse.json(sampleSummary()),
      ),
    )
    renderWithClient(<MarketIndexes onSelect={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(cardFor('Nasdaq Composite')).toContainElement(alert)
    expect(await within(cardFor('S&P 500')).findByText('253.64')).toBeInTheDocument()
  })

  it('selects the index’s symbol when its card is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderWithClient(<MarketIndexes onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'S&P 500, view details' }))

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('^GSPC')
  })
})
