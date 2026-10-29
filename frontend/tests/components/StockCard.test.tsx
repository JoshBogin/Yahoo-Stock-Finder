import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw/http'
import { describe, expect, it, vi } from 'vitest'
import { StockCard } from '../../src/components/StockCard'
import { CHART_WIDTH, hoverChart } from '../support/charts'
import { renderWithClient } from '../support/render'
import { problem, sampleSummary, server } from '../support/server'

vi.mock('recharts', async (load) => (await import('../support/charts')).withFixedSizeCharts(await load()))

async function renderCard(onSelect = vi.fn()) {
  renderWithClient(<StockCard symbol="AAPL" onSelect={onSelect} />)
  // Latest day: (250.1234 + 257.1519) / 2 = 253.63765
  await screen.findByText('$253.64')
  const card = screen.getByRole('article')
  const sparkline = card.querySelector('.stock-card__spark .recharts-wrapper')
  if (!sparkline) throw new Error('sparkline did not render')
  return { card, sparkline, onSelect }
}

describe('StockCard', () => {
  it('shows the latest day’s average and date', async () => {
    const { card } = await renderCard()

    expect(within(card).getByText('Sep 30')).toHaveAttribute('datetime', '2026-09-30')
  })

  it('draws the day-average sparkline', async () => {
    const { card } = await renderCard()

    expect(card.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
  })

  it('updates the amount and date to the hovered day, and restores the latest day on leave', async () => {
    const { card, sparkline } = await renderCard()

    // Near the left edge: the first day, (241.3718 + 244.9062) / 2 = 243.139
    hoverChart(sparkline, 6)
    expect(await within(card).findByText('$243.14')).toBeInTheDocument()
    expect(within(card).getByText('Sep 28')).toHaveAttribute('datetime', '2026-09-28')

    // The middle: the second day, (243.0051 + 246.5) / 2 = 244.75255
    hoverChart(sparkline, CHART_WIDTH / 2)
    expect(await within(card).findByText('$244.75')).toBeInTheDocument()
    expect(within(card).getByText('Sep 29')).toBeInTheDocument()

    fireEvent.mouseLeave(sparkline)
    expect(await within(card).findByText('$253.64')).toBeInTheDocument()
    expect(within(card).getByText('Sep 30')).toBeInTheDocument()
  })

  it('keeps the 1-month change fixed while hovering', async () => {
    const { card, sparkline } = await renderCard()

    hoverChart(sparkline, 6)

    expect(await within(card).findByText('Sep 28')).toBeInTheDocument()
    expect(within(card).getByText('+4.32%')).toBeInTheDocument()
  })

  it('opens the detail from the sparkline as well as the symbol button', async () => {
    const user = userEvent.setup()
    const { card, onSelect } = await renderCard()

    await user.click(card.querySelector('.stock-card__spark')!)
    await user.click(within(card).getByRole('button', { name: 'AAPL, view details' }))

    expect(onSelect.mock.calls).toEqual([['AAPL'], ['AAPL']])
  })

  it('shows a no-data message for an empty month', async () => {
    server.use(http.get('*/api/stocks/:symbol/daily-summary', () => HttpResponse.json([])))
    renderWithClient(<StockCard symbol="AAPL" onSelect={vi.fn()} />)

    expect(await screen.findByText('No trading data this month.')).toBeInTheDocument()
  })

  it('shows a compact error with Retry for a temporary failure, and recovers', async () => {
    let fail = true
    server.use(
      http.get('*/api/stocks/:symbol/daily-summary', () =>
        fail ? problem(502, 'Bad gateway', 'Upstream failed.') : HttpResponse.json(sampleSummary()),
      ),
    )
    const user = userEvent.setup()
    renderWithClient(<StockCard symbol="AAPL" onSelect={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Upstream failed.')
    expect(alert).toHaveAttribute('data-compact', 'true')

    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText('$253.64')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
