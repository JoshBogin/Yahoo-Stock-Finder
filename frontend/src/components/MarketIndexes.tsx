import { MARKET_INDEXES } from '../api/marketIndexes'
import { StockCard } from './StockCard'

interface MarketIndexesProps {
  onSelect: (symbol: string) => void
}

export function MarketIndexes({ onSelect }: MarketIndexesProps) {
  return (
    <section className="stock-section" aria-labelledby="indexes-heading">
      <div className="section-heading">
        <h2 id="indexes-heading">Market indexes</h2>
        <p className="section-heading__note">Daily averages for the major US indexes</p>
      </div>

      <ul className="stock-section__grid">
        {MARKET_INDEXES.map(({ symbol }) => (
          <li key={symbol}>
            <StockCard symbol={symbol} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </section>
  )
}
