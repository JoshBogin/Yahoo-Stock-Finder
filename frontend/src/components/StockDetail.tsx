import { useEffect, useRef } from 'react'
import { useDailySummary } from '../hooks/useDailySummary'
import { formatPrice, periodChange } from '../utils/format'
import { ChangeBadge } from './ChangeBadge'
import { DailyTable } from './DailyTable'
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

  // The panel is keyed by symbol, so this runs once per new symbol: move focus to the result
  // so keyboard and screen reader users land on it.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section className="stock-detail" aria-labelledby="detail-heading" aria-busy={isPending || undefined}>
      <header className="stock-detail__header">
        <div>
          <h2 id="detail-heading" ref={headingRef} tabIndex={-1}>
            {symbol}
          </h2>
          <p className="section-heading__note">Daily summary of 15-minute trading, last month</p>
        </div>
        {latest && (
          <dl className="stock-detail__stats">
            <div>
              <dt>Latest high avg</dt>
              <dd>{formatPrice(latest.highAverage)}</dd>
            </div>
            <div>
              <dt>Latest low avg</dt>
              <dd>{formatPrice(latest.lowAverage)}</dd>
            </div>
            <div>
              <dt>1 mo change</dt>
              <dd>
                <ChangeBadge change={change} />
              </dd>
            </div>
          </dl>
        )}
        <button type="button" className="button button--ghost stock-detail__close" onClick={onClose}>
          Close<span className="visually-hidden"> {symbol} details</span>
        </button>
      </header>

      {isPending && (
        <>
          <output className="visually-hidden">Loading {symbol}</output>
          <Skeleton className="skeleton--chart" />
          <Skeleton className="skeleton--table" />
        </>
      )}

      {isError && <ErrorBanner error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <p className="empty-state">No trading days were found for {symbol} in the last month.</p>
      )}

      {data && data.length > 0 && (
        <div className="stock-detail__body">
          <StockChart symbol={symbol} data={data} />
          <DailyTable symbol={symbol} data={data} />
        </div>
      )}
    </section>
  )
}
