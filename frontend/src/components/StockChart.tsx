import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from 'recharts'
import type { DailySummary } from '../api/types'
import {
  formatLongDate,
  formatShortDate,
  formatVolume,
  formatVolumeCompact,
  valueFormatter,
} from '../utils/format'

const SYNC_ID = 'stock-detail'
/** Narrowest y-axis; it widens to fit long labels such as "$825,000.00". */
const MIN_Y_AXIS_WIDTH = 48
// Recharts ends y-axis labels tickSize (6) + tickMargin (2) before the plot, even with tickLine off.
const Y_LABEL_GAP = 8
const MAX_BAR_SIZE = 36
const CHART_MARGIN = { top: 8, right: 16, bottom: 0, left: 0 }
// Recharts' default barCategoryGap of 10% on each side leaves bars 80% of the spacing between days.
const BAR_FILL = 0.8
const BAR_CLEARANCE = 4

/**
 * How far the price chart's plot area is inset from the volume chart's on each side. The volume chart
 * pads its point scale by the same amount, so every day sits at the same x in both charts.
 * 
 * The lines run to the price chart's edges while the end bars stay whole. The inset is half an end bar plus a
 * little clearance, and bar width depends on the chart width, so it is solved from that:
 * inset = bar / 2 + clearance, where bar = min(MAX_BAR_SIZE, BAR_FILL * (plotWidth - 2 * inset) / (days - 1)).
 */
export function chartInset(chartWidth: number, days: number, yAxisWidth: number): number {
  const widest = MAX_BAR_SIZE / 2 + BAR_CLEARANCE
  const plotWidth = chartWidth - yAxisWidth - CHART_MARGIN.left - CHART_MARGIN.right
  if (days < 2 || plotWidth <= 0) return widest
  const k = BAR_FILL / 2 / (days - 1)
  return Math.min(widest, (k * plotWidth + BAR_CLEARANCE) / (1 + 2 * k))
}

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  formatValue: (value: number) => string
}

function ChartTooltip({ active, payload, formatValue }: ChartTooltipProps) {
  const row = payload?.[0]?.payload as DailySummary | undefined
  if (!active || !row) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__day">{formatLongDate(row.day)}</p>
      <dl>
        <div>
          <dt>
            <span className="swatch swatch--high" aria-hidden="true" />
            High avg
          </dt>
          <dd>{formatValue(row.highAverage)}</dd>
        </div>
        <div>
          <dt>
            <span className="swatch swatch--low" aria-hidden="true" />
            Low avg
          </dt>
          <dd>{formatValue(row.lowAverage)}</dd>
        </div>
        <div>
          <dt>
            <span className="swatch swatch--volume" aria-hidden="true" />
            Volume
          </dt>
          <dd>{formatVolume(row.volume)}</dd>
        </div>
      </dl>
    </div>
  )
}

interface DayCursorProps {
  days: number
  /** Padding between the plot edges and the first/last day. */
  inset: number
  /** A day-wide box (volume chart) or a vertical line (price chart). */
  variant: 'box' | 'line'
  // Injected by Recharts' Tooltip.
  payloadIndex?: number | string | null
}

/**
 * Hover cursor positioned from the hovered day's index in this chart's own geometry. Recharts hands a
 * synced chart the other chart's pointer x scaled across the plot width, which drifts here because the
 * two plot areas differ in width. A point scale also has no band width, so Recharts' own box would be
 * 0px wide; this one spans the gap between days, centred on the hovered day and inside the plot area.
 */
function DayCursor({ days, inset, variant, payloadIndex }: DayCursorProps) {
  const plot = usePlotArea()
  const index = Number(payloadIndex)
  if (!plot || payloadIndex == null || !Number.isInteger(index) || days < 2) return null
  const spacing = (plot.width - 2 * inset) / (days - 1)
  const x = plot.x + inset + index * spacing
  if (variant === 'line') {
    return <line className="chart-cursor" x1={x} x2={x} y1={plot.y} y2={plot.y + plot.height} />
  }
  // Shrink evenly near the plot edges so the box stays centred on its bar (the inset always fits a bar).
  const half = Math.min(spacing / 2, x - plot.x, plot.x + plot.width - x)
  return <rect className="chart-cursor" x={x - half} y={plot.y} width={half * 2} height={plot.height} />
}

const Y_LABELS = '.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value'

/**
 * Measures the y-axis labels Recharts drew, whenever it redraws either chart:
 * - `axisWidth`: room for the widest label in either chart, so long prices aren't cut off. Both charts
 *   share it, which keeps their plot areas (and so the bars and points) lined up.
 * - `labelStart`: where the price labels start, in px from the figure's left edge, so the legend can
 *   line up with them. The labels are right-aligned, so this depends on the widest one.
 */
function useYAxisLabels(
  figureRef: RefObject<HTMLElement | null>,
  priceRef: RefObject<HTMLElement | null>,
  volumeRef: RefObject<HTMLElement | null>,
) {
  const [axisWidth, setAxisWidth] = useState(MIN_Y_AXIS_WIDTH)
  const [labelStart, setLabelStart] = useState(0)
  useLayoutEffect(() => {
    const figure = figureRef.current
    const price = priceRef.current
    const volume = volumeRef.current
    if (!figure || !price || !volume) return
    const measure = () => {
      const priceLabels = Array.from(price.querySelectorAll(Y_LABELS), (label) =>
        label.getBoundingClientRect(),
      )
      const volumeLabels = Array.from(volume.querySelectorAll(Y_LABELS), (label) =>
        label.getBoundingClientRect(),
      )
      const widest = Math.max(0, ...[...priceLabels, ...volumeLabels].map((label) => label.width))
      // Setting the same value again doesn't re-render, so the observer settles after one resize.
      setAxisWidth(Math.max(MIN_Y_AXIS_WIDTH, Math.ceil(widest) + Y_LABEL_GAP))
      if (priceLabels.length > 0) {
        const left = Math.min(...priceLabels.map((label) => label.left))
        setLabelStart(Math.max(0, Math.round(left - figure.getBoundingClientRect().left)))
      }
    }
    measure()
    const observer = new MutationObserver(measure)
    for (const chart of [price, volume])
      observer.observe(chart, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [figureRef, priceRef, volumeRef])
  return { axisWidth, labelStart }
}

interface StockChartProps {
  symbol: string
  /** What to call the stock in the chart's description: an index's display name, or the symbol. */
  name?: string
  data: DailySummary[]
}

/**
 * Price and volume use different scales, so they are two stacked charts sharing an x-axis
 * (synced hover) rather than one chart with two y-axes.
 */
export function StockChart({ symbol, name = symbol, data }: StockChartProps) {
  const formatValue = valueFormatter(symbol)
  const [chartWidth, setChartWidth] = useState(0)
  const figureRef = useRef<HTMLElement>(null)
  const priceRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)
  const { axisWidth, labelStart } = useYAxisLabels(figureRef, priceRef, volumeRef)
  const inset = chartInset(chartWidth, data.length, axisWidth)

  return (
    <figure className="stock-chart" ref={figureRef}>
      <figcaption className="stock-chart__legend" style={{ paddingInlineStart: labelStart }}>
        <span>
          <span className="swatch swatch--high" aria-hidden="true" />
          High average
        </span>
        <span>
          <span className="swatch swatch--low" aria-hidden="true" />
          Low average
        </span>
        <span>
          <span className="swatch swatch--volume" aria-hidden="true" />
          Daily volume
        </span>
        <span className="visually-hidden">Chart of {name} daily high and low averages and volume.</span>
      </figcaption>

      {/* The charts are decorative for assistive tech (aria-hidden), so Recharts' keyboard layer is off:
          it would make each chart focusable, and a click would leave a focus ring on it. */}
      <div className="stock-chart__price" aria-hidden="true" ref={priceRef}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            syncId={SYNC_ID}
            accessibilityLayer={false}
            margin={{ ...CHART_MARGIN, left: CHART_MARGIN.left + inset, right: CHART_MARGIN.right + inset }}
          >
            <CartesianGrid vertical={false} />
            {/* Point scale with no padding: the first and last days sit on this chart's edges, which are
                inset from the volume chart's so its end bars fit whole beneath them. */}
            <XAxis dataKey="day" hide scale="point" />
            <YAxis
              width={axisWidth}
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => formatValue(value)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<ChartTooltip formatValue={formatValue} />}
              cursor={<DayCursor days={data.length} inset={0} variant="line" />}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="highAverage"
              stroke="var(--series-high)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="lowAverage"
              stroke="var(--series-low)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="stock-chart__volume" aria-hidden="true" ref={volumeRef}>
        <ResponsiveContainer width="100%" height="100%" onResize={(width) => setChartWidth(width)}>
          <BarChart data={data} syncId={SYNC_ID} accessibilityLayer={false} margin={CHART_MARGIN}>
            <CartesianGrid vertical={false} />
            {/* Padded by the price chart's inset, so each bar is centred under its point (synced hover lines up). */}
            <XAxis
              dataKey="day"
              scale="point"
              padding={{ left: inset, right: inset }}
              tickFormatter={formatShortDate}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              width={axisWidth}
              tickFormatter={formatVolumeCompact}
              tickLine={false}
              axisLine={false}
              tickCount={3}
            />
            {/* Synced hover: the volume chart draws only its cursor; the price chart shows the one tooltip. */}
            <Tooltip
              content={() => null}
              cursor={<DayCursor days={data.length} inset={inset} variant="box" />}
            />
            <Bar
              dataKey="volume"
              fill="var(--series-volume)"
              radius={[4, 4, 0, 0]}
              maxBarSize={MAX_BAR_SIZE}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
