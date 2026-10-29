import { useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { indexName } from '../api/marketIndexes'
import { useDailySummary } from '../hooks/useDailySummary'
import {
  dayAverage,
  formatLongDate,
  formatPercent,
  formatShortDate,
  periodChange,
  valueFormatter,
} from '../utils/format'
import { ChangeBadge } from './ChangeBadge'
import { ErrorBanner } from './ErrorBanner'
import { Skeleton } from './Skeleton'

interface StockCardProps {
  symbol: string
  onSelect: (symbol: string) => void
}

export function StockCard({ symbol, onSelect }: StockCardProps) {
  const { data, error, isPending, isError, refetch } = useDailySummary(symbol)
  // The sparkline day under the pointer; the card shows the latest day otherwise.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const shown = (hoverIndex === null ? undefined : data?.[hoverIndex]) ?? data?.at(-1)
  const change = data ? periodChange(data, dayAverage) : null
  const name = indexName(symbol)
  const label = name ?? symbol
  const formatValue = valueFormatter(symbol)

  return (
    <article className="stock-card" aria-busy={isPending || undefined}>
      <header className="stock-card__heading">
        <h3 className={name ? 'stock-card__name' : 'stock-card__symbol'}>
          {/* The button's ::after covers the whole card, so the card is one large click target. */}
          <button type="button" className="stock-card__select" onClick={() => onSelect(symbol)}>
            {label}
            <span className="visually-hidden">, view details</span>
          </button>
        </h3>
        {name && <p className="stock-card__ticker">{symbol}</p>}
      </header>

      {isPending && (
        <>
          <output className="visually-hidden">Loading {label}</output>
          <Skeleton className="skeleton--text" />
          <Skeleton className="skeleton--spark" />
        </>
      )}

      {isError && <ErrorBanner error={error} onRetry={() => void refetch()} compact />}

      {data && data.length === 0 && <p className="stock-card__empty">No trading data this month.</p>}

      {data && shown && (
        <>
          <dl className="stock-card__stats">
            <div>
              <dt>Day avg</dt>
              <dd className="stock-card__price">{formatValue(dayAverage(shown))}</dd>
              <dd className="stock-card__date">
                <time dateTime={shown.day} title={formatLongDate(shown.day)}>
                  {formatShortDate(shown.day)}
                </time>
              </dd>
            </div>
            <div>
              <dt>1 mo</dt>
              <dd>
                <ChangeBadge change={change} />
              </dd>
            </div>
          </dl>
          {/* Mouse-only extra: the card's button already opens the detail for keyboard users. */}
          {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div className="stock-card__spark" onClick={() => onSelect(symbol)}>
            <div
              className="stock-card__spark-chart"
              // The image is an SVG chart, so it can't be an <img>.
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
              role="img"
              aria-label={`${label} daily average over the last month${change === null ? '' : `, ${formatPercent(change)}`}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  // Keyboard users open the detail with the card's button; a focusable chart only adds a focus ring on click.
                  accessibilityLayer={false}
                  margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  onMouseMove={({ activeTooltipIndex }) =>
                    setHoverIndex(activeTooltipIndex == null ? null : Number(activeTooltipIndex))
                  }
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  {/* No tooltip box: the hovered day's figures replace the card's own. */}
                  <Tooltip
                    content={() => null}
                    cursor={{ className: 'chart-cursor' }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={dayAverage}
                    stroke="var(--series-high)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'var(--surface)' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </article>
  )
}
