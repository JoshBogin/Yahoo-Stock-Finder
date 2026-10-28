import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { useDailySummary } from '../hooks/useDailySummary'
import { formatPercent, formatPrice, periodChange } from '../utils/format'
import { ChangeBadge } from './ChangeBadge'
import { ErrorBanner } from './ErrorBanner'
import { Skeleton } from './Skeleton'

interface StockCardProps {
  symbol: string
  onSelect: (symbol: string) => void
}

export function StockCard({ symbol, onSelect }: StockCardProps) {
  const { data, error, isPending, isError, refetch } = useDailySummary(symbol)
  const latest = data?.at(-1)
  const change = data ? periodChange(data) : null

  return (
    <article className="stock-card" aria-busy={isPending || undefined}>
      <h3 className="stock-card__symbol">
        {/* The button's ::after covers the whole card, so the card is one large click target. */}
        <button type="button" className="stock-card__select" onClick={() => onSelect(symbol)}>
          {symbol}
          <span className="visually-hidden">, view details</span>
        </button>
      </h3>

      {isPending && (
        <>
          <output className="visually-hidden">Loading {symbol}</output>
          <Skeleton className="skeleton--text" />
          <Skeleton className="skeleton--spark" />
        </>
      )}

      {isError && <ErrorBanner error={error} onRetry={() => void refetch()} compact />}

      {data && data.length === 0 && <p className="stock-card__empty">No trading data this month.</p>}

      {latest && (
        <>
          <dl className="stock-card__stats">
            <div>
              <dt>High avg</dt>
              <dd className="stock-card__price">{formatPrice(latest.highAverage)}</dd>
            </div>
            <div>
              <dt>1 mo</dt>
              <dd>
                <ChangeBadge change={change} />
              </dd>
            </div>
          </dl>
          <div
            className="stock-card__spark"
            // The image is an SVG chart, so it can't be an <img>.
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
            role="img"
            aria-label={`${symbol} daily high average over the last month${change === null ? '' : `, ${formatPercent(change)}`}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line
                  type="monotone"
                  dataKey="highAverage"
                  stroke="var(--series-high)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </article>
  )
}
