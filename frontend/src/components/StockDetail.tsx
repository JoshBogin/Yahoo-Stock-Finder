import { useEffect, useRef } from 'react'
import { indexName } from '../api/marketIndexes'
import { useDailySummary } from '../hooks/useDailySummary'
import { periodChange, valueFormatter } from '../utils/format'
import { ChangeBadge } from './ChangeBadge'
import { ErrorBanner } from './ErrorBanner'
import { Skeleton } from './Skeleton'
import { StockChart } from './StockChart'

interface StockDetailProps {
  symbol: string
  onClose: () => void
}

export function StockDetail({ symbol, onClose }: StockDetailProps) {
  const { data, error, isPending, isError, refetch } = useDailySummary(symbol)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const latest = data?.at(-1)
  const change = data ? periodChange(data) : null
  const name = indexName(symbol)
  const label = name ?? symbol
  const formatValue = valueFormatter(symbol)

  // The panel is keyed by symbol, so this runs once per new symbol: move focus to the result
  // so keyboard and screen reader users land on it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="stock-detail" aria-labelledby="detail-heading" aria-busy={isPending || undefined}>
      <header className="stock-detail__header">
        <div>
          <h2
            id="detail-heading"
            className={name ? 'stock-detail__name' : undefined}
            ref={headingRef}
            tabIndex={-1}
          >
            {label}
            {name && <span className="stock-detail__ticker">{symbol}</span>}
          </h2>
          <p className="section-heading__note">Daily summary of trading over the last month</p>
        </div>
        {latest && (
          <dl className="stock-detail__stats">
            <div>
              <dt>Latest high avg</dt>
              <dd>{formatValue(latest.highAverage)}</dd>
            </div>
            <div>
              <dt>Latest low avg</dt>
              <dd>{formatValue(latest.lowAverage)}</dd>
            </div>
            <div>
              <dt>1 mo change</dt>
              <dd>
                <ChangeBadge change={change} />
              </dd>
            </div>
          </dl>
        )}
        <button
          type="button"
          className="button button--ghost stock-detail__close"
          onClick={onClose}
          aria-label={`Close ${label} details`}
        />
      </header>

      {isPending && (
        <>
          <output className="visually-hidden">Loading {label}</output>
          <Skeleton className="skeleton--chart" />
        </>
      )}

      {isError && <ErrorBanner error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <p className="empty-state">No trading days were found for {label} in the last month.</p>
      )}

      {data && data.length > 0 && <StockChart symbol={symbol} name={label} data={data} />}
    </section>
  )
}
