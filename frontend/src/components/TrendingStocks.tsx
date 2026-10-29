import { usePopularStocks } from '../hooks/usePopularStocks'
import { ErrorBanner } from './ErrorBanner'
import { Skeleton } from './Skeleton'
import { StockCard } from './StockCard'

/** How many placeholder cards to show while the symbol list loads. */
const PLACEHOLDER_COUNT = 8

interface TrendingStocksProps {
  onSelect: (symbol: string) => void
}

export function TrendingStocks({ onSelect }: TrendingStocksProps) {
  const { data: symbols, error, isPending, isError, refetch } = usePopularStocks()

  return (
    <section className="stock-section" aria-labelledby="trending-heading">
      <div className="section-heading">
        <h2 id="trending-heading">Trending stocks</h2>
        <p className="section-heading__note">Daily averages for the top stocks by trade volume</p>
      </div>

      {isError && <ErrorBanner error={error} onRetry={() => void refetch()} />}

      {isPending && (
        <>
          <output className="visually-hidden">Loading popular stocks</output>
          <ul className="stock-section__grid" aria-busy="true">
            {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
              <li key={index}>
                <article className="stock-card">
                  <Skeleton className="skeleton--text" />
                  <Skeleton className="skeleton--text" />
                  <Skeleton className="skeleton--spark" />
                </article>
              </li>
            ))}
          </ul>
        </>
      )}

      {symbols?.length === 0 && <p className="stock-card__empty">No popular stocks are available.</p>}

      {symbols && symbols.length > 0 && (
        <ul className="stock-section__grid">
          {symbols.map((symbol) => (
            <li key={symbol}>
              <StockCard symbol={symbol} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
