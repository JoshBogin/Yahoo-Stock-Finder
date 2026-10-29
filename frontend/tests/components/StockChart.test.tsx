import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { chartInset, StockChart } from '../../src/components/StockChart'
import { CHART_WIDTH, hoverChart } from '../support/charts'
import { sampleSummary } from '../support/server'

vi.mock('recharts', async (load) => (await import('../support/charts')).withFixedSizeCharts(await load()))

// Must match StockChart's constants: right margin 16px, bars cap at 36px and fill 80% of a gap.
const Y_AXIS = 48
const plotWidth = (chartWidth: number, yAxisWidth = Y_AXIS) => chartWidth - yAxisWidth - 16
const barWidth = (chartWidth: number, days: number, inset: number) =>
  Math.min(36, (0.8 * (plotWidth(chartWidth) - 2 * inset)) / (days - 1))

describe('chartInset', () => {
  it('leaves room for half the widest bar plus clearance on wide charts', () => {
    expect(chartInset(1400, 21, Y_AXIS)).toBe(22)
  })

  it('shrinks with the bars on narrow charts, always clearing half an end bar by 4px', () => {
    for (const width of [360, 500, 723, 900]) {
      const inset = chartInset(width, 21, Y_AXIS)
      expect(inset).toBeLessThanOrEqual(22)
      expect(inset).toBeCloseTo(barWidth(width, 21, inset) / 2 + 4, 6)
    }
  })

  it('accounts for a wider y-axis taking room from the plot', () => {
    const width = 500
    const inset = chartInset(width, 21, 100)
    expect(inset).toBeLessThan(chartInset(width, 21, Y_AXIS))
    expect(inset).toBeCloseTo(Math.min(36, (0.8 * (plotWidth(width, 100) - 2 * inset)) / 20) / 2 + 4, 6)
  })

  it('falls back to the widest inset before the chart is measured or with a single day', () => {
    expect(chartInset(0, 21, Y_AXIS)).toBe(22)
    expect(chartInset(800, 1, Y_AXIS)).toBe(22)
  })
})

function renderChart(symbol = 'AAPL', data = sampleSummary()) {
  const view = render(<StockChart symbol={symbol} data={data} />)
  const [price, volume] = Array.from(view.container.querySelectorAll('.recharts-wrapper'))
  if (!price || !volume) throw new Error('charts did not render')
  return { ...view, price, volume }
}

const plotLeft = (chart: Element) => Number(chart.querySelector('clipPath rect')?.getAttribute('x'))

const centre = (el: Element | null) => {
  if (!el) throw new Error('missing element')
  return Number(el.getAttribute('x')) + Number(el.getAttribute('width')) / 2
}

describe('StockChart', () => {
  it('draws the high and low lines and one volume bar per day', () => {
    const { price, volume } = renderChart()

    expect(price.querySelectorAll('.recharts-line-curve')).toHaveLength(2)
    expect(volume.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(3)
  })

  it('shows the hovered day’s figures in the tooltip', async () => {
    const { price } = renderChart()

    hoverChart(price, 216)

    expect(await screen.findByText('Tue, Sep 29, 2026')).toBeInTheDocument()
    expect(screen.getByText('$246.50')).toBeInTheDocument()
    expect(screen.getByText('$243.01')).toBeInTheDocument()
    expect(screen.getByText('48,120,977')).toBeInTheDocument()
  })

  it('shows an index in points, without a currency sign, on the axis and in the tooltip', async () => {
    const { price } = renderChart('^GSPC')

    hoverChart(price, 216)

    expect(await screen.findByText('246.50')).toBeInTheDocument()
    expect(screen.getByText('243.01')).toBeInTheDocument()
    const labels = Array.from(
      price.querySelectorAll('.recharts-yAxis-tick-labels text'),
      (t) => t.textContent,
    )
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((label) => !label?.includes('$'))).toBe(true)
  })

  it.each([
    ['price', 0],
    ['price', 1],
    ['price', 2],
    ['volume', 0],
    ['volume', 2],
  ] as const)(
    'lines up both cursors on the same bar when hovering the %s chart (day %i)',
    async (chart, day) => {
      const { price, volume } = renderChart()
      const bars = Array.from(volume.querySelectorAll('.recharts-bar-rectangle path'))
      // Recharts rounds bar geometry, so positions are compared to within half a pixel.
      const barCentre = centre(bars[day] ?? null)

      hoverChart(chart === 'price' ? price : volume, barCentre)

      const line = await waitFor(() => {
        const found = price.querySelector('line.chart-cursor')
        if (!found) throw new Error('no cursor yet')
        return found
      })
      expect(Number(line.getAttribute('x1'))).toBeCloseTo(barCentre, 0)
      expect(centre(volume.querySelector('rect.chart-cursor'))).toBeCloseTo(barCentre, 0)
    },
  )

  it('insets the price chart from the volume chart by the inset for its measured width', async () => {
    const month = Array.from({ length: 21 }, (_, day) => ({
      day: `2026-09-${String(day + 1).padStart(2, '0')}`,
      lowAverage: 100 + day,
      highAverage: 102 + day,
      volume: 1_000_000,
    }))
    const { price, volume } = renderChart('AAPL', month)
    // A month of days on a 400px chart needs less than the widest inset, so this only holds once measured.
    const expected = chartInset(CHART_WIDTH, month.length, Y_AXIS)
    expect(expected).toBeLessThan(chartInset(0, month.length, Y_AXIS))

    await waitFor(() => expect(plotLeft(price) - plotLeft(volume)).toBeCloseTo(expected, 1))
  })

  it('widens both y-axes to fit long labels and lines the legend up with the price labels', async () => {
    const original = SVGElement.prototype.getBoundingClientRect
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: SVGElement) {
      if (!this.classList.contains('recharts-cartesian-axis-tick-value')) return original.call(this)
      return {
        left: 30,
        top: 0,
        x: 30,
        y: 0,
        width: 90,
        height: 12,
        right: 120,
        bottom: 12,
        toJSON: () => ({}),
      }
    })

    const { container, volume } = renderChart()

    // 90px label + Recharts' 8px gap before the plot.
    await waitFor(() => expect(volume.querySelector('clipPath rect')?.getAttribute('x')).toBe('98'))
    expect(container.querySelector('figcaption')).toHaveStyle({ paddingInlineStart: '30px' })
  })
})
