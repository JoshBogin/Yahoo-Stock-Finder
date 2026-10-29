import { MarketIndexes } from './components/MarketIndexes'
import { SearchBox } from './components/SearchBox'
import { StockDetail } from './components/StockDetail'
import { TrendingStocks } from './components/TrendingStocks'
import { useSelectedSymbol } from './hooks/useSelectedSymbol'

function App() {
  const [symbol, setSymbol] = useSelectedSymbol()

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <h1>StockFinder</h1>
          <p>One month of stock trends</p>
        </div>
        <SearchBox onSearch={setSymbol} />
      </header>

      <main className="app-main">
        {symbol && <StockDetail key={symbol} symbol={symbol} onClose={() => setSymbol(null)} />}
        <MarketIndexes onSelect={setSymbol} />
        <TrendingStocks onSelect={setSymbol} />
      </main>
    </div>
  )
}

export default App
