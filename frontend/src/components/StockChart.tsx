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
} from 'recharts'
import type { DailySummary } from '../api/types'
import {
  formatLongDate,
  formatPrecisePrice,
  formatPrice,
  formatShortDate,
  formatVolume,
  formatVolumeCompact,
} from '../utils/format'

const SYNC_ID = 'stock-detail'
const Y_AXIS_WIDTH = 72

interface ChartTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
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
          <dd>{formatPrecisePrice(row.highAverage)}</dd>
        </div>
        <div>
          <dt>
            <span className="swatch swatch--low" aria-hidden="true" />
            Low avg
          </dt>
          <dd>{formatPrecisePrice(row.lowAverage)}</dd>
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

/**
 * Price and volume use different scales, so they are two stacked charts sharing an x-axis
 * (synced hover) rather than one chart with two y-axes.
 */
export function StockChart({ symbol, data }: { symbol: string; data: DailySummary[] }) {
  return (
    <figure className="stock-chart">
      <figcaption className="stock-chart__legend">
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
        <span className="visually-hidden">
          Chart of {symbol} daily high and low averages and volume. The same figures are in the table below.
        </span>
      </figcaption>

      <div className="stock-chart__price" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId={SYNC_ID} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" hide />
            <YAxis
              width={Y_AXIS_WIDTH}
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => formatPrice(value)}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={ChartTooltip}
              cursor={{ className: 'chart-cursor' }}
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

      <div className="stock-chart__volume" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} syncId={SYNC_ID} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickFormatter={formatShortDate} tickLine={false} minTickGap={24} />
            <YAxis
              width={Y_AXIS_WIDTH}
              tickFormatter={formatVolumeCompact}
              tickLine={false}
              axisLine={false}
              tickCount={3}
            />
            {/* Synced hover: the volume chart draws only its cursor; the price chart shows the one tooltip. */}
            <Tooltip content={() => null} cursor={{ className: 'chart-cursor' }} />
            <Bar
              dataKey="volume"
              fill="var(--series-volume)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
