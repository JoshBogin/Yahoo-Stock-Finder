import { usePopularStocks } from '../hooks/usePopularStocks'
import { StockCard } from './StockCard'

interface DashboardProps {
  onSelect: (symbol: string) => void
}

export function Dashboard({ onSelect }: DashboardProps) {
  const { symbols, isRanking } = usePopularStocks()

  return (
    <section className="dashboard" aria-labelledby="dashboard-heading">
      <div className="section-heading">
        <h2 id="dashboard-heading">Popular stocks</h2>
        <p className="section-heading__note">Most traded by average daily volume, last month</p>
      </div>
      {/* Keyed by position while ranking so the placeholder cards don't remount once the order settles. */}
      <ul className="dashboard__grid" aria-busy={isRanking || undefined}>
        {symbols.map((symbol, index) => (
          <li key={isRanking ? index : symbol}>
            <StockCard symbol={symbol} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  )
}
